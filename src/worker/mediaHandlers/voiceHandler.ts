import { MessageHandler } from '../handlerInterface';
import { createEntry } from '../../lib/db/entries';

export const voiceHandler: MessageHandler = {
    canHandle(message) {
        return !!message?.voice;
    },

    async handle(message) {
        if (!message?.voice) return false;
        // await createEntry(message.message_id);
        return true;
    }
}
