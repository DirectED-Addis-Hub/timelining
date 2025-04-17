export interface ParticipantNode {
    handle: string;
  }

export interface TelegramChatNode {
  id: number;
  firstName?: string;
  username?: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface EntryNode {
  id: string;
  updateId: number;
  messageId: number;
  date: string;
}

export interface TextContentNode {
  id: string;
  text: string;
}

export interface CaptionContentNode {
  id: string;
  caption: string;
}

export interface EntityNode {
  id: string;
  offset: number;
  length: number;
  type: 'mention' | 'hashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'code' | 'pre' | 'text_link' | 'text_mention';
}

export interface PhotoNode {
  id: string;
  fileId: string;
  fileUniqueId: string;
  fileSize: number;
  width: number;
  height: number;
}

export interface VoiceNode {
  id: string;
  fileId: string;
  fileUniqueId: string;
  fileSize: number;
  duration: number;
  mimeType: string;
}

export interface FullEntryData {
  entry: EntryNode;
  participant: ParticipantNode;
  chat: TelegramChatNode;
  textContent?: TextContentNode;
  captionContent?: CaptionContentNode;
  entities: EntityNode[];
  photos: PhotoNode[];
  voice?: VoiceNode;
}

export interface FullEntryInputData {
  entry: {
    updateId: number;
    messageId: number;
    date: string;
  };
  participant: {
    handle: string;
  };
  chat: {
    id: number;
    firstName?: string;
    username?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  textContent?: {
    text: string;
  };
  captionContent?: {
    caption: string;
  };
  entities: Array<{
    offset: number;
    length: number;
    type: 'mention' | 'hashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'code' | 'pre' | 'text_link' | 'text_mention';
  }>;
  photos: Array<{
    fileId: string;
    fileUniqueId: string;
    fileSize: number;
    width: number;
    height: number;
  }>;
  voice?: {
    fileId: string;
    fileUniqueId: string;
    fileSize: number;
    duration: number;
    mimeType: string;
  };
}

