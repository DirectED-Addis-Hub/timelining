import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { TelegramMessage, parseMessage, sendTelegramMessage } from '../lib/telegram';
import { createEntry } from '../lib/db/entries';

// Constants for optimization
const BATCH_SIZE = 10; // Process multiple messages per invocation
const EXECUTION_TIMEOUT = 8000; // 8 seconds (keeping safe margin for 10s limit)

interface WorkerResult {
    status: string;
    message?: string;
    processed_count?: number;
    remaining_count?: number;
    recommended_interval?: number;
}

/**
 * Processes a single message from the queue
 * @param messageData - The message data to process
 * @returns boolean - Whether processing was successful
 */
async function processMessage(messageData: TelegramMessage): Promise<boolean> {
    const chatId = messageData.message?.chat?.id;
    const text = messageData.message?.text;
    const username = messageData.message?.from?.username;
    const date = messageData.message?.date;
  
    if (!chatId || !text || !username || !date) {
      logger.warn('Received invalid message format:', messageData);
      return true; // Consider invalid messages as "processed"
    }
  
    try {
      await createEntry({
        senderHandle: username,
        text,
        timestamp: new Date(date * 1000).toISOString(), // Convert from Unix timestamp to ISO
        channel: 'telegram',
      });
  
      await sendTelegramMessage(chatId, `Added to timeline: "${text}"`);
      logger.info('Message processed and added to timeline', { chatId, username });
      return true;
    } catch (error) {
      logger.error('Error processing message', { chatId, text, username, error });
      return false;
    }
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
                break; // Queue is empty - no more messages to process
            }

            const messageData = parseMessage(String(message));

            if (!messageData) {
                logger.info('Processed empty message from queue, incrementing fail count')
                failedCount++;
                continue;
            }

            if (messageData) {
                try {
                    const success = await processMessage(messageData);
                    
                    if (success) {
                        processedCount++;
                    } else {
                        failedCount++;
                        // Re-queue failed messages
                        await redis.rpush('telegram_messages', message);
                    }
                } catch (err) {
                    logger.error('Unexpected error during processing:', { error: err });
                    failedCount++;
                    await redis.rpush('telegram_messages', message);
                }
            }
        }

        // Get remaining queue size and calculate recommended interval
        const remainingCount = await redis.llen('telegram_messages');
        
        // Log scheduling recommendation
        logger.info('Queue status:', { 
            remainingCount, 
            currentProcessed: processedCount,
            failed: failedCount
        });
        
        return {
            status: 'success',
            message: `Processed ${processedCount} messages, ${failedCount} failed`,
            processed_count: processedCount,
            remaining_count: remainingCount,
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
