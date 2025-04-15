import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Access environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Function to send a reply to Telegram
export async function sendTelegramReply(chatId: number, message: string) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
        chat_id: chatId,
        text: message,
    });
}
