import { getDriver } from './neo4j';

export interface EntryInput {
  text: string;
  timestamp: string;
  channel: string;
  senderHandle: string;
}

export async function createEntry(input: EntryInput) {
  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MERGE (p:Participant {handle: $handle})
      CREATE (e:Entry {
        id: randomUUID(),
        text: $text,
        timestamp: datetime($timestamp),
        channel: $channel
      })-[:SENT_BY]->(p)
      RETURN e, p
      `,
      {
        handle: input.senderHandle,
        text: input.text,
        timestamp: input.timestamp,
        channel: input.channel,
      }
    );

    const record = result.records[0];
    return {
      entry: record.get('e').properties,
      participant: record.get('p').properties,
    };
  } finally {
    await session.close();
  }
}
