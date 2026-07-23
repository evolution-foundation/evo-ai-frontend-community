/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { chatService } from '@/services/chat/chatService';
import { useUnansweredConversationsStore } from '@/store/unansweredConversationsStore';
import { extractMessagesData } from '@/utils/chat/responseHelpers';
import { Attachment, Message, MessageSender, MessageTypeValue } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';

interface MessagesState {
  // Messages per conversation
  messages: Record<string, Message[]>;
  messagesLoading: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  messageHistory: Record<
    string,
    {
      hasMore: boolean;
      oldestMessageId: string | null;
      isLoadingMore: boolean;
    }
  >;

  // Reply functionality
  replyToMessage: Message | null;
}

type MessagesAction =
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'SET_MESSAGES_LOADING'; payload: { conversationId: string; loading: boolean } }
  | { type: 'SET_MESSAGES_ERROR'; payload: { conversationId: string; error: string | null } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; message: Message } }
  | {
      type: 'REPLACE_MESSAGE';
      payload: { conversationId: string; tempId: string; message: Message };
    }
  | {
      type: 'SET_LOAD_MORE_LOADING';
      payload: { conversationId: string; loading: boolean };
    }
  | {
      type: 'ADD_PREVIOUS_MESSAGES';
      payload: { conversationId: string; messages: Message[]; hasMore: boolean };
    }
  | { type: 'SET_REPLY_TO_MESSAGE'; payload: Message | null }
  | { type: 'CLEAR_CONVERSATION_MESSAGES'; payload: string };

const initialState: MessagesState = {
  messages: {},
  messagesLoading: {},
  messagesError: {},
  messageHistory: {},
  replyToMessage: null,
};

