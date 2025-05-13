import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { setMessageReaction } from '@/lib/telegram';
import { handleError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    logger.info(request.method)
    return new NextResponse('Method Not Allowed', { status: 405 });
  }
  
  logger.info('Webhook triggered.');

  try {
    const data = await request.json();
    const chatId = data.message?.chat?.id;
    const messageId = data.message?.message_id;

    const topicName = data.message?.reply_to_message?.forum_topic_created?.name;

    if ((data.message?.chat?.type === 'private') || (topicName?.includes('_bot') || topicName?.includes('prisma_events_storying'))) {
      await redis.lpush('telegram_messages', JSON.stringify(data));
      logger.info(`Message queued. chat ID: ${chatId}, message ID: ${messageId} `);
  
      // Send silent reply
      await setMessageReaction(chatId, messageId);
      logger.info('⚡ Message reacted to.');
  
      return NextResponse.json({ status: 'ok' });
    } else {
      logger.info('Message ignored.');
      return NextResponse.json({ status: 'ignored' });
    }
  } catch (error) {
    logger.error('Webhook error', { error });
    return handleError(error);
  }
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
