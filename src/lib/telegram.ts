// src/lib/telegram.ts
import axios from 'axios';
import dotenv from 'dotenv';
import { logger } from './logger'; // assuming you have a shared logger

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_TIMEOUT = 5000; // Set your desired timeout

export interface TelegramMessage {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat?: {
      id: number;
      first_name?: string;
      username?: string;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    date: number;
    text?: string;
    entities?: Array<{
      offset: number;
      length: number;
      type: 'mention' | 'hashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'code' | 'pre' | 'text_link' | 'text_mention';
    }>;
    caption?: string; // Caption for photos or other media
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      file_size: number;
      width: number;
      height: number;
    }>; // Array for photo objects
    voice?: {
      duration: number;
      mime_type: string;
      file_id: string;
      file_unique_id: string;
      file_size: number;
    }; // Voice message properties
  };
}

const telegramApi = axios.create({
  timeout: TELEGRAM_API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

export function parseMessage(message: string): TelegramMessage | null {
  try {
    return JSON.parse(message) as TelegramMessage;
  } catch (error) {
    logger.error('Failed to parse message:', { message, error });
    throw error;
  }
}


/**
 * Sends a message to a Telegram chat with timeout and error handling
 */
export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  try {
    await telegramApi.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      logger.warn('Telegram API timeout', { chatId });
      throw new Error('Telegram API timeout');
    }
    logger.error('Failed to send Telegram message', {
      chatId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Failed to send Telegram message');
  }
}
