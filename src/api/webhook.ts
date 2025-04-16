import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { sendTelegramMessage } from '../lib/telegram';

export default async function handler(req: VercelRequest, res: VercelResponse) {

    logger.info('Webhook triggered.');

    if (req.method !== 'POST') {
        logger.warn('Invalid method:', { method: req.method });
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;

    // Extract message info
    const chatId = data.message?.chat?.id;
    const text = data.message?.text;

    try {
        // Store the message in Redis queue
        await redis.lpush('telegram_messages', JSON.stringify(data));
        logger.info('Message queued:', { chatId, textLength: text.length });
        
        // Send a Telegram reply
        await sendTelegramMessage(chatId, `${JSON.stringify(data)}`);
        return res.json({ status: 'ok' });
    } catch (error) {
        logger.error('Webhook error:', { 
            chatId, 
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({ error: 'Internal server error' });
    }
}