// Helper function para normalizar timestamp de mensagens
const normalizeMessageTimestamp = (message: Message): number => {
  const createdAt = message.created_at;

  // Se já é número (Unix timestamp em segundos), retornar direto
  if (typeof createdAt === 'number') {
    return createdAt;
  }

  // Se é string numérica, converter para número
  if (typeof createdAt === 'string') {
    // Tentar parse direto se for string numérica
    const parsed = parseInt(createdAt, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    // Tentar parse como Date ISO string
    const dateParsed = new Date(createdAt).getTime() / 1000;
    if (!isNaN(dateParsed) && dateParsed > 0) {
      return dateParsed;
    }
  }

  // Fallback: usar timestamp atual (mensagem sem timestamp válido vai para o final)
  return Date.now() / 1000;
};

// Comparador para ordenação: por timestamp (mais antigo primeiro), mensagens "em envio" sempre por último
const compareMessagesByTimestamp = (a: Message, b: Message): number => {
  const aSending = a.status === 'progress';
  const bSending = b.status === 'progress';
  if (aSending && !bSending) return 1;   // a (sending) vai depois
  if (!aSending && bSending) return -1;  // b (sending) vai depois
  const aTimestamp = normalizeMessageTimestamp(a);
  const bTimestamp = normalizeMessageTimestamp(b);
  return aTimestamp - bTimestamp;
};

function messagesReducer(state: MessagesState, action: MessagesAction): MessagesState {
  switch (action.type) {
    case 'SET_MESSAGES': {
      const { conversationId, messages } = action.payload;
      // Garantir que mensagens estão ordenadas por timestamp ao definir
      const sortedMessages = [...messages].sort(compareMessagesByTimestamp);

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: sortedMessages,
        },
        messagesLoading: {
          ...state.messagesLoading,
          [conversationId]: false,
        },
        messagesError: {
          ...state.messagesError,
          [conversationId]: null,
        },
        messageHistory: {
          ...state.messageHistory,
          [conversationId]: {
            hasMore: sortedMessages.length >= 20, // Evolution carrega 20 por vez
            oldestMessageId: sortedMessages.length > 0 ? sortedMessages[0].id : null,
            isLoadingMore: false,
          },
        },
      };
    }

    case 'SET_MESSAGES_LOADING':
      return {
        ...state,
        messagesLoading: {
          ...state.messagesLoading,
          [action.payload.conversationId]: action.payload.loading,
        },
      };

    case 'SET_MESSAGES_ERROR':
      return {
        ...state,
        messagesError: {
          ...state.messagesError,
          [action.payload.conversationId]: action.payload.error,
        },
        messagesLoading: {
          ...state.messagesLoading,
          [action.payload.conversationId]: false,
        },
      };

    case 'SET_LOAD_MORE_LOADING':
      return {
        ...state,
        messageHistory: {
          ...state.messageHistory,
          [action.payload.conversationId]: {
            ...state.messageHistory[action.payload.conversationId],
            isLoadingMore: action.payload.loading,
          },
        },
      };

    case 'ADD_PREVIOUS_MESSAGES': {
      const { conversationId, messages: newMessages, hasMore } = action.payload;
      const currentMessages = state.messages[conversationId] || [];

      // 🔄 ADICIONAR MENSAGENS ANTIGAS NO INÍCIO E ORDENAR POR TIMESTAMP
      const updatedMessages = [...newMessages, ...currentMessages].sort(compareMessagesByTimestamp);

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages,
        },
        messageHistory: {
          ...state.messageHistory,
          [conversationId]: {
            hasMore,
            oldestMessageId: newMessages.length > 0 ? newMessages[0].id : null,
            isLoadingMore: false,
          },
        },
      };
    }

    case 'ADD_MESSAGE': {
      const currentMessages = state.messages[action.payload.conversationId] || [];
      const newMessage = action.payload.message;

      // 🔒 PROTEÇÃO: Verificar se mensagem já existe para evitar duplicação
      const messageExists = currentMessages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        return state;
      }

      // 🔧 CORREÇÃO: Se a mensagem real chegou via WebSocket, verificar se há uma mensagem temporária (pending)
      // com conteúdo/timestamp similar e substituir ela ao invés de adicionar duas
      // Mensagens temporárias têm status 'progress' e ID numérico (Date.now().toString())
      const isRealMessage = newMessage.status !== 'progress' && !/^\d+$/.test(newMessage.id);

      if (isRealMessage) {
        // Procurar mensagem temporária que pode ser substituída
        // Verificar por conteúdo similar e timestamp próximo (dentro de 5 segundos)
        const newMessageTimestamp = normalizeMessageTimestamp(newMessage);
        const pendingMessage = currentMessages.find(msg => {
          // Mensagem temporária tem status 'progress' e ID numérico
          const isPending = msg.status === 'progress' && /^\d+$/.test(msg.id);
          if (!isPending) return false;

          // Verificar se conteúdo é similar (mesmo conteúdo ou ambos vazios para arquivos)
          const contentMatches =
            msg.content === newMessage.content ||
            (msg.content === '' && newMessage.content === '') ||
            (msg.content?.includes('arquivo') && newMessage.content === '');

          // Verificar se timestamp está próximo (dentro de 10 segundos)
          const msgTimestamp = normalizeMessageTimestamp(msg);
          const timeDiff = Math.abs(newMessageTimestamp - msgTimestamp);

          return contentMatches && timeDiff <= 10;
        });

        if (pendingMessage) {
          // Substituir mensagem temporária pela real
          const updatedMessages = currentMessages
            .map(msg => (msg.id === pendingMessage.id ? newMessage : msg))
            .filter(msg => msg.id !== newMessage.id || msg.id === pendingMessage.id); // Remover duplicatas se houver

          updatedMessages.sort(compareMessagesByTimestamp);

          return {
            ...state,
            messages: {
              ...state.messages,
              [action.payload.conversationId]: updatedMessages,
            },
          };
        }
      }

      // Adicionar mensagem normalmente e ordenar por timestamp (sending por último)
      const updatedMessages = [...currentMessages, newMessage].sort(compareMessagesByTimestamp);

      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: updatedMessages,
        },
      };
    }

    case 'UPDATE_MESSAGE': {
      const conversationMessages = state.messages[action.payload.conversationId] || [];
      const newMessage = action.payload.message;
      const existingMessage = conversationMessages.find(msg => msg.id === newMessage.id);

      // Se mensagem existe e é outgoing, preservar message_type e sender.type
      const mergedMessage: Message =
        existingMessage?.message_type === 'outgoing' && existingMessage.sender?.type === 'user'
          ? {
              ...newMessage,
              message_type: 'outgoing' as MessageTypeValue,
              sender: {
                ...existingMessage.sender,
                ...newMessage.sender,
                type: 'user' as MessageSender['type'],
              },
            }
          : newMessage;

      // Atualizar mensagem e reordenar por timestamp (sending por último)
      const updatedMessages = conversationMessages
        .map(msg => (msg.id === mergedMessage.id ? mergedMessage : msg))
        .sort(compareMessagesByTimestamp);

      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: updatedMessages,
        },
      };
    }

    case 'REPLACE_MESSAGE': {
      const conversationMessages = state.messages[action.payload.conversationId] || [];
      const realMessage = action.payload.message;
      const tempId = action.payload.tempId;

      // 🔒 VERIFICAR SE MENSAGEM REAL JÁ EXISTE (veio via WebSocket antes)
      const existingRealMessage = conversationMessages.find(msg => msg.id === realMessage.id);

      let updatedMessages: Message[];

      if (existingRealMessage) {
        // 🔧 CORREÇÃO: Fazer merge inteligente - usar attachments da API se disponíveis
        const mergedMessage = {
          ...existingRealMessage,
          ...realMessage,
          // Priorizar attachments da API se tiver mais dados
          attachments:
            realMessage.attachments?.length > 0
              ? realMessage.attachments
              : existingRealMessage.attachments,
        };

        // 🔧 CRÍTICO: Sempre remover a mensagem temporária, mesmo se a real já existe
        updatedMessages = conversationMessages
          .filter(msg => msg.id !== tempId) // Remover temporária primeiro
          .map(msg => (msg.id === realMessage.id ? mergedMessage : msg));
      } else {
        // Substituir mensagem temporária (pending) pela mensagem real (sent)
        updatedMessages = conversationMessages.map(msg => (msg.id === tempId ? realMessage : msg));
      }

      // 🔧 GARANTIR: Remover qualquer duplicata da mensagem real
      const seenIds = new Set<string>();
      updatedMessages = updatedMessages.filter(msg => {
        if (seenIds.has(msg.id)) {
          return false; // Duplicata, remover
        }
        seenIds.add(msg.id);
        return true;
      });

      updatedMessages.sort(compareMessagesByTimestamp);

      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: updatedMessages,
        },
      };
    }

    case 'SET_REPLY_TO_MESSAGE':
      return {
        ...state,
        replyToMessage: action.payload,
      };

    case 'CLEAR_CONVERSATION_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload]: [],
        },
        messagesLoading: {
          ...state.messagesLoading,
          [action.payload]: false,
        },
        messagesError: {
          ...state.messagesError,
          [action.payload]: null,
        },
      };

    default:
      return state;
  }
}

