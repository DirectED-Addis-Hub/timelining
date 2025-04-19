import { getDriver, initDriver } from '../lib/db/neo4j';
import { TelegramMessage } from '../lib/telegram';
import { 
  FullEntryData, 
  EntryNode, 
  ParticipantNode, 
  TelegramChatNode, 
  TextContentNode, 
  CaptionContentNode, 
  EntityNode, 
  PhotoNode, 
  VoiceNode,
  FullEntryInputData
 } from '../lib/db/models/entry'; 
 import { logger } from '../lib/logger';

 function mapEntryNode(node: any): EntryNode {
  return {
    id: node.properties.id,
    updateId: node.properties.updateId,
    messageId: node.properties.messageId,
    date: node.properties.date,
  };
}

function mapParticipantNode(node: any): ParticipantNode {
  return {
    handle: node.properties.handle,
  };
}

function mapTelegramChatNode(node: any): TelegramChatNode {
  return {
    id: node.properties.id,
    type: node.properties.type,
    firstName: node.properties.firstName,
    username: node.properties.username,
  };
}

function mapTextContentNode(node: any): TextContentNode {
  return {
    id: node.properties.id,
    text: node.properties.text,
  };
}

function mapCaptionContentNode(node: any): CaptionContentNode {
  return {
    id: node.properties.id,
    caption: node.properties.caption,
  };
}

function mapEntityNodes(entities: any[]): EntityNode[] {
  console.log(entities)
  return entities.map((entity) => ({
    id: entity.properties.id,
    offset: entity.properties.offset,
    length: entity.properties.length,
    type: entity.properties.type,
  }));
}

function mapPhotoNodes(photos: any[]): PhotoNode[] {
  return photos.map((photo) => ({
    id: photo.properties.id,
    fileId: photo.properties.fileId,
    fileUniqueId: photo.properties.fileUniqueId,
    fileSize: photo.properties.fileSize,
    width: photo.properties.width,
    height: photo.properties.height,
  }));
}

function mapVoiceNode(node: any): VoiceNode {
  return {
    id: node.properties.id,
    fileId: node.properties.fileId,
    fileUniqueId: node.properties.fileUniqueId,
    fileSize: node.properties.fileSize,
    duration: node.properties.duration,
    mimeType: node.properties.mimeType,
  };
}

export function mapTelegramMessageToEntryData(msg: TelegramMessage): FullEntryInputData {
  if (!msg.message || !msg.message.chat) {
    throw new Error('Invalid Telegram message: missing message or chat.');
  }

  return {
    entry: {
      updateId: msg.update_id,
      messageId: msg.message.message_id,
      date: new Date(msg.message.date * 1000).toISOString(),
    },
    participant: {
      handle: msg.message.from?.username || String(msg.message.from?.id) || 'unknown',
    },
    chat: {
      id: msg.message.chat.id,
      firstName: msg.message.chat.first_name,
      username: msg.message.chat.username,
      type: msg.message.chat.type,
    },
    textContent: msg.message.text ? { text: msg.message.text } : undefined,
    captionContent: msg.message.caption ? { caption: msg.message.caption } : undefined,
    entities: msg.message.entities?.map(entity => ({
      offset: entity.offset,
      length: entity.length,
      type: entity.type,
    })) || [],
    photos: msg.message.photo?.map(photo => ({
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
      fileSize: photo.file_size,
      width: photo.width,
      height: photo.height,
    })) || [],
    voice: msg.message.voice
      ? {
          fileId: msg.message.voice.file_id,
          fileUniqueId: msg.message.voice.file_unique_id,
          fileSize: msg.message.voice.file_size,
          duration: msg.message.voice.duration,
          mimeType: msg.message.voice.mime_type,
        }
      : undefined,
  };
}

