export interface ParticipantNode {
    handle: string;
  }

export interface TelegramChatNode {
  id: number;
  firstName?: string;
  username?: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  chatFirstName?: string;
  chatUsername?: string;
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

export interface VideoNode {
  id: string;
  duration: number; // Duration in seconds
  width: number; // Width of the video
  height: number; // Height of the video
  mimeType: string; // MIME type (e.g., "video/mp4")
  fileId: string; // File ID for the video
  fileUniqueId: string; // Unique file ID for the video
  fileSize: number; // File size in bytes
}

export interface VideoNoteNode {
  id: string;
  duration: number; // Duration in seconds
  length: number; // Length of the video note (often indicates video length or dimension)
  fileId: string; // File ID for the video note
  fileUniqueId: string; // Unique file ID for the video note
  fileSize: number; // File size in bytes
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
  videos: VideoNode[];
  videoNote?: VideoNoteNode;
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
    title?: string; 
    firstName?: string;
    username?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    isForum?: boolean;
  };
  replyTo?: {
    messageId: number;
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
  videos: Array<{
    duration: number; 
    width: number; 
    height: number;
    mimeType: string;
    fileId: string; 
    fileUniqueId: string;
    fileSize: number; 
  }>;
  videoNote?: {
    duration: number; 
    length: number; 
    fileId: string; 
    fileUniqueId: string;
    fileSize: number; 
  };
}

