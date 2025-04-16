// tests/entry.test.ts
import { getDriver, closeDriver, initDriver } from '../../src/lib/db/neo4j';
import { createEntry } from '../../src/lib/db/entries';
import { Session } from 'neo4j-driver';

const testEntryText = 'This is a test message';
const testParticipantHandle = 'testuser';
const testTimestamp = new Date().toISOString();
const testChannel = 'test_channel';

jest.setTimeout(30000); // 10 seconds timeout

describe('Neo4j Entry Integration', () => {
  const driver = getDriver();
  let session: Session;

  beforeAll(async () => {
    console.log('Initializing the driver...');
    await initDriver();
  });

  // Use beforeEach to ensure a new session for each test
  beforeEach(() => {
    session = driver.session();
  });

  afterAll(async () => {
    if (session) {
      try {
        // Log the records that will be deleted
        const entriesResult = await session.run(
          `MATCH (e:Entry {text: $text}) RETURN e`,
          { text: testEntryText }
        );
        const profilesResult = await session.run(
          `MATCH (p:Participant {handle: $handle}) RETURN p`,
          { handle: testParticipantHandle }
        );
  
        console.log('Entries to be deleted:');
        entriesResult.records.forEach(record => {
          console.log(record.get('e').properties); // Log the properties of each entry
        });
  
        console.log('Profiles to be deleted:');
        profilesResult.records.forEach(record => {
          console.log(record.get('p').properties); // Log the properties of each profile
        });
  
        // Now perform the deletion
        await session.run(`MATCH (e:Entry {text: $text}) DETACH DELETE e`, { text: testEntryText });
        await session.run(`MATCH (p:Participant {handle: $handle}) DETACH DELETE p`, { handle: testParticipantHandle });
      } catch (err) {
        console.error('Error during cleanup:', err);
      } finally {
        await session.close();
      }
    }
    await closeDriver();
  });

  it('should create an Entry with a Participant', async () => {
    console.log('Writing entry to db');
    const result = await createEntry({
      senderHandle: testParticipantHandle,
      text: testEntryText,
      timestamp: testTimestamp,
      channel: testChannel,
    });

    expect(result.entry.text).toBe(testEntryText);
    expect(result.entry.channel).toBe(testChannel);
    expect(result.participant.handle).toBe(testParticipantHandle);
  });
});
