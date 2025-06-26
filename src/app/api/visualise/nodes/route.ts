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
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info('Initializing full graph stream for visualization');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      
      controller.enqueue(encoder.encode('{\n"nodes": [\n')); // Start fast
      
      try {
        logger.info('Running Cypher query to fetch nodes');
        const result = await session.run(`
          MATCH (n)
          RETURN collect(DISTINCT {
            id: 
              CASE 
                WHEN n.handle IS NOT NULL THEN n.handle
                ELSE n.id
              END,
            label: labels(n)[0],
            properties: properties(n)
          }) AS nodes
        `);

        const record = result.records[0];
        const nodesRaw = record.get('nodes');

        logger.info(`Fetched ${nodesRaw.length} nodes`);
        logger.info('First 5 nodes:', nodesRaw.slice(0, 5));

        // Stream nodes
        for (let i = 0; i < nodesRaw.length; i++) {
          const node = nodesRaw[i];

          // Handle ID selection and casting
          const rawId = node.properties?.handle ?? node.properties?.id;
          const nodeId = String(rawId); // Ensures consistent string ID for graph use

          // Remove 'id' from properties to avoid conflict
          const { id: _removedId, ...safeProperties } = node.properties ?? {};

          const nodeData = {
            data: {
              id: nodeId,
              label: node.label || 'Node',
              ...safeProperties,
            },
          };
          controller.enqueue(encoder.encode(JSON.stringify(nodeData) + '\n'));
        }

        logger.info('Finished streaming nodes');

        controller.enqueue(encoder.encode('\n]\n}'));
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
