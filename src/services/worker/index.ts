import { logger } from '../../lib/logger';
import { redis } from '../../lib/redis';
import { TelegramMessage } from '../../lib/telegram';
import { writeEntry } from './process';

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
                logger.info('No message received from Redis.');
                break;
            }

            const messageData = message as TelegramMessage;

            try {
                // Write metadata to neo4j db
                const recordId = await writeEntry(messageData);
                
                if (recordId) {
                    logger.info('Wrote message metadata to db');
                    processedCount++;
                    await redis.lpush('timeline_entry', recordId)
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
