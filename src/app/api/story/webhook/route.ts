import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../lib/logger';
import { redis } from '../../../../lib/redis';
import { deleteTelegramMessage, sendTelegramMessage } from '../../../../lib/telegram';
import { handleError } from '../../../../lib/utils';

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
    const msg = await sendTelegramMessage(chatId, "✅", {
      reply_to_message_id: messageId
    });

    // Asynchronously schedule the deletion for next time the function is called
    Promise.resolve().then(() => {
      setTimeout(async () => {
        await deleteTelegramMessage(chatId, msg.message_id);
      }, 1000);
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook error', { error });
    return handleError(error);
  }
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
