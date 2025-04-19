import { logger } from '@/lib/logger';
import { runWorker } from '@/services/worker';
import { handleError } from '@/lib/utils'; // reuse the error handler

export async function GET() {
  logger.info('Cron job triggered.');

  try {
    const result = await runWorker(); // assuming it returns a status or object
    logger.info('Worker result', { result });

    return Response.json({ status: 'Worker executed', result });
  } catch (error) {
    logger.error('Error in cron job', { error });
    return handleError(error);
  }
}

export async function POST() {
  return new Response('Method Not Allowed', { status: 405 });
}
