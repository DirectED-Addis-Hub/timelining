import { Redis } from '@upstash/redis';
import axios from 'axios';
import dotenv from 'dotenv';
import { createLogger, transports, format } from 'winston';

// Load environment variables from .env file
dotenv.config();

// Constants for optimization
const BATCH_SIZE = 10; // Process multiple messages per invocation
const EXECUTION_TIMEOUT = 8000; // 8 seconds (keeping safe margin for 10s limit)
const TELEGRAM_API_TIMEOUT = 3000; // 3 seconds timeout for Telegram API calls

// Queue thresholds for dynamic scheduling
const QUEUE_THRESHOLD = {
    HIGH: 50,   // Messages in queue to trigger high frequency
    MEDIUM: 20, // Messages in queue to trigger medium frequency
    LOW: 5      // Messages in queue to trigger low frequency
};

// Scheduling intervals (in minutes)
const SCHEDULE_INTERVALS = {
    HIGH: 5,    // 5 minutes
    MEDIUM: 10, // 10 minutes
    LOW: 35     // 15 minutes
} as const;

// Type definitions
interface TelegramMessage {
    message?: {
        chat?: {
            id: number;
        };
        text?: string;
    };
}

interface WorkerResult {
    status: string;
    message?: string;
    processed_count?: number;
    remaining_count?: number;
    recommended_interval?: number;
}

// Environment variable validation
const requiredEnvVars = {
    REDIS_API_URL: process.env.KV_REST_API_URL,
    REDIS_API_TOKEN: process.env.KV_REST_API_TOKEN,
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
} as const;

// Check for missing environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

// Initialize Redis client - reuse connection
const redis = new Redis({
    url: requiredEnvVars.REDIS_API_URL,
    token: requiredEnvVars.REDIS_API_TOKEN,
});

// Initialize axios instance with timeout
const telegramApi = axios.create({
    timeout: TELEGRAM_API_TIMEOUT,
    headers: { 'Content-Type': 'application/json' }
});

// Configure logger
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [new transports.Console()],
});

/**
 * Sends a message to a Telegram chat with timeout
 * @param chatId - The ID of the chat to send the message to
 * @param text - The message text to send
 */
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
    try {
        await telegramApi.post(
            `https://api.telegram.org/bot${requiredEnvVars.BOT_TOKEN}/sendMessage`,
            {
                chat_id: chatId,
                text,
            }
        );
    } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
            logger.warn('Telegram API timeout:', { chatId });
            throw new Error('Telegram API timeout');
        }
        logger.error('Failed to send Telegram message:', error);
        throw new Error('Failed to send Telegram message');
    }
}

/**
 * Processes a single message from the queue
 * @param messageData - The message data to process
 * @returns boolean - Whether processing was successful
 */
async function processMessage(messageData: TelegramMessage): Promise<boolean> {
    const chatId = messageData.message?.chat?.id;
    const text = messageData.message?.text;

    if (!chatId || !text) {
        logger.warn('Received invalid message format:', messageData);
        return true; // Consider invalid messages as "processed" to remove from queue
    }

    try {
        await sendTelegramMessage(chatId, `Processed message: ${text}`);
        logger.info('Message processed successfully:', { chatId });
        return true;
    } catch (error) {
        logger.error('Error processing message:', { chatId, text, error });
        return false;
    }
}

/**
 * Determines the recommended scheduling interval based on queue size
 * @param queueSize - Current number of messages in queue
 * @returns number - Recommended interval in minutes
 */
function getRecommendedInterval(queueSize: number): number {
    if (queueSize >= QUEUE_THRESHOLD.HIGH) {
        return SCHEDULE_INTERVALS.HIGH;
    } else if (queueSize >= QUEUE_THRESHOLD.MEDIUM) {
        return SCHEDULE_INTERVALS.MEDIUM;
    }
    return SCHEDULE_INTERVALS.LOW;
}

/**
 * Main worker function that processes messages from the Redis queue
 * Implements batch processing and timeout safety
 * @returns WorkerResult indicating the processing status
 */
export async function runWorker(): Promise<WorkerResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;

    try {
        // Process messages in batches
        for (let i = 0; i < BATCH_SIZE; i++) {
            // Check remaining time
            if (Date.now() - startTime > EXECUTION_TIMEOUT) {
                logger.info('Approaching execution timeout, stopping batch');
                break;
            }

            const message = await redis.lpop('telegram_messages');
            if (!message) {
                break; // No more messages to process
            }

            try {
                const messageData = JSON.parse(message as string) as TelegramMessage;
                const success = await processMessage(messageData);
                if (success) {
                    processedCount++;
                } else {
                    failedCount++;
                    // Re-queue failed messages
                    await redis.rpush('telegram_messages', message);
                }
            } catch (parseError) {
                logger.error('Failed to parse message:', { message, error: parseError });
                processedCount++; // Count invalid messages as processed to remove them
            }
        }

        // Get remaining queue size and calculate recommended interval
        const remainingCount = await redis.llen('telegram_messages');
        const recommendedInterval = getRecommendedInterval(remainingCount);
        
        // Log scheduling recommendation
        logger.info('Queue status:', { 
            remainingCount, 
            recommendedInterval,
            currentProcessed: processedCount,
            failed: failedCount
        });
        
        return {
            status: 'success',
            message: `Processed ${processedCount} messages, ${failedCount} failed`,
            processed_count: processedCount,
            remaining_count: remainingCount,
            recommended_interval: recommendedInterval
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Worker execution failed:', { error: errorMessage });
        
        return {
            status: 'error',
            message: errorMessage,
            processed_count: processedCount
        };
    }
}
