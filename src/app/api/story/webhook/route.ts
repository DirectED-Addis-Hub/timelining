import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { sendTelegramMessage } from '@/lib/telegram';
import { handleError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  logger.info('Webhook triggered.');

  try {
    const data = await request.json();
    const chatId = data.message?.chat?.id;

    await redis.lpush('telegram_messages', JSON.stringify(data));
    logger.info('Message queued', { chatId });

    await sendTelegramMessage(chatId, `${JSON.stringify(data)}`);

    return Response.json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error', { error });
    return handleError(error);
  }
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}
