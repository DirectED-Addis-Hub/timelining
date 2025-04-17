import { MessageHandler } from '../handlerInterface';
import { createEntry } from '../../lib/db/entries';

export const textHandler: MessageHandler = {
    canHandle(message) {
        return !!message?.text;
    },

    async handle(message) {
        if (!message?.text) return false;
        // await createEntry(message.message_id);
        return true;
    }
}
