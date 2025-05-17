import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';
import { FullEntryData } from '@/lib/db/models/entry';

export async function GET(req: NextRequest, {
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info(`Fetching full node data for chat ID: ${chatId}`);

  try {
    const result = await session.run(
      `
      MATCH (chat:TelegramChat)
      WHERE chat.chatId = $chatId
    
      MATCH (chat)<-[:FROM_CHAT]-(e:Entry)
      OPTIONAL MATCH (e)-[:SENT_BY]->(p:Participant)
      OPTIONAL MATCH (e)-[:HAS_TEXT]->(t:TextContent)
      OPTIONAL MATCH (e)-[:HAS_CAPTION]->(cap:CaptionContent)
      OPTIONAL MATCH (e)-[:HAS_ENTITY]->(en:Entity)
      OPTIONAL MATCH (e)-[:HAS_PHOTO]->(pht:Photo)
      OPTIONAL MATCH (e)-[:HAS_VOICE]->(vn:Voice)
      OPTIONAL MATCH (e)-[:HAS_VIDEO]->(vid:Video)
      OPTIONAL MATCH (e)-[:HAS_VIDEO_NOTE]->(vidnote:VideoNote)

      WITH chat.topic AS topic, {
        entry: e { .*, id: ID(e) },
        participant: p { .*, id: ID(p) },
        text: t { .* },
        caption: cap { .* },
        entity: en { .* },
        photo: pht { .* },
        voice: vn { .* },
        video: vid { .* },
        videoNote: vidnote { .* }
      } AS entryData

      WITH topic, collect(entryData) AS entries
      WITH collect({ topic: topic, entries: entries }) AS topics

      RETURN { topics: topics } AS json
      `,
      { chatId: Number(chatId) }
    );    

    logger.info(`Found ${result.records.length} topics`);
    
    const json = result.records[0].get('json');

    return NextResponse.json(json);

  } catch (error: unknown) {
    logger.error('Failed to fetch full chat data', { error });

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
