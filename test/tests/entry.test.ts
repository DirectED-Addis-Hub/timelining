// tests/entry.test.ts
import { getDriver, closeDriver, initDriver } from '../../src/lib/db/neo4j';
import { mapTelegramMessageToEntryData, createEntry, getFullEntryData } from '../../src/lib/db/entries';
import { Session } from 'neo4j-driver';
import { TelegramMessage } from '../../src/lib/telegram';
import { FullEntryData } from '../../src/lib/db/models';

const testTelegramMessage: TelegramMessage = {
  update_id: 123456789,
  message: {
    message_id: 987654321,
    from: {
      id: 1001,
      is_bot: false,
      first_name: 'John',
      username: 'john_doe',
      language_code: 'en',
    },
    chat: {
      id: 2002,
      first_name: 'John',
      username: 'john_doe_chat',
      type: 'private',
    },
    date: 1682000000, // Example timestamp
    text: 'Hello, this is a test message!',
    entities: [
      {
        offset: 0,
        length: 5,
        type: 'mention',
      },
      {
        offset: 7,
        length: 4,
        type: 'hashtag',
      },
    ],
    caption: 'Test caption for media',
    photo: [
      {
        file_id: 'file123',
        file_unique_id: 'unique123',
        file_size: 2048,
        width: 800,
        height: 600,
      },
    ],
    voice: {
      duration: 30,
      mime_type: 'audio/mpeg',
      file_id: 'voice123',
      file_unique_id: 'voice_unique123',
      file_size: 1024,
    },
  },
};

const testNodes = (testTelegramMessage: TelegramMessage, entryData: FullEntryData) => {
  // Check the entry node
  if (entryData.entry) {
    const entry = entryData.entry;
    // Test for basic message fields
    console.assert(entry.updateId === testTelegramMessage.update_id, 'updateId mismatch');
    console.assert(entry.messageId === testTelegramMessage.message?.message_id, 'messageId mismatch');
    const messageDate = testTelegramMessage.message?.date;
    if (messageDate) {
      console.assert(
        entry.date.toString() === new Date(messageDate * 1000).toISOString(),
        'date mismatch'
      );
    } else {
      console.error('Test message does not contain a valid date');
    }
  }

  // Check the participant node
  if (entryData.participant) {
    const participant = entryData.participant;
    // Test for participant fields
    console.assert(participant.handle === testTelegramMessage.message?.from?.username || participant.handle === testTelegramMessage.message?.from?.first_name, 'participant handle mismatch');
  }

  // Check the chat node
  if (entryData.chat) {
    const chat = entryData.chat;
    // Test for chat fields
    console.assert(chat.id === testTelegramMessage.message?.chat?.id, 'chat id mismatch');
    console.assert(chat.firstName === testTelegramMessage.message?.chat?.first_name, 'chat firstName mismatch');
    console.assert(chat.username === testTelegramMessage.message?.chat?.username, 'chat username mismatch');
  }

  // Check the textContent node
  if (entryData.textContent) {
    const textContent = entryData.textContent;
    // Test for text content
    console.assert(textContent.text === testTelegramMessage.message?.text, 'textContent mismatch');
  }

  // Check the captionContent node
  if (entryData.captionContent) {
    const captionContent = entryData.captionContent;
    // Test for caption content
    console.assert(captionContent.caption === testTelegramMessage.message?.caption, 'captionContent mismatch');
  }

  // Check the entities node
  if (entryData.entities && entryData.entities.length > 0) {
    const entities = entryData.entities;
    // Test for entities
    testTelegramMessage.message?.entities?.forEach((entity, index) => {
      const nodeEntity = entities[index];
      console.assert(nodeEntity.offset === entity.offset, 'entity offset mismatch');
      console.assert(nodeEntity.length === entity.length, 'entity length mismatch');
      console.assert(nodeEntity.type === entity.type, 'entity type mismatch');
    });
  }

  // Check the photos node
  if (entryData.photos && entryData.photos.length > 0) {
    const photos = entryData.photos;
    // Test for photos
    testTelegramMessage.message?.photo?.forEach((photo, index) => {
      const nodePhoto = photos[index];
      console.assert(nodePhoto.fileId === photo.file_id, 'photo fileId mismatch');
      console.assert(nodePhoto.fileUniqueId === photo.file_unique_id, 'photo fileUniqueId mismatch');
      console.assert(nodePhoto.fileSize === photo.file_size, 'photo fileSize mismatch');
      console.assert(nodePhoto.width === photo.width, 'photo width mismatch');
      console.assert(nodePhoto.height === photo.height, 'photo height mismatch');
    });
  }

  // Check the voice node
  if (entryData.voice) {
    const voice = entryData.voice;
    // Test for voice fields
    console.assert(voice.fileId === testTelegramMessage.message?.voice?.file_id, 'voice fileId mismatch');
    console.assert(voice.fileUniqueId === testTelegramMessage.message?.voice?.file_unique_id, 'voice fileUniqueId mismatch');
    console.assert(voice.fileSize === testTelegramMessage.message?.voice?.file_size, 'voice fileSize mismatch');
    console.assert(voice.duration === testTelegramMessage.message?.voice?.duration, 'voice duration mismatch');
    console.assert(voice.mimeType === testTelegramMessage.message?.voice?.mime_type, 'voice mimeType mismatch');
  }
};


jest.setTimeout(30000); // 30 seconds timeout

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
          { text: testTelegramMessage.message?.text }
        );
        const profilesResult = await session.run(
          `MATCH (p:Participant {handle: $handle}) RETURN p`,
          { handle: testTelegramMessage.message?.from?.username }
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
        await session.run(`MATCH (e:Entry {text: $text}) DETACH DELETE e`, { text: testTelegramMessage.message?.text });
        await session.run(`MATCH (p:Participant {handle: $handle}) DETACH DELETE p`, { handle: testTelegramMessage.message?.from?.username });
      } catch (err) {
        console.error('Error during cleanup:', err);
      } finally {
        await session.close();
      }
    }
    await closeDriver();
  });

  it('should create an Entry and all associated nodes', async () => {
    console.log('Writing entry to db');
    
    const entryData = mapTelegramMessageToEntryData(testTelegramMessage)
    const entryId = await createEntry(entryData);

    const entry = await getFullEntryData(entryId);

    // Call the test function with the nodes data
    testNodes(testTelegramMessage, entry);


  });
});
