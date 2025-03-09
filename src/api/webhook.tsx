import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import axios from 'axios';
import dotenv from 'dotenv';
import { createLogger, transports, format } from 'winston';

// Load environment variables from .env file
dotenv.config();

// Access environment variables
const REDIS_API_URL = process.env.KV_REST_API_URL;
const REDIS_API_TOKEN = process.env.KV_REST_API_TOKEN;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Initialize Redis using the environment variables
const redis = new Redis({
    url: REDIS_API_URL,
    token: REDIS_API_TOKEN,
});

// Logging setup
const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

// Function to send a reply to Telegram
async function sendTelegramReply(chatId: number, message: string) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
        chat_id: chatId,
        text: message,
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;

    // Extract message info
    const chatId = data.message?.chat?.id;
    const text = data.message?.text;

    if (!chatId || !text) {
        return res.json({ status: 'ignored' }); // Ignore non-message updates
    }

    try {
        // Store the message in Redis queue
        await redis.lpush('telegram_messages', JSON.stringify(data));
        // Send a Telegram reply
        await sendTelegramReply(chatId, 'Message received and queued!');
        return res.json({ status: 'ok' });
    } catch (error) {
        logger.error('Error processing webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}