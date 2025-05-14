import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info('Fetching all TelegramChat nodes');

  try {
    const result = await session.run(
      `
      MATCH (chat:TelegramChat)
      RETURN chat.id AS id, 
             chat.title AS title, 
             chat.username AS username, 
             chat.type AS type,
             chat.topic AS topic
      ORDER BY chat.title
      `
    );

    const chats = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
    }));

    return NextResponse.json({ chats });
  } catch (error: unknown) {
    logger.error('Failed to fetch chats', { error });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unknown error occurred' }, { status: 500 });
  } finally {
    await session.close();
  }
}

export async function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
