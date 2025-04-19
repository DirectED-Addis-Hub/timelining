import { MessageHandler } from '../handlerInterface';
import { createEntry } from '../../entryService';

export const photoHandler: MessageHandler = {
    canHandle(message) {
        return !!message?.photo;
    },

    async handle(message) {
        if (!message?.photo) return false;
        // await createEntry(message.message_id);
        return true;
    }
}
