import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runWorker } from '../scripts/workerScript'; // Adjust the import path as necessary
import { logger } from '../lib/logger'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    logger.info("Cron job triggered.");
    try {
        // Directly await the worker function
        const result = await runWorker(); // Assuming runWorker returns a status or result
        logger.info(`Worker result: ${JSON.stringify(result)}`);
        return res.json({ status: "Worker executed", result });
    } catch (e) {
        logger.error(`Error in cron job: ${e}`);
        return res.status(500).json({ error: (e as Error).message });
    }
}