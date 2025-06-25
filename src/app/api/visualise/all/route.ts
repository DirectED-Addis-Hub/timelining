import { NextRequest, NextResponse } from 'next/server';
import { initDriver } from '@/lib/db/neo4j';
import { logger } from '@/lib/logger';

export async function GET(_req: NextRequest) {
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' });

  logger.info('Initializing full graph stream for visualization');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      
      controller.enqueue(encoder.encode('{\n"nodes": [\n')); // Start fast
      
      try {
        logger.info('Running Cypher query to fetch nodes and relationships');
        const result = await session.run(`
          MATCH (n)
          OPTIONAL MATCH (n)-[r]->(m)
          RETURN 
            collect(DISTINCT {
              id: 
                CASE 
                  WHEN n.handle IS NOT NULL THEN n.handle
                  ELSE n.id
                END,
              label: labels(n)[0],
              properties: properties(n)
            }) AS nodes,
            collect(DISTINCT {
              id: id(r),
              source: 
                CASE 
                  WHEN startNode(r).handle IS NOT NULL THEN startNode(r).handle
                  ELSE startNode(r).id
                END,
              target: 
                CASE 
                  WHEN endNode(r).handle IS NOT NULL THEN endNode(r).handle
                  ELSE endNode(r).id
                END,
              type: type(r),
              properties: properties(r)
            }) AS relationships

        `);

        const record = result.records[0];
        const nodesRaw = record.get('nodes');
        const edgesRaw = record.get('relationships');

        logger.info(`Fetched ${nodesRaw.length} nodes and ${edgesRaw.length} relationships`);
        logger.info('First 5 nodes:', nodesRaw.slice(0, 5));
        logger.info('First 5 edges:', edgesRaw.slice(0, 5));

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
          controller.enqueue(encoder.encode(JSON.stringify(nodeData)));
          if (i < nodesRaw.length - 1) controller.enqueue(encoder.encode(',\n'));
        }

        logger.info('Finished streaming nodes');

        controller.enqueue(encoder.encode('\n],\n"edges": [\n'));

        // Stream edges
        for (let i = 0; i < edgesRaw.length; i++) {
          const edge = edgesRaw[i];

          // Defensive: ensure IDs are not null or undefined
          if (
            edge?.id == null ||
            edge?.source == null ||
            edge?.target == null
          ) {
            continue; // Skip broken edge
          }

          // Force all IDs to string
          const edgeId = String(edge.id);
          const sourceId = String(edge.source);
          const targetId = String(edge.target);

          // Remove id, source, target from properties to avoid overwriting
          const {
            id: _removedId,
            source: _removedSource,
            target: _removedTarget,
            ...safeProperties
          } = edge.properties ?? {};

          const edgeData = {
            data: {
              id: edgeId,
              source: sourceId,
              target: targetId,
              label: edge.type || 'REL',
              ...safeProperties,
            },
          };

          controller.enqueue(encoder.encode(JSON.stringify(edgeData)));
          if (i < edgesRaw.length - 1) controller.enqueue(encoder.encode(',\n'));
        }


        logger.info('Finished streaming edges');

        controller.enqueue(encoder.encode('\n]\n}'));
        controller.close();

        logger.info('Graph streaming completed successfully');
      } catch (error: unknown) {
        logger.error('Failed to stream full graph', { error });
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
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}

export async function POST() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}
