// Message types based on Vue widget implementation
export enum MessageType {
  INCOMING = 0, // User/Contact messages
  OUTGOING = 1, // Agent messages
  ACTIVITY = 2, // System activity messages (user joined, etc.)
  TEMPLATE = 3, // Form templates and special content
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
}

export interface BaseMessage {
  id: string | number;
  message_type: MessageType;
  content: string | null;
  created_at: number | string;
  conversation_id?: number;
  content_attributes?: {
    in_reply_to?: string | number | null;
    deleted?: boolean;
    revoked_by_contact?: boolean;
    revoke_propagated?: boolean;
    submitted_values?: any[];
    submitted_email?: string;
  };
  attachments?: any[];
}

export interface IncomingMessage extends BaseMessage {
  message_type: MessageType.INCOMING;
  sender: {
    id: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    type: 'contact';
  };
}

export interface OutgoingMessage extends BaseMessage {
  message_type: MessageType.OUTGOING;
  sender?: {
    id: string;
    name?: string;
    avatar_url?: string;
    type: 'user';
  };
}

export interface ActivityMessage extends BaseMessage {
  message_type: MessageType.ACTIVITY;
  content: string; // Activity description like "User joined the conversation"
  sender?: undefined; // Activity messages don't have senders
}

export interface TemplateMessage extends BaseMessage {
  message_type: MessageType.TEMPLATE;
  content_attributes: {
    submitted_values?: Array<{
      name: string;
      value: string;
      title: string;
    }>;
    in_reply_to?: string | number | null;
  };
}

export type ApiMessage = IncomingMessage | OutgoingMessage | ActivityMessage | TemplateMessage;

// UI Message interface (what our components use)
export interface UIMessage {
  id: string;
  type: 'in' | 'out' | 'system';
  text: string;
  ts: number;
  status?: MessageStatus;
  avatarUrl?: string;
  isSystem?: boolean;
  echoId?: string;
  attachments?: any[];
  sender?: {
    name?: string;
    avatar_url?: string;
  };
  replyTo?: {
    id: string | number;
    text: string;
    sender?: string;
  };
}

// Utility functions for message type handling
export const isSystemMessage = (messageType: MessageType): boolean => {
  return messageType === MessageType.ACTIVITY || messageType === MessageType.TEMPLATE;
};

export const getMessageTypeLabel = (messageType: MessageType): string => {
  switch (messageType) {
    case MessageType.INCOMING:
      return 'incoming';
    case MessageType.OUTGOING:
      return 'outgoing';
    case MessageType.ACTIVITY:
      return 'activity';
    case MessageType.TEMPLATE:
      return 'template';
    default:
      return 'unknown';
  }
};

export const mapApiMessageToUI = (apiMessage: ApiMessage): UIMessage => {
  const { message_type, content, created_at, id, attachments } = apiMessage;

  // const isSystem = isSystemMessage(message_type);
  const timestamp = typeof created_at === 'number' ? created_at * 1000 : Date.parse(created_at);

  const baseMessage: UIMessage = {
    id: String(id),
    text: content || '',
    ts: timestamp,
    status: MessageStatus.SENT,
    type: message_type === MessageType.INCOMING ? 'in' : 'out',
    attachments: attachments
      ? attachments.map((att: any) => ({
          id: att.id,
          file_url: att.data_url,
          data_url: att.data_url,
          thumb_url: att.thumb_url,
          file_type: att.file_type,
          file_size: att.file_size,
          fallback_title:
            att.fallback_title ||
            `Arquivo (${att.file_size ? Math.round(att.file_size / 1024) : 0} KB)`,
        }))
      : undefined,
  };

  // Handle reply-to information
  if (apiMessage.content_attributes?.in_reply_to) {
    baseMessage.replyTo = {
      id: apiMessage.content_attributes.in_reply_to,
      text: '', // This would need to be resolved from message history
      sender: '',
    };
  }

  switch (message_type) {
    case MessageType.INCOMING: {
      const incomingMsg = apiMessage as IncomingMessage;
      return {
        ...baseMessage,
        type: 'out', // From user's perspective, their messages are outgoing
        sender: {
          name: incomingMsg.sender?.name,
          avatar_url: incomingMsg.sender?.avatar_url,
        },
      };
    }

    case MessageType.OUTGOING: {
      const outgoingMsg = apiMessage as OutgoingMessage;
      return {
        ...baseMessage,
        type: 'in', // Agent messages are incoming to user
        avatarUrl: outgoingMsg.sender?.avatar_url,
        sender: {
          name: outgoingMsg.sender?.name,
          avatar_url: outgoingMsg.sender?.avatar_url,
        },
      };
    }

    case MessageType.ACTIVITY:
      return {
        ...baseMessage,
        type: 'system',
        isSystem: true,
      };

    case MessageType.TEMPLATE: {
      const templateMsg = apiMessage as TemplateMessage;
      // Handle template messages with submitted values
      let templateText = baseMessage.text;
      if (templateMsg.content_attributes?.submitted_values) {
        const values = templateMsg.content_attributes.submitted_values
          .map(val => `${val.title}: ${val.value}`)
          .join('\n');
        templateText = values || templateText;
      }

      return {
        ...baseMessage,
        type: 'system',
        text: templateText,
        isSystem: true,
      };
    }

    default:
      return {
        ...baseMessage,
        type: 'in',
      };
  }
};
