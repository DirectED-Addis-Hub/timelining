import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runWorker } from '../scripts/workerScript';
import axios from 'axios';
import { createLogger, transports, format } from 'winston';

const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    logger.info("Worker job triggered");
    try {
        // Run the worker
        const result = await runWorker();
        logger.info(`Worker result:`, result);

        // If we have a recommended interval, try to update the schedule
        if (result.recommended_interval) {
            try {
                await axios.post('/api/schedule-manager', {
                    recommended_interval: result.recommended_interval
                });
                logger.info('Schedule update requested', { 
                    new_interval: result.recommended_interval 
                });
            } catch (scheduleError) {
                logger.error('Failed to update schedule:', scheduleError);
                // Don't fail the worker if schedule update fails
            }
        }

        return res.json({ 
            status: "success", 
            result,
            schedule_updated: !!result.recommended_interval
        });
    } catch (error) {
        logger.error(`Error in worker:`, error);
        return res.status(500).json({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
} 