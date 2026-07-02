import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/chat/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { Message, Conversation, MessageSender, MessageTypeValue, Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import {
  MessageCreatedEvent,
  MessageUpdatedEvent,
  ConversationCreatedEvent,
  ConversationUpdatedEvent,
  ConversationStatusChangedEvent,
  TypingEvent,
  PresenceUpdateEvent,
  ConversationReadEvent,
} from '@/services/chat/websocket/ChatActionCableConnector';
import { normalizeToUnixSeconds } from '@/utils/time/timeHelpers';

/**
 * Converte file_type do formato WebSocket (número ou string) para o formato esperado pelo frontend
 */
function mapFileType(fileType: number | string): 'image' | 'video' | 'audio' | 'file' | 'location' {
  // Se já for string, retornar diretamente (com validação)
  if (typeof fileType === 'string') {
    const validTypes = ['image', 'video', 'audio', 'file', 'location'];
    if (validTypes.includes(fileType)) {
      return fileType as 'image' | 'video' | 'audio' | 'file' | 'location';
    }
  }

  // Mapear número para string (baseado no enum do backend: 0=image, 1=audio, 2=video, 3=file, 4=location)
  const fileTypeMap: Record<number, 'image' | 'video' | 'audio' | 'file' | 'location'> = {
    0: 'image',
    1: 'audio',
    2: 'video',
    3: 'file',
    4: 'location',
  };

  return fileTypeMap[Number(fileType)] || 'file';
}

/**
 * Converte attachments do formato WebSocket para o formato Attachment esperado pelo frontend
 */
function mapAttachments(
  wsAttachments?: Array<{
    id: string;
    message_id: string;
    file_type: number | string;
    account_id: string;
    extension?: string | null;
    data_url?: string;
    thumb_url?: string | null;
    file_size?: number;
    fallback_title?: string;
    coordinates_lat?: number;
    coordinates_long?: number;
    external_url?: string;
    meta?: Record<string, any>;
    transcribed_text?: string;
  }>,
): Attachment[] {
  if (!wsAttachments || wsAttachments.length === 0) {
    return [];
  }

  return wsAttachments
    .filter(wsAttachment => wsAttachment && wsAttachment.id) // 🔒 FILTRAR: Apenas attachments válidos
    .map(wsAttachment => {
      // 🔧 CORREÇÃO: Preservar data_url se existir, caso contrário usar external_url ou string vazia
      const dataUrl = wsAttachment.data_url
        ? String(wsAttachment.data_url)
        : wsAttachment.external_url
        ? String(wsAttachment.external_url)
        : '';

      // 🔧 CORREÇÃO: Preservar thumb_url se existir, caso contrário usar null
      const thumbUrl = wsAttachment.thumb_url ? String(wsAttachment.thumb_url) : null;

      // Extrair transcribed_text do meta ou diretamente do attachment
      const transcribedText =
        wsAttachment.transcribed_text || wsAttachment.meta?.transcribed_text || undefined;

      return {
        id: wsAttachment.id,
        message_id: wsAttachment.message_id,
        file_type: mapFileType(wsAttachment.file_type),
        extension: wsAttachment.extension || null,
        data_url: dataUrl, // 🔒 GARANTIR: sempre string válida, preservando URL quando existir
        thumb_url: thumbUrl, // 🔒 GARANTIR: preservar thumb_url quando existir
        file_size: wsAttachment.file_size || 0,
        fallback_title: wsAttachment.fallback_title || '',
        coordinates_lat: wsAttachment.coordinates_lat || 0,
        coordinates_long: wsAttachment.coordinates_long || 0,
        external_url: wsAttachment.external_url || undefined, // 🔧 CORREÇÃO: usar undefined em vez de null para compatibilidade com tipo
        transcribed_text: transcribedText, // ✅ Incluir transcrição de áudio
        meta: wsAttachment.meta || undefined, // ✅ Incluir meta completo
      };
    });
}

interface WebSocketState {
  // WebSocket Connection State
  isWebSocketConnected: boolean;
  typingUsers: Record<string, Array<{ id: string; name: string; avatar_url?: string }>>;

  // Real-time State
  presenceStatus: Record<string, 'online' | 'offline' | 'busy'>;
}

type WebSocketAction =
  | { type: 'SET_WEBSOCKET_CONNECTION'; payload: boolean }
  | {
      type: 'SET_TYPING_USER';
      payload: { conversationId: string; user: { id: string; name: string; avatar_url?: string } };
    }
  | { type: 'REMOVE_TYPING_USER'; payload: { conversationId: string; userId: string } }
  | {
      type: 'SET_PRESENCE_STATUS';
      payload: { userId: string; status: 'online' | 'offline' | 'busy' };
    };

const initialState: WebSocketState = {
  isWebSocketConnected: false,
  typingUsers: {},
  presenceStatus: {},
};

function webSocketReducer(state: WebSocketState, action: WebSocketAction): WebSocketState {
  switch (action.type) {
    case 'SET_WEBSOCKET_CONNECTION':
      return {
        ...state,
        isWebSocketConnected: action.payload,
      };

    case 'SET_TYPING_USER': {
      const { conversationId, user } = action.payload;
      const currentTypingUsers = state.typingUsers[conversationId] || [];
      const userExists = currentTypingUsers.some(u => u.id === user.id);

      if (userExists) return state;

      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...currentTypingUsers, user],
        },
      };
    }

    case 'REMOVE_TYPING_USER': {
      const { conversationId, userId } = action.payload;
      const currentTypingUsers = state.typingUsers[conversationId] || [];

      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: currentTypingUsers.filter(user => user.id !== userId),
        },
      };
    }

    case 'SET_PRESENCE_STATUS':
      return {
        ...state,
        presenceStatus: {
          ...state.presenceStatus,
          [action.payload.userId]: action.payload.status,
        },
      };

    default:
      return state;
  }
}

