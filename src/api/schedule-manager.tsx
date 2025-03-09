import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createLogger, transports, format } from 'winston';

const logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

// Vercel API endpoints
const VERCEL_API_URL = 'https://api.vercel.com/v10/projects';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TOKEN = process.env.VERCEL_API_TOKEN;

if (!PROJECT_ID || !TOKEN) {
    throw new Error('Missing required environment variables: VERCEL_PROJECT_ID or VERCEL_API_TOKEN');
}

/**
 * Updates the cron job schedule in Vercel
 * @param interval - New interval in minutes
 */
async function updateCronSchedule(interval: number): Promise<void> {
    try {
        const response = await axios.patch(
            `${VERCEL_API_URL}/${PROJECT_ID}/crons`,
            {
                crons: [
                    {
                        path: '/api/worker',
                        schedule: `*/${interval} * * * *`
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.status !== 200) {
            throw new Error(`Failed to update cron schedule: ${response.statusText}`);
        }

        logger.info('Cron schedule updated successfully', { newInterval: interval });
    } catch (error) {
        logger.error('Failed to update cron schedule:', error);
        throw error;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { recommended_interval } = req.body;

        if (!recommended_interval || typeof recommended_interval !== 'number') {
            return res.status(400).json({ error: 'Invalid or missing recommended_interval' });
        }

        // Validate interval is within acceptable range (5-15 minutes)
        if (recommended_interval < 5 || recommended_interval > 15) {
            return res.status(400).json({ error: 'Interval must be between 5 and 15 minutes' });
        }

        await updateCronSchedule(recommended_interval);
        return res.json({ status: 'success', message: 'Schedule updated' });
    } catch (error) {
        logger.error('Schedule manager error:', error);
        return res.status(500).json({ 
            error: 'Failed to update schedule',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 