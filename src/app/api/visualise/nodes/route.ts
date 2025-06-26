import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

const allowedOrigins = [
  'http://localhost:3000',
  'https://evaluate.prisma.events',
];

function getCorsHeaders(origin: string | null): Record<string, string> {

  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  // Return an empty object, but make sure all values are still strings
  return {};
}

// Handle OPTIONS preflight requests
export function OPTIONS(_req: NextRequest) {
  const origin = _req.headers.get('origin');
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(origin),
    },
  });
}

export async function GET(_req: NextRequest) {
  const origin = _req.headers.get('origin');
  console.log("Request origin:", origin);
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info('Initializing nodes stream for visualization');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      
      // Streaming a dummy line immediately to keep the connection alive
      const warmupPing = JSON.stringify({ type: "ping", message: "starting stream..." }) + '\n';
      controller.enqueue(encoder.encode(warmupPing));
      console.log("Sent warmup ping");
      
      try {
        logger.info('Running Cypher query to fetch nodes');
        const result = await session.run(`
          MATCH (e:Entry)
          OPTIONAL MATCH (e)--(related)
          WHERE NOT 'VoiceChunk' IN labels(related)
          WITH e, collect({
            id: related.id,
            label: labels(related)[0],
            properties: properties(related)
          }) AS connections
          ORDER BY e.date ASC
          RETURN {
            id: e.id,
            date: e.date,
            connections: connections
          } AS node
        `);

        logger.info(`Fetched ${result.records.length} nodes`);

        let i = 0;

        // Stream nodes
        for (const record of result.records) {
          const node = record.get('node');

          // Handle ID selection and casting
          const rawId = node.properties?.handle ?? node.properties?.id;
          const nodeId = String(rawId); // Ensures consistent string ID for graph use

          // Remove 'id' from properties to avoid conflict
          const { id: _removedId, ...safeProperties } = node.properties ?? {};

          const nodeData = {
            id: nodeId,
            label: node.label || 'Node',
            ...safeProperties,
          };
          
          const line = JSON.stringify(nodeData) + '\n';
          controller.enqueue(encoder.encode(line));
          
          // Log first 5 lines to console
          if (i++ < 5) console.log('Streamed line:', line);
          
          // Log last 5 lines to console
          if (i > result.records.length - 5) console.log('Streamed line:', line);
        }

        logger.info('Finished streaming nodes');

        controller.close();

        logger.info('Graph streaming completed successfully');
      } catch (error: unknown) {
        logger.error('Failed to stream nodes', { error });
        controller.enqueue(encoder.encode(JSON.stringify({ error: 'Streaming error', details: String(error) })));
        controller.close();
      } finally {
        await session.close();
        logger.info('Neo4j session closed');
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      ...getCorsHeaders(origin),
    },
  });
}

export async function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
