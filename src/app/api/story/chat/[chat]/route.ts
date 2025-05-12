import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, {
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params;
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info(`Fetching full node data for chat ID: ${chatId}`);

  try {
    const result = await session.run(
      `
      MATCH (chat:TelegramChat {id: $chatId})<-[:FROM_CHAT]-(e:Entry)
      OPTIONAL MATCH (e)-[:SENT_BY]->(p:Participant)
      OPTIONAL MATCH (e)-[:HAS_TEXT]->(t:TextContent)
      OPTIONAL MATCH (e)-[:HAS_CAPTION]->(cap:CaptionContent)
      OPTIONAL MATCH (e)-[:HAS_ENTITY]->(en:Entity)
      OPTIONAL MATCH (e)-[:HAS_PHOTO]->(pht:Photo)
      OPTIONAL MATCH (e)-[:HAS_VOICE]->(vn:Voice)
      OPTIONAL MATCH (e)-[:HAS_VIDEO]->(vid:Video)
      OPTIONAL MATCH (e)-[:HAS_VIDEO_NOTE]->(vidnote:VideoNote)

      RETURN 
        e, 
        p, 
        t, 
        cap, 
        en, 
        pht, 
        vn, 
        vid, 
        vidnote
      `,
      { chatId }
    );

    const records = result.records.map(record => ({
      entry: record.get('e')?.properties ?? null,
      participant: record.get('p')?.properties ?? null,
      text: record.get('t')?.properties ?? null,
      caption: record.get('cap')?.properties ?? null,
      entity: record.get('en')?.properties ?? null,
      photo: record.get('pht')?.properties ?? null,
      voice: record.get('vn')?.properties ?? null,
      video: record.get('vid')?.properties ?? null,
      videoNote: record.get('vidnote')?.properties ?? null,
    }));

    return NextResponse.json({ entries: records });
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
