import { initDriver } from '../lib/db/neo4j';
import { PageView } from '../lib/db/models/page';

// Function to record page views
export async function recordPageView({ pageUrl, timestamp, userId }: PageView) {
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' })

  try {
    const query = `
      MERGE (p:Page {url: $pageUrl})
      ON CREATE SET p.viewCount = 1
      ON MATCH SET p.viewCount = p.viewCount + 1
      MERGE (t:Timestamp {time: $timestamp})
      MERGE (p)-[:VIEWED_AT]->(t)
      ${userId ? 'MERGE (u:User {id: $userId}) MERGE (u)-[:VIEWED]->(p)' : ''}
      RETURN p, t
    `;

    const params = {
      pageUrl,
      timestamp,
      userId: userId || null,
    };

    const result = await session.run(query, params);
    console.log('Page view data stored:', result);
  } catch (error) {
    console.error('Error recording page view:', error);
  } finally {
    await session.close();
  }
};

// Function to get page details (could be extended for more detailed querying)
export async function getPageDetails(pageUrl: string) {
  const driver = await initDriver();
  const session = driver.session({ database: 'neo4j' })

  try {
    const query = 'MATCH (p:Page {url: $pageUrl}) RETURN p';
    const result = await session.run(query, { pageUrl });

    if (result.records.length > 0) {
      return result.records[0].get('p').properties;
    }

    return null; // No such page found
  } catch (error) {
    console.error('Error fetching page details:', error);
    return null;
  } finally {
    await session.close();
  }
};