interface MessagesContextValue {
  state: MessagesState;

  // Message actions
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    content: string,
    isPrivate?: boolean,
    cannedResponseId?: string | null,
  ) => Promise<Message | undefined>;
  sendMessageWithFiles: (
    conversationId: string,
    content: string,
    files: File[],
    isPrivate?: boolean,
    cannedResponseId?: string | null,
    onUploadProgress?: (progress: number, fileName: string) => void,
    isRecordedAudio?: boolean | string[],
  ) => Promise<Message | undefined>;
  // Internal method for template support
  _sendMessageBase: (
    conversationId: string,
    options: {
      content: string;
      files?: File[];
      isPrivate?: boolean;
      templateParams?: any;
      cannedResponseId?: string | null;
      onUploadProgress?: (progress: number, fileName: string) => void;
      isRecordedAudio?: boolean | string[];
    },
  ) => Promise<Message | undefined>;

  // Context menu actions
  onReplyToMessage: (message: Message) => void;
  onCancelReply: () => void;
  onCopyMessage: (message: Message) => void;
  onDeleteMessage: (conversationId: string, message: Message) => Promise<void>;

  // Direct state manipulation (for WebSocket integration)
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, message: Message) => void;
  replaceMessage: (conversationId: string, tempId: string, message: Message) => void;
  addPreviousMessages: (conversationId: string, previousMessages: Message[]) => void;
  clearConversationMessages: (conversationId: string) => void;

  // Computed values
  getMessages: (conversationId: string) => Message[];
  isMessagesLoading: (conversationId: string) => boolean;
  getMessagesError: (conversationId: string) => string | null;
  canLoadMore: (conversationId: string) => boolean;
  isLoadingMore: (conversationId: string) => boolean;
}

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage('chat');
  const [state, dispatch] = useReducer(messagesReducer, initialState);

  /**
   * TODO:
   * - Se a ideia é evitar duplicação por conversa/ação, teria que ser algo tipo: const key = `${action.type}-${conversationId}`;
   * Ou então remover totalmente isso pois o problema de "duplicação" tem que ser resolvido na origem (websocket, effect, etc), não
   * em um "debouncer" fake no reducer.
   */

  // 🔒 PROTEÇÃO: Refs para evitar renders duplos e chamadas simultâneas
  const dispatchThrottleRef = useRef<Set<string>>(new Set());

  // 🔧 DISPATCH PROTEGIDO: Evitar dispatches duplos
  const protectedDispatch = useCallback((action: MessagesAction) => {
    // Criar chave única simples baseada no tipo de ação e timestamp
    const actionKey = `${action.type}-${Date.now()}-${Math.random()}`;

    if (dispatchThrottleRef.current.has(actionKey)) {
      return;
    }

    dispatchThrottleRef.current.add(actionKey);
    dispatch(action);

    // Limpar após um tempo para permitir futuras operações
    setTimeout(() => {
      dispatchThrottleRef.current.delete(actionKey);
    }, 1000);
  }, []);

  // Message actions
  const loadMessages = useCallback(
    async (conversationId: string) => {
      // 🔒 PROTEÇÃO: Verificar se já está carregando para esta conversa
      if (state.messagesLoading[conversationId]) {
        return;
      }

      dispatch({ type: 'SET_MESSAGES_LOADING', payload: { conversationId, loading: true } });

      try {
        const response = await chatService.getMessages(conversationId);

        // Verificar se a resposta existe
        if (!response) {
          console.warn('API response is empty or malformed');
          dispatch({
            type: 'SET_MESSAGES',
            payload: {
              conversationId,
              messages: [],
            },
          });
          return;
        }

        const messages = extractMessagesData(response);

        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            conversationId,
            messages,
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : t('contexts.messages.errors.loadMessages');
        dispatch({
          type: 'SET_MESSAGES_ERROR',
          payload: {
            conversationId,
            error: errorMessage,
          },
        });
        toast.error(t('contexts.messages.errors.loadMessages'), {
          description: errorMessage,
          action: {
            label: t('contexts.messages.tryAgain'),
            onClick: () => loadMessages(conversationId),
          },
        });
      }
    },
    [state.messagesLoading, t],
  );

  const loadMoreMessages = useCallback(
    async (conversationId: string) => {
      const history = state.messageHistory[conversationId];

      // 🔒 PROTEÇÕES: Verificar se pode carregar mais
      if (!history?.hasMore || history?.isLoadingMore) {
        return;
      }

      // 🔄 INICIAR LOADING
      dispatch({
        type: 'SET_LOAD_MORE_LOADING',
        payload: { conversationId, loading: true },
      });

      try {
        // 📡 BUSCAR MENSAGENS ANTIGAS (before: oldestMessageId)
        const response = await chatService.getMessages(conversationId, {
          before: history.oldestMessageId!,
        });

        if (!response) {
          console.warn('Load More: API response is empty');
          dispatch({
            type: 'SET_LOAD_MORE_LOADING',
            payload: { conversationId, loading: false },
          });
          return;
        }

        const messages = extractMessagesData(response);

        // 📥 ADICIONAR MENSAGENS ANTIGAS
        dispatch({
          type: 'ADD_PREVIOUS_MESSAGES',
          payload: {
            conversationId,
            messages,
            hasMore: messages.length >= 20, // Se trouxe 20, provavelmente tem mais
          },
        });
      } catch (error) {
        dispatch({
          type: 'SET_LOAD_MORE_LOADING',
          payload: { conversationId, loading: false },
        });
        toast.error(t('contexts.messages.errors.loadMoreMessages'), {
          description: error instanceof Error ? error.message : t('contexts.messages.tryAgain'),
        });
      }
    },
    [state.messageHistory, t],
  );

  const _sendMessageBase = useCallback(
    async (
      conversationId: string,
      options: {
        content: string;
        files?: File[];
        isPrivate?: boolean;
        templateParams?: any;
        cannedResponseId?: string | null;
        onUploadProgress?: (progress: number, fileName: string) => void;
        isRecordedAudio?: boolean | string[];
      },
    ) => {
      const {
        content,
        files = [],
        isPrivate = false,
        cannedResponseId,
        onUploadProgress,
        isRecordedAudio,
      } = options;

      // 1. 🔧 REPLY TO: Preparar content_attributes com in_reply_to se houver reply
      const contentAttributes: Record<string, unknown> = {};
      if (state.replyToMessage?.id && !isPrivate) {
        contentAttributes.in_reply_to = state.replyToMessage.id;
      }

      // 2. Criar mensagem PENDING
      const firstFile = files[0];
      const isAudioFile = firstFile?.type.startsWith('audio/');
      const isImageFile = firstFile?.type.startsWith('image/');

      // Criar attachments temporários se houver arquivos
      const tempAttachments =
        files.length > 0
          ? files.map((file, index) => ({
              id: (Date.now() + index).toString(),
              message_id: Date.now().toString(),
              file_type: file.type.startsWith('audio/')
                ? ('audio' as const)
                : file.type.startsWith('image/')
                ? ('image' as const)
                : file.type.startsWith('video/')
                ? ('video' as const)
                : ('file' as const),
              extension: file.name.split('.').pop() || null,
              data_url: URL.createObjectURL(file), // URL temporária para preview
              thumb_url: null,
              file_size: file.size,
              fallback_title: file.name,
              coordinates_lat: 0,
              coordinates_long: 0,
            }))
          : [];

      const pendingMessage: Message = {
        id: Date.now().toString(), // ID temporário
        content:
          content || (files.length > 0 ? (isAudioFile ? '' : `📎 ${files.length} arquivo(s)`) : ''),
        message_type: 'outgoing',
        content_type:
          files.length > 0 ? (isAudioFile ? 'audio' : isImageFile ? 'image' : 'file') : 'text',
        status: 'progress', // Status temporário para mensagem em envio
        created_at: Math.floor(Date.now() / 1000).toString(),
        conversation_id: conversationId,
        sender: {
          id: '0',
          name: 'Você',
          type: 'agent',
        } as MessageSender,
        content_attributes: contentAttributes,
        private: isPrivate,
        source_id: null,
        external_source_ids: {},
        attachments: tempAttachments as Attachment[],
      };

      try {
        // 3. Adicionar mensagem PENDING ao store IMEDIATAMENTE
        protectedDispatch({
          type: 'ADD_MESSAGE',
          payload: { conversationId, message: pendingMessage },
        });

        // 4. Chamar API (com ou sem arquivos)
        // If using template, let backend process it (send empty content for email, processed content for WhatsApp preview)
        const templateParams = options.templateParams;
        const messageContent = templateParams ? '' : content; // Backend will populate from template

        const response =
          files.length > 0
            ? await chatService.sendMessageWithAttachments(
                conversationId,
                messageContent,
                files,
                isPrivate,
                cannedResponseId,
                onUploadProgress,
                contentAttributes.in_reply_to as string | number | undefined,
                pendingMessage.id,
                isRecordedAudio,
              )
            : await chatService.sendMessage(conversationId, {
                content: messageContent,
                message_type: 'outgoing',
                private: isPrivate,
                canned_response_id: cannedResponseId ?? undefined,
                content_attributes:
                  Object.keys(contentAttributes).length > 0 ? contentAttributes : undefined,
                template_params: templateParams,
                echo_id: pendingMessage.id,
              });

        // 5. 🔧 REPLY TO: Limpar reply após envio bem-sucedido
        if (state.replyToMessage) {
          dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
        }

        // 6. SUBSTITUIR mensagem PENDING pela mensagem SENT da API
        const finalMessage = isPrivate ? { ...response, status: 'sent' as const } : response;

        // Limpar URLs temporárias antes de substituir
        tempAttachments.forEach(attachment => {
          if (attachment.data_url) {
            URL.revokeObjectURL(attachment.data_url);
          }
        });

        protectedDispatch({
          type: 'REPLACE_MESSAGE',
          payload: {
            conversationId,
            tempId: pendingMessage.id,
            message: finalMessage,
          },
        });

        // EVO-1963: a public agent reply clears waiting_since on the backend, so the
        // "awaiting my reply" sidebar badge must refetch (this is the decisive trigger
        // for the count — viewing no longer decrements it). Private notes don't reply.
        if (!isPrivate) {
          useUnansweredConversationsStore.getState().fetch();
        }

        return response;
      } catch (error) {
        // Limpar URLs temporárias em caso de erro também
        tempAttachments.forEach(attachment => {
          if (attachment.data_url) {
            URL.revokeObjectURL(attachment.data_url);
          }
        });

        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId,
            message: { ...pendingMessage, status: 'failed' },
          },
        });

        const fallbackMessage =
          files.length > 0
            ? t('contexts.messages.errors.sendMessageWithAttachments')
            : t('contexts.messages.errors.sendMessage');

        toast.error(fallbackMessage, {
          description: error instanceof Error ? error.message : t('contexts.messages.tryAgain'),
          action: {
            label: t('contexts.messages.tryAgain'),
            onClick: () => {
              // TODO: Implementar retry na próxima etapa
            },
          },
        });
        throw error;
      }
    },
    [protectedDispatch, state.replyToMessage, t],
  );

  // Funções públicas (exporta via Context)
  const sendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      isPrivate?: boolean,
      cannedResponseId?: string | null,
    ) => {
      return _sendMessageBase(conversationId, {
        content,
        isPrivate,
        cannedResponseId,
      });
    },
    [_sendMessageBase],
  );

  const sendMessageWithFiles = useCallback(
    (
      conversationId: string,
      content: string,
      files: File[],
      isPrivate?: boolean,
      cannedResponseId?: string | null,
      onUploadProgress?: (progress: number, fileName: string) => void,
      isRecordedAudio?: boolean | string[],
    ) => {
      return _sendMessageBase(conversationId, {
        content,
        files,
        isPrivate,
        cannedResponseId,
        onUploadProgress,
        isRecordedAudio,
      });
    },
    [_sendMessageBase],
  );

  // Context menu actions
  const onReplyToMessage = useCallback(
    (message: Message) => {
      // REGRA EVOLUTION: Mensagens privadas não podem ser respondidas
      if (message.private) {
        toast.error(t('contexts.messages.errors.replyToPrivateNote'));
        return;
      }

      dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: message });
    },
    [t],
  );

  const onCancelReply = useCallback(() => {
    dispatch({ type: 'SET_REPLY_TO_MESSAGE', payload: null });
  }, []);

  const onCopyMessage = useCallback(
    (message: Message) => {
      navigator.clipboard.writeText(message.content);
      toast.success(t('contexts.messages.success.messageCopied'));
    },
    [t],
  );

  const onDeleteMessage = useCallback(
    async (conversationId: string, message: Message) => {
      try {
        // Chamar API para deletar mensagem
        const deletedMessage = await chatService.deleteMessage(conversationId, message.id);

        // A API retorna a mensagem marcada como deletada
        // Atualizar o estado local
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId,
            message: deletedMessage,
          },
        });

        toast.success(t('contexts.messages.success.messageDeleted'));
      } catch {
        toast.error(t('contexts.messages.errors.deleteMessage'));
      }
    },
    [t],
  );

  // Direct state manipulation (for WebSocket integration)
  const setMessages = useCallback((conversationId: string, messages: Message[]) => {
    dispatch({
      type: 'SET_MESSAGES',
      payload: { conversationId, messages },
    });
  }, []);

  const addMessage = useCallback(
    (conversationId: string, message: Message) => {
      protectedDispatch({
        type: 'ADD_MESSAGE',
        payload: { conversationId, message },
      });
    },
    [protectedDispatch],
  );

  const updateMessage = useCallback((conversationId: string, message: Message) => {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { conversationId, message },
    });
  }, []);

  const replaceMessage = useCallback((conversationId: string, tempId: string, message: Message) => {
    dispatch({
      type: 'REPLACE_MESSAGE',
      payload: { conversationId, tempId, message },
    });
  }, []);

  const addPreviousMessages = useCallback(
    (conversationId: string, previousMessages: Message[]) => {
      const currentMessages = state.messages[conversationId] || [];
      const allMessages = [...previousMessages, ...currentMessages];

      dispatch({
        type: 'SET_MESSAGES',
        payload: { conversationId, messages: allMessages },
      });
    },
    [state.messages],
  );

  const clearConversationMessages = useCallback((conversationId: string) => {
    dispatch({ type: 'CLEAR_CONVERSATION_MESSAGES', payload: conversationId });
  }, []);

  // Computed values
  const getMessages = useCallback(
    (conversationId: string) => {
      const messages = state.messages[conversationId] || [];

      // 🔒 CRITICAL: Verificar se todas as mensagens pertencem à conversa atual
      // 🔧 CORREÇÃO: Comparar como strings (UUIDs são strings)
      const validMessages = messages.filter(
        msg => String(msg.conversation_id) === String(conversationId),
      );

      // Se nem todas as mensagens são válidas, logar warning mas retornar válidas
      if (messages.length > 0 && validMessages.length !== messages.length) {
        return [];
      }

      // 🔧 GARANTIR ORDENAÇÃO: por timestamp (mensagens em envio sempre por último)
      const sortedMessages = [...validMessages].sort(compareMessagesByTimestamp);

      return sortedMessages;
    },
    [state.messages],
  );

  const isMessagesLoading = useCallback(
    (conversationId: string) => {
      return state.messagesLoading[conversationId] || false;
    },
    [state.messagesLoading],
  );

  const getMessagesError = useCallback(
    (conversationId: string) => {
      return state.messagesError[conversationId] || null;
    },
    [state.messagesError],
  );

  const canLoadMore = useCallback(
    (conversationId: string) => {
      return state.messageHistory[conversationId]?.hasMore || false;
    },
    [state.messageHistory],
  );

  const isLoadingMore = useCallback(
    (conversationId: string) => {
      return state.messageHistory[conversationId]?.isLoadingMore || false;
    },
    [state.messageHistory],
  );

  const contextValue: MessagesContextValue = {
    state,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    sendMessageWithFiles,
    _sendMessageBase,
    onReplyToMessage,
    onCancelReply,
    onCopyMessage,
    onDeleteMessage,
    setMessages,
    addMessage,
    updateMessage,
    replaceMessage,
    addPreviousMessages,
    clearConversationMessages,
    getMessages,
    isMessagesLoading,
    getMessagesError,
    canLoadMore,
    isLoadingMore,
  };

  return <MessagesContext.Provider value={contextValue}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