interface WebSocketHandlers {
  onMessageCreated?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onConversationCreated?: (conversation: Conversation) => void;
  onConversationUpdated?: (conversation: Partial<Conversation> & { id: string }) => void;
  onConversationStatusChanged?: (conversationId: string, status: Conversation['status'], updatedAt?: string) => void;
  onConversationRead?: (conversationId: string, unreadCount: number) => void;
  onConversationLastActivity?: (conversationId: string, lastActivityAt: string) => void;
}

interface WebSocketContextValue {
  state: WebSocketState;

  // WebSocket actions
  sendTypingOn: (conversationId: string) => void;
  sendTypingOff: (conversationId: string) => void;
  getTypingUsers: (
    conversationId: string,
  ) => Array<{ id: string; name: string; avatar_url?: string }>;
  isWebSocketConnected: () => boolean;
  getPresenceStatus: (userId: string) => 'online' | 'offline' | 'busy';

  // Handler registration
  registerHandlers: (handlers: WebSocketHandlers) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage('chat');
  const [state, dispatch] = useReducer(webSocketReducer, initialState);

  // Obter dados do usuário atual
  const { user } = useAuth();

  // Handlers externos (será registrado pelos outros contextos)
  const handlersRef = React.useRef<WebSocketHandlers>({});

  // WebSocket Integration com dados reais
  const {
    isConnected: wsConnected,
    sendTypingOn: wsSendTypingOn,
    sendTypingOff: wsSendTypingOff,
  } = useWebSocket(
    user?.id || '', // ✅ ID real do usuário
    user?.pubsub_token || '', // ✅ Token real do usuário
    {
      enabled: !!(user?.id && user?.pubsub_token), // ✅ Habilitado condicionalmente
      websocketHost: import.meta.env.VITE_API_URL, // ✅ Host correto da API
      handlers: {
        onMessageCreated: useCallback((data: MessageCreatedEvent) => {
          // Canonical conversation id (UUID from backend)
          const conversationId = String(data.conversation?.id ?? data.conversation_id ?? '');
          if (!data || !data.id || !conversationId) {
            console.warn('⚠️ WEBSOCKET: Evento message.created inválido, ignorando:', data);
            return;
          }

          // Converter message_type: backend envia número (0=incoming, 1=outgoing, 2=activity, 3=template)
          const messageTypeMap: Record<number | string, MessageTypeValue> = {
            0: 'incoming',
            1: 'outgoing',
            2: 'activity',
            3: 'template',
            incoming: 'incoming',
            outgoing: 'outgoing',
            activity: 'activity',
            template: 'template',
          };
          const messageType = messageTypeMap[data.message_type] || (data.message_type as MessageTypeValue);

          // Usar sender exatamente como vem do backend (já vem com type correto: 'user', 'contact', 'agent_bot')
          // Backend envia avatar_url no sender, usamos como thumbnail
          const sender: MessageSender = {
            id: data.sender?.id || data.sender_id,
            name: data.sender?.name || '',
            type: (data.sender?.type || data.sender_type || 'contact') as MessageSender['type'],
            thumbnail: data.sender?.avatar_url || undefined,
            channel: undefined,
          };

          const message: Message = {
            id: data.id,
            content: data.content || '',
            message_type: messageType,
            created_at: data.created_at,
            private: data.private || false,
            status: data.status || 'sent',
            source_id: data.source_id || null,
            content_type: data.content_type || 'text',
            content_attributes: data.content_attributes || {},
            sender,
            conversation_id: conversationId,
            external_source_ids: {},
            attachments: mapAttachments(data.attachments),
            echo_id: data.echo_id,
          };

          if (handlersRef.current.onMessageCreated) {
            handlersRef.current.onMessageCreated(message);
          }

          // Atualizar última atividade da conversa (usar mesmo conversationId UUID)
          if (
            data.conversation?.last_activity_at &&
            handlersRef.current.onConversationLastActivity
          ) {
            handlersRef.current.onConversationLastActivity(
              conversationId,
              String(data.conversation.last_activity_at),
            );
          }

          // Toast para novas mensagens seria responsabilidade do handler externo
        }, []),

        onMessageUpdated: useCallback((data: MessageUpdatedEvent) => {
          const conversationId = String(data.conversation?.id ?? data.conversation_id ?? '');
          if (!data || !data.id || !conversationId) {
            console.warn('⚠️ WEBSOCKET: Evento message.updated inválido, ignorando:', data);
            return;
          }

          // Converter message_type: backend envia número (0=incoming, 1=outgoing, 2=activity, 3=template)
          const messageTypeMap: Record<number | string, MessageTypeValue> = {
            0: 'incoming',
            1: 'outgoing',
            2: 'activity',
            3: 'template',
            incoming: 'incoming',
            outgoing: 'outgoing',
            activity: 'activity',
            template: 'template',
          };
          const messageType = messageTypeMap[data.message_type] || (data.message_type as MessageTypeValue);

          // CORREÇÃO: Para canal API e mensagens privadas, corrigir status 'failed' para 'sent'
          const correctedStatus =
            (data.private || data.inbox_id === '2') && data.status === 'failed'
              ? 'sent'
              : data.status;

          // Usar sender exatamente como vem do backend (já vem com type correto: 'user', 'contact', 'agent_bot')
          // Backend envia avatar_url no sender, usamos como thumbnail
          const sender: MessageSender = {
            id: data.sender?.id || data.sender_id,
            name: data.sender?.name || '',
            type: (data.sender?.type || data.sender_type || 'contact') as MessageSender['type'],
            thumbnail: data.sender?.avatar_url || undefined,
            channel: undefined,
          };

          const message: Message = {
            id: data.id,
            content: data.content || '',
            message_type: messageType,
            created_at: data.created_at,
            private: data.private || false,
            status: correctedStatus,
            source_id: data.source_id || null,
            content_type: data.content_type || 'text',
            content_attributes: data.content_attributes || {},
            sender,
            conversation_id: conversationId,
            external_source_ids: {},
            attachments: mapAttachments(data.attachments),
          };

          // Chamar handler externo se registrado
          if (handlersRef.current.onMessageUpdated) {
            handlersRef.current.onMessageUpdated(message);
          }
        }, []),

        onConversationCreated: useCallback(
          (data: ConversationCreatedEvent) => {
            const conversation: Conversation = {
              id: String(data.id),
              uuid: String(data.id),
              display_id: data.display_id != null ? String(data.display_id) : '',
              status: data.status,
              created_at: data.created_at,
              pipeline_id: null,
              updated_at: data.updated_at,
              last_activity_at: data.last_activity_at,
              inbox_id: data.inbox_id,
              assignee_id: data.assignee_id,
              team_id: data.team_id,
              meta: {
                sender: {
                  id: data.meta.sender.id,
                  name: data.meta.sender.name,
                  type: 'contact' as const,
                  email: data.meta.sender.email || null,
                  phone_number: data.meta.sender.phone_number || null,
                  avatar_url: data.meta.sender.avatar_url || null,
                },
                hmac_verified: data.meta.hmac_verified,
                provider_connection: data.meta.provider_connection,
              },
              contact: {
                id: data.meta.sender.id,
                name: data.meta.sender.name,
                email: data.meta.sender.email || null,
                phone_number: data.meta.sender.phone_number || null,
                avatar: data.meta.sender.avatar_url || null,
                avatar_url: data.meta.sender.avatar_url || null,
                identifier: null,
                custom_attributes: {},
                last_activity_at: data.last_activity_at,
                created_at: data.created_at,
                updated_at: data.updated_at,
                additional_attributes: {},
                contact_inboxes: {},
                location: null,
                country_code: null,
                blocked: false,
              },
              assignee: data.meta.assignee
                ? {
                    id: data.meta.assignee.id,
                    uid: '',
                    name: data.meta.assignee.name,
                    available_name: data.meta.assignee.name,
                    avatar_url: undefined,
                    availability: 'online' as const,
                    availability_status: 'online' as const,
                    email: '',
                    role: undefined,
                    confirmed: false,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    permissions: [],
                  }
                : null,
              team: data.meta.team
                ? {
                    id: data.meta.team.id,
                    name: data.meta.team.name,
                    description: '',
                    allow_auto_assign: true,
                    is_member: false,
                  }
                : null,
              inbox: {
                id: data.inbox_id,
                name: '',
                channel_id: '',
                channel_type: data.meta.channel || 'web',
                greeting_enabled: false,
                greeting_message: '',
                working_hours_enabled: false,
                enable_email_collect: false,
                csat_survey_enabled: false,
                enable_auto_assignment: false,
                avatar_url: undefined,
                provider: data.meta.provider || '',
              },
              labels: data.labels.map((labelId: string) => ({
                id: labelId,
                title: '',
                description: '',
                color: '#000000',
                show_on_sidebar: false,
                created_at: data.created_at,
                updated_at: data.updated_at,
              })),
              unread_count: data.unread_count,
              messages: [], // Será carregado quando selecionado
              // Grupos: o serializer/preset do chip filtra por is_group; sem popular
              // aqui, um grupo novo via realtime não casa o matcher e cai no buffer
              // oculto até refetch. Vem do push_event_data (EventDataPresenter).
              is_group: data.is_group ?? false,
              custom_attributes: data.custom_attributes || {},
              additional_attributes: data.additional_attributes || {},
              // Campos obrigatórios adicionais da interface Conversation
              contact_last_seen_at: null,
              agent_last_seen_at: null,
              can_reply: true,
              channel: data.meta.channel || 'web',
              contact_inbox_id: '', // Será atualizado quando necessário
              first_reply_created_at: null,
              identifier: null,
              muted: false,
              priority: (data.priority || null) as 'low' | 'medium' | 'high' | 'urgent' | null,
              snoozed_until: null,
              timestamp: normalizeToUnixSeconds(data.created_at),
              waiting_since: normalizeToUnixSeconds(data.created_at),
            };

            // Chamar handler externo se registrado
            if (handlersRef.current.onConversationCreated) {
              handlersRef.current.onConversationCreated(conversation);
            }

            toast.success(t('contexts.webSocket.newConversation.title'), {
              description: t('contexts.webSocket.newConversation.description', {
                name: data.meta.sender?.name || t('contexts.webSocket.newConversation.newContact'),
              }),
            });
          },
          [t],
        ),

        onConversationUpdated: useCallback((data: ConversationUpdatedEvent) => {
          if (!data || !data.id) {
            console.warn('WebSocketContext: Invalid conversation data received', data);
            return;
          }

          const previewMessage = data.messages?.[0];
          const previewMessageTypeMap: Record<number | string, MessageTypeValue> = {
            0: 'incoming',
            1: 'outgoing',
            2: 'activity',
            3: 'template',
            incoming: 'incoming',
            outgoing: 'outgoing',
            activity: 'activity',
            template: 'template',
          };

          const lastNonActivityMessage = previewMessage
            ? {
                id: String(previewMessage.id),
                content: previewMessage.content || '',
                message_type:
                  previewMessageTypeMap[previewMessage.message_type ?? 'incoming'] || 'incoming',
                created_at:
                  previewMessage.created_at == null ? '' : String(previewMessage.created_at),
                processed_message_content:
                  previewMessage.processed_message_content || previewMessage.content || '',
                sender: {
                  id: String(previewMessage.sender?.id || ''),
                  name: previewMessage.sender?.name || '',
                  type:
                    ((previewMessage.sender?.type || 'contact') as
                      | 'contact'
                      | 'agent_bot'
                      | 'agent'
                      | 'user'),
                },
              }
            : undefined;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updatedConversation: Partial<Conversation> & { id: string } = {
            id: String(data.id),
            ...(data.display_id != null && { display_id: String(data.display_id) }),
            status: data.status,
            created_at: data.created_at,
            updated_at: data.updated_at,
            last_activity_at: data.last_activity_at,
            inbox_id: data.inbox_id,
            assignee_id: data.assignee_id,
            team_id: data.team_id,
            unread_count: data.unread_count,
            // Grupos: mesmo gap do create — sem copiar is_group, um grupo ainda não
            // carregado que atualiza via realtime não sobe pro chip Grupos. Spread
            // condicional pra não sobrescrever um is_group=true já existente no merge.
            ...(data.is_group !== undefined && { is_group: data.is_group }),
            timestamp: normalizeToUnixSeconds(data.last_activity_at),
            waiting_since: data.waiting_since ?? normalizeToUnixSeconds(data.last_activity_at),
            meta: {
              sender: {
                id: data.meta.sender.id,
                name: data.meta.sender.name,
                type: 'contact' as const,
                email: data.meta.sender.email || null,
                phone_number: data.meta.sender.phone_number || null,
                avatar_url: data.meta.sender.avatar_url || null,
              },
              hmac_verified: data.meta.hmac_verified,
              provider_connection: data.meta.provider_connection,
            },
            ...(data.meta.assignee
              ? {
                  assignee: {
                    id: data.meta.assignee.id,
                    uid: '',
                    name: data.meta.assignee.name,
                    available_name: data.meta.assignee.name,
                    avatar_url: data.meta.assignee.avatar_url ?? undefined,
                    availability: (data.meta.assignee.availability_status || 'offline') as 'online' | 'offline' | 'busy',
                    availability_status: (data.meta.assignee.availability_status || 'offline') as 'online' | 'offline' | 'busy',
                    email: '',
                    role: undefined,
                    confirmed: false,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                    permissions: [],
                  },
                }
              : data.meta.assignee === null ? { assignee: null } : {}),
            ...(data.meta.team
              ? {
                  team: {
                    id: data.meta.team.id,
                    name: data.meta.team.name,
                    description: '',
                    allow_auto_assign: true,
                    is_member: false,
                  },
                }
              : data.meta.team === null ? { team: null } : {}),
            ...(data.labels && {
              labels: data.labels.map((label: string | Record<string, unknown>) => {
                if (typeof label === 'string') {
                  return {
                    id: label,
                    title: label,
                    description: '',
                    color: '',
                    show_on_sidebar: false,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                  };
                }
                return {
                  id: String(label.id),
                  title: String(label.title || ''),
                  description: String(label.description || ''),
                  color: String(label.color || ''),
                  show_on_sidebar: Boolean(label.show_on_sidebar),
                  created_at: String(label.created_at || data.created_at),
                  updated_at: String(label.updated_at || data.updated_at),
                };
              }),
            }),
            ...(data.custom_attributes != null && Object.keys(data.custom_attributes).length > 0 && {
              custom_attributes: data.custom_attributes,
            }),
            ...(data.additional_attributes != null && { additional_attributes: data.additional_attributes }),
            ...(data.priority !== undefined && { priority: (data.priority || null) as 'low' | 'medium' | 'high' | 'urgent' | null }),
            ...(data.can_reply !== undefined && { can_reply: data.can_reply }),
            ...(data.channel && { channel: data.channel }),
            ...(data.snoozed_until !== undefined && { snoozed_until: data.snoozed_until }),
            ...(data.first_reply_created_at !== undefined && { first_reply_created_at: data.first_reply_created_at }),
            ...(data.contact_last_seen_at != null && { contact_last_seen_at: data.contact_last_seen_at }),
            ...(data.agent_last_seen_at != null && { agent_last_seen_at: data.agent_last_seen_at }),
            ...(lastNonActivityMessage ? { last_non_activity_message: lastNonActivityMessage } : {}),
          };

          // Chamar handler externo se registrado
          if (handlersRef.current.onConversationUpdated) {
            handlersRef.current.onConversationUpdated(updatedConversation);
          }
        }, []),

        onConversationStatusChanged: useCallback((data: ConversationStatusChangedEvent) => {
          if (!data?.id || !data?.status) {
            return;
          }

          handlersRef.current.onConversationStatusChanged?.(
            String(data.id),
            data.status,
            data.updated_at,
          );
        }, []),

        onTypingOn: useCallback((data: TypingEvent) => {
          dispatch({
            type: 'SET_TYPING_USER',
            payload: {
              conversationId: data.conversation.id,
              user: data.user,
            },
          });
        }, []),

        onTypingOff: useCallback((data: TypingEvent) => {
          dispatch({
            type: 'REMOVE_TYPING_USER',
            payload: {
              conversationId: data.conversation.id,
              userId: data.user.id,
            },
          });
        }, []),

        onPresenceUpdate: useCallback((data: PresenceUpdateEvent) => {
          // Atualizar status de presença dos usuários
          // data.users pode ser um objeto ou array, vamos verificar
          if (data.users) {
            const usersArray = Array.isArray(data.users) ? data.users : Object.values(data.users);
            usersArray?.forEach((user: unknown) => {
              // Type guard para verificar se user tem as propriedades necessárias
              if (
                user &&
                typeof user === 'object' &&
                'id' in user &&
                'availability_status' in user &&
                typeof (user as { id: unknown }).id === 'string' &&
                typeof (user as { availability_status: unknown }).availability_status === 'string'
              ) {
                const typedUser = user as {
                  id: string;
                  availability_status: 'online' | 'offline' | 'busy';
                };
                dispatch({
                  type: 'SET_PRESENCE_STATUS',
                  payload: {
                    userId: typedUser.id,
                    status: typedUser.availability_status,
                  },
                });
              }
            });
          }
        }, []),

        onConversationRead: useCallback((data: ConversationReadEvent) => {
          // Chamar handler externo se registrado
          if (handlersRef.current.onConversationRead) {
            handlersRef.current.onConversationRead(data.id, data.unread_count || 0);
          }
        }, []),
      },
    },
  );

