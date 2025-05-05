import { TelegramMessage } from '../../lib/telegram';
import { mapTelegramMessageToEntryData, createEntry, logNodeCreation, readEntry } from '../entryService';
import { logger } from '../../lib/logger';
import { verifyExpectationsMet } from '../entryService';

export async function writeEntry(message: TelegramMessage): Promise<string> {

    let entryInput;
    let id;

    try {
        entryInput = mapTelegramMessageToEntryData(message);
    } catch (error) {
        logger.error('Failed to create full entry data object:', error);
        throw error;
    }

    const expected = logNodeCreation(entryInput);

    try {
        id = await createEntry(entryInput);

        const result = await readEntry(id);

        verifyExpectationsMet(expected, result)
    } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error("Entry write failed: " + error.message);
          throw error;
        } else {
          logger.error("Entry write failed with non-Error object:", error);
          throw new Error("Unknown error occurred during entry write.");
        }
      }

    return id;
}
