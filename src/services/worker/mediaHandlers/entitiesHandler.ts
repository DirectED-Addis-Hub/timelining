import { MessageHandler } from '../handlerInterface';
import { createEntry } from '../../entryService';

export const entitiesHandler: MessageHandler = {
    canHandle(message) {
        return !!message?.entities;
    },

    async handle(message) {
        if (!message?.entities) return false;
        // await createEntry(message.message_id);
        return true;
    }
}
