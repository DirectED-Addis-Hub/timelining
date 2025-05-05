import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { setMessageReaction } from '@/lib/telegram';
import { handleError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }
  
  logger.info('Webhook triggered.');

  try {
    const data = await request.json();
    const chatId = data.message?.chat?.id;
    const messageId = data.message?.message_id;

    await redis.lpush('telegram_messages', JSON.stringify(data));
    logger.info(`Message queued. chat ID: ${chatId}, message ID: ${messageId} `);

    // Send the silent reply (emoji)
    await setMessageReaction(chatId, messageId);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error', { error });
    return handleError(error);
  }
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
