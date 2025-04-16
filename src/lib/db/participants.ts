import { getDriver } from './neo4j';

export async function getOrCreateParticipant(handle: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `MERGE (p:Participant {handle: $handle}) RETURN p`,
      { handle }
    );
    return result.records[0].get('p').properties;
  } finally {
    await session.close();
  }
}
