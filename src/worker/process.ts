import { TelegramMessage } from '../lib/telegram';
import { mapTelegramMessageToEntryData, createEntry } from '../lib/db/entries';
import { logger } from '../lib/logger';

export async function writeEntry(message: TelegramMessage): Promise<String> {

    let entry;
    let id;

    try {
        entry = mapTelegramMessageToEntryData(message);
    } catch (error) {
        logger.error('Failed to create full entry data object:', error);
        throw error;
    }

    try {
        id = createEntry(entry);
    } catch (error) {
        logger.error('Failed to write entry and associated nodes to neo4j db:', error);
        throw error;
    }

    return id;
}