  // Sincronizar estado de conexão WebSocket
  useEffect(() => {
    dispatch({ type: 'SET_WEBSOCKET_CONNECTION', payload: wsConnected });
  }, [wsConnected]);

  // WebSocket functions
  const sendTypingOn = useCallback(
    (conversationId: string) => {
      if (wsConnected) {
        wsSendTypingOn(conversationId);
      }
    },
    [wsConnected, wsSendTypingOn],
  );

  const sendTypingOff = useCallback(
    (conversationId: string) => {
      if (wsConnected) {
        wsSendTypingOff(conversationId);
      }
    },
    [wsConnected, wsSendTypingOff],
  );

  const getTypingUsers = useCallback(
    (conversationId: string) => {
      return state.typingUsers[conversationId] || [];
    },
    [state.typingUsers],
  );

  const isWebSocketConnected = useCallback(() => {
    return state.isWebSocketConnected;
  }, [state.isWebSocketConnected]);

  const getPresenceStatus = useCallback(
    (userId: string) => {
      return state.presenceStatus[userId] || 'offline';
    },
    [state.presenceStatus],
  );

  const registerHandlers = useCallback((handlers: WebSocketHandlers) => {
    handlersRef.current = { ...handlersRef.current, ...handlers };
  }, []);

  const contextValue: WebSocketContextValue = {
    state,
    sendTypingOn,
    sendTypingOff,
    getTypingUsers,
    isWebSocketConnected,
    getPresenceStatus,
    registerHandlers,
  };

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}