export async function createEntry(input: FullEntryInputData): Promise<string> {
  const driver = await initDriver();
  let session;
  session = driver.session({ database: 'neo4j' })

  logger.info("Writing entry node, creating nodes of other types if needed...")
  logger.debug(input)

  try {
    const result = await session.executeWrite(async (tx) => {
      const cypherQuery = `
        MERGE (p:Participant {handle: $senderHandle})
        MERGE (c:TelegramChat {id: $chatId})
        ON CREATE SET 
          c.firstName = $chatFirstName,
          c.username = $chatUsername,
          c.type = $chatType
        CREATE (e:Entry {
          id: randomUUID(),
          updateId: $updateId,
          messageId: $messageId,
          date: datetime($date)
        })-[:SENT_BY]->(p)

        MERGE (e)-[:FROM_CHAT]->(c)

        WITH e, p, c

        ${input.textContent ? `
        CREATE (t:TextContent {id: randomUUID(), text: $text})
        MERGE (e)-[:HAS_TEXT]->(t)
        WITH e, p, c
        ` : ''}

        ${input.captionContent ? `
        CREATE (cap:CaptionContent {id: randomUUID(), caption: $caption})
        MERGE (e)-[:HAS_CAPTION]->(cap)
        WITH e, p, c
        ` : ''}

        ${input.entities?.length > 0 ? `
        UNWIND range(0, size($entityOffsets) - 1) AS idxEntity
        CREATE (en:Entity {
          id: randomUUID(),
          offset: $entityOffsets[idxEntity],
          length: $entityLengths[idxEntity],
          type: $entityTypes[idxEntity]
        })
        MERGE (e)-[:HAS_ENTITY]->(en)
        WITH e, p, c
        ` : ''}

        ${input.photos?.length > 0 ? `
        UNWIND range(0, size($photoFileIds) - 1) AS idxPhoto
        CREATE (pht:Photo {
          id: randomUUID(),
          fileId: $photoFileIds[idxPhoto],
          fileUniqueId: $photoFileUniqueIds[idxPhoto],
          fileSize: $photoFileSizes[idxPhoto],
          width: $photoWidths[idxPhoto],
          height: $photoHeights[idxPhoto]
        })
        MERGE (e)-[:HAS_PHOTO]->(pht)
        WITH e, p, c
        ` : ''}

        ${input.voice ? `
        CREATE (v:Voice {
          id: randomUUID(),
          fileId: $voiceFileId,
          fileUniqueId: $voiceFileUniqueId,
          fileSize: $voiceFileSize,
          duration: $voiceDuration,
          mimeType: $voiceMimeType
        })
        MERGE (e)-[:HAS_VOICE]->(v)
        WITH e, p, c
        ` : ''}

        RETURN e.id AS id
      `;
      
      const queryParams = {
        senderHandle: input.participant.handle,
        chatId: input.chat.id,
        chatFirstName: input.chat.firstName,
        chatUsername: input.chat.username,
        chatType: input.chat.type,
        updateId: input.entry.updateId,
        messageId: input.entry.messageId,
        date: input.entry.date,
        text: input.textContent?.text,
        caption: input.captionContent?.caption,
        entityOffsets: input.entities.map(entity => entity.offset),
        entityLengths: input.entities.map(entity => entity.length),
        entityTypes: input.entities.map(entity => entity.type),
        photoFileIds: input.photos.map(photo => photo.fileId),
        photoFileUniqueIds: input.photos.map(photo => photo.fileUniqueId),
        photoFileSizes: input.photos.map(photo => photo.fileSize),
        photoWidths: input.photos.map(photo => photo.width),
        photoHeights: input.photos.map(photo => photo.height),
        voiceFileId: input.voice?.fileId,
        voiceFileUniqueId: input.voice?.fileUniqueId,
        voiceFileSize: input.voice?.fileSize,
        voiceDuration: input.voice?.duration,
        voiceMimeType: input.voice?.mimeType,
      };

      // Run the query
      const result = await tx.run(cypherQuery, queryParams);

      logger.debug("Cypher executed", { query: cypherQuery, params: queryParams, resultSummary: result.summary });

      // Return the result
      return result;
  });

  if (!result.records.length) {
    logger.error("No records returned!", { resultSummary: result.summary });
    throw new Error("No records returned from database.");
  }
  return result.records[0].get('id');

  } catch (error) {
    logger.error("Error creating entry node:", error);
    throw error;  // Rethrow the error to be handled by the caller
  }
}

export async function getFullEntryData(entryId: string): Promise<FullEntryData> {
  const driver = getDriver();
  const session = driver.session();

  logger.info("Getting entry node for id ", entryId)

  const result = await session.run(
    `
    MATCH (e:Entry {id: $entryId}) 
    OPTIONAL MATCH (e)-[:SENT_BY]->(p:Participant)
    OPTIONAL MATCH (e)-[:FROM_CHAT]->(c:TelegramChat)
    OPTIONAL MATCH (e)-[:HAS_TEXT]->(t:TextContent)
    OPTIONAL MATCH (e)-[:HAS_CAPTION]->(cap:CaptionContent)
    OPTIONAL MATCH (e)-[:HAS_ENTITY]->(en:Entity)
    OPTIONAL MATCH (e)-[:HAS_PHOTO]->(pht:Photo)
    OPTIONAL MATCH (e)-[:HAS_VOICE]->(v:Voice)
    RETURN e, p, c, t, cap, collect(en) as entities, collect(pht) as photos, v
    `,
    {
      entryId: entryId, // The ID of the entry you want to retrieve
    }
  );

  // Extract results from the returned data
  const record = result.records[0];

  // Map the nodes from Neo4j query result to your FullEntryData type
  const fullEntryData: FullEntryData = {
    entry: mapEntryNode(record.get('e')),
    participant: mapParticipantNode(record.get('p')),
    chat: mapTelegramChatNode(record.get('c')),
    textContent: record.get('t') ? mapTextContentNode(record.get('t')) : undefined,
    captionContent: record.get('cap') ? mapCaptionContentNode(record.get('cap')) : undefined,
    entities: record.get('entities') ? mapEntityNodes(record.get('entities')) : [],
    photos: record.get('photos') ? mapPhotoNodes(record.get('photos')) : [],
    voice: record.get('v') ? mapVoiceNode(record.get('v')) : undefined,
  };

  return fullEntryData;
}
