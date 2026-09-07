import { useTranslation as useUiTranslation } from 'react-i18next';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { listSessions, getSessionMessages, createSession, deleteSession } from '@/services/agents/sessionService';
import { sendChatMessage } from '@/services/agents/chatService';
import { toast } from 'sonner';
import { FileData } from '@/utils/fileUtils';
import { ChatMessage, ChatSession } from '@/types';

interface AgentChatContextValue {
  // State
  sessions: ChatSession[];
  messages: ChatMessage[];
  selectedSessionId: string | null;
  isLoading: boolean;
  isSending: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  selectSession: (sessionId: string | null) => Promise<void>;
  createNewSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, files?: FileData[]) => Promise<void>;
  clearMessages: () => void;
}

const AgentChatContext = createContext<AgentChatContextValue | undefined>(undefined);

interface AgentChatProviderProps {
  children: React.ReactNode;
  agentId: string;
  key?: string; // Add key prop to reset state when modal opens/closes
}

export function AgentChatProvider({ children, agentId }: AgentChatProviderProps) {
  const { t: tUi } = useUiTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (!agentId) return;
    try {
      setIsLoading(true);
      // Backend já filtra por user_id e agent_id, então não precisamos filtrar novamente
      const response = await listSessions(agentId);
      // Ensure sessions is always an array
      const sessions = Array.isArray(response?.data) ? response.data : [];
      // Filter out any invalid sessions (sessions that might have been deleted)
      const validSessions = sessions.filter(session => session && session.id);
      setSessions(validSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error(tUi("interface:agentchatcontext.couldNotLoadSessions"));
      // Clear sessions on error to avoid showing stale data
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, tUi]);

  // Select session and load messages
  const selectSession = useCallback(async (sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    if (!sessionId) {
      setMessages([]);
      return;
    }

    const MAX_ATTEMPTS = 3;
    let lastError: any;

    setIsLoading(true);
    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 2 ** (attempt - 1) * 500));
          }
          const response = await getSessionMessages(sessionId);
          setMessages(response.data || []);
          return;
        } catch (error: any) {
          lastError = error;
          const httpStatus = error?.response?.status;

          if (httpStatus === 404) {
            toast.error(tUi("interface:agentchatcontext.sessionNotFound"));
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            setSelectedSessionId(null);
            setMessages([]);
            return;
          }

          if (httpStatus !== 500 || attempt === MAX_ATTEMPTS) {
            break;
          }
        }
      }

      console.error('Error loading messages:', lastError);
      toast.error(tUi("interface:agentchatcontext.couldNotLoadMessagesPleaseTryAgain"));
    } finally {
      setIsLoading(false);
    }
  }, [tUi]);

  // Create new session
  const createNewSession = useCallback(async () => {
    if (!agentId) return;
    try {
      setIsLoading(true);
      const response = await createSession(agentId);
      // Use the session_id returned by the backend
      const sessionId = response?.session_id || response?.id;
      if (sessionId) {
        setSelectedSessionId(sessionId);
        setMessages([]);
        // Reload sessions list to include the new session
        await loadSessions();
      } else {
        console.error('No session_id returned from backend');
        toast.error(tUi("interface:agentchatcontext.couldNotCreateSessionNoIdReturned"));
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || tUi("interface:agentchatcontext.couldNotCreateSession");
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, loadSessions, tUi]);

  // Delete session
  const deleteSessionHandler = useCallback(async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      // Remove from local state immediately (optimistic update)
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
      toast.success(tUi("journey:sessions.viewer.messages.deleteSuccess"));
    } catch (error: any) {
      console.error('Error deleting session:', error);
      // If session not found (404), remove it from the list anyway
      if (error?.response?.status === 404) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
          setMessages([]);
        }
        toast.success(tUi("interface:agentchatcontext.sessionRemoved"));
      } else {
        toast.error(tUi("journey:sessions.viewer.messages.deleteError"));
        // Reload sessions to sync with backend
        await loadSessions();
      }
    }
  }, [selectedSessionId, loadSessions, tUi]);

  // Send message via HTTP endpoint
  const sendMessageHandler = useCallback(async (content: string, files?: FileData[]) => {
    if (!agentId) return;

    // Require session to be selected - don't create automatically
    if (!selectedSessionId) {
      toast.error(tUi("interface:agentchatcontext.selectAConversationOrCreateOneBeforeSendingAMessage"));
      return;
    }

    setIsSending(true);

    // Create temporary user message for optimistic update
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content: {
        parts: [{ text: content }],
        role: 'user',
      },
      author: 'user',
      timestamp: Date.now() / 1000,
    };

    // Add user message immediately (optimistic update)
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Send message via HTTP endpoint
      const response = await sendChatMessage(agentId, selectedSessionId!, content, files);

      // Add the response messages from the API to the state
      // message_history contains the new messages (may include user message + agent response)
      if (response.message_history && Array.isArray(response.message_history)) {
        const newMessages = response.message_history as ChatMessage[];

        // Update state: replace temporary user message with real messages from API
        setMessages(prev => {
          // Remove temporary message
          const withoutTemp = prev.filter(msg => msg.id !== tempUserMessage.id);
          // Get existing message IDs to avoid duplicates
          const existingIds = new Set(withoutTemp.map(msg => msg.id));

          // Check if message_history contains user message
          const hasUserMessage = newMessages.some(msg => msg.author === 'user' || msg.content?.role === 'user');

          // If message_history doesn't contain user message, create one from the sent content
          let messagesToAdd = newMessages;
          if (!hasUserMessage) {
            // Create user message from the content we sent
            const userMessage: ChatMessage = {
              id: `user-${Date.now()}`,
              content: {
                parts: [{ text: content }],
                role: 'user',
              },
              author: 'user',
              timestamp: Date.now() / 1000,
            };
            messagesToAdd = [userMessage, ...newMessages];
          }

          // Add only new messages that don't already exist
          const newUniqueMessages = messagesToAdd.filter(msg => !existingIds.has(msg.id));
          return [...withoutTemp, ...newUniqueMessages];
        });
        loadSessions();
      } else {
        console.warn('No message_history in response, keeping temporary message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
      const errorDetail =
        error?.response?.data?.error?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        tUi("widget:errors.sendMessage");
      toast.error(errorDetail);
    } finally {
      setIsSending(false);
    }
  }, [selectedSessionId, agentId, loadSessions, tUi]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Load sessions on mount and reset selected session
  useEffect(() => {
    if (agentId) {
      // Reset selected session when component mounts (modal opens)
      setSelectedSessionId(null);
      setMessages([]);
      loadSessions();
    }
  }, [agentId, loadSessions]);

  const value: AgentChatContextValue = {
    sessions,
    messages,
    selectedSessionId,
    isLoading,
    isSending,
    loadSessions,
    selectSession,
    createNewSession,
    deleteSession: deleteSessionHandler,
    sendMessage: sendMessageHandler,
    clearMessages,
  };

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  const context = useContext(AgentChatContext);
  if (context === undefined) {
    throw new Error('useAgentChat must be used within AgentChatProvider');
  }
  return context;
}

