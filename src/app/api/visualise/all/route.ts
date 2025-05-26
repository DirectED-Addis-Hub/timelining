import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info('Streaming full graph for visualization');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await session.run(`
          MATCH (n)
          OPTIONAL MATCH (n)-[r]->(m)
          RETURN 
            collect(DISTINCT {
              id: toString(id(n)),
              label: labels(n)[0],
              properties: properties(n)
            }) AS nodes,
            collect(DISTINCT {
              id: toString(id(r)),
              source: toString(id(startNode(r))),
              target: toString(id(endNode(r))),
              type: type(r),
              properties: properties(r)
            }) AS relationships
        `);

        const record = result.records[0];
        const encoder = new TextEncoder();
        
        const nodesRaw = record.get('nodes');
        const edgesRaw = record.get('relationships');

        controller.enqueue(encoder.encode('{\n"nodes": [\n'));

        // Stream nodes
        for (let i = 0; i < nodesRaw.length; i++) {
          const node = nodesRaw[i];
          const nodeData = {
            data: {
              id: node.id,
              label: node.label || 'Node',
              ...node.properties,
            },
          };
          controller.enqueue(encoder.encode(JSON.stringify(nodeData)));
          if (i < nodesRaw.length - 1) controller.enqueue(encoder.encode(',\n'));
        }

        controller.enqueue(encoder.encode('\n],\n"edges": [\n'));

        // Stream edges
        for (let i = 0; i < edgesRaw.length; i++) {
          const edge = edgesRaw[i];
          const edgeData = {
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.label || 'REL',
              ...edge.properties,
            },
          };
          controller.enqueue(encoder.encode(JSON.stringify(edgeData)));
          if (i < edgesRaw.length - 1) controller.enqueue(encoder.encode(',\n'));
        }

        controller.enqueue(encoder.encode('\n]\n}'));
        controller.close();

      } catch (error: unknown) {
        logger.error('Failed to stream full graph', { error });
        controller.enqueue(encoder.encode(JSON.stringify({ error: 'Streaming error' })));
        controller.close();
      } finally {
        await session.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}

export async function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
