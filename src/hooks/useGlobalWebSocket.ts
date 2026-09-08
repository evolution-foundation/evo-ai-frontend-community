import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { ChatActionCableConnector, type ChatEventHandlers, type ConnectionParams } from '@/services/chat';

interface GlobalWebSocketHandlers {
  onMessageCreated?: (data: unknown) => void;
  onNotificationCreated?: (data: unknown) => void;
  onNotificationUpdated?: (data: unknown) => void;
  onNotificationDeleted?: (data: unknown) => void;
  onConversationUpdated?: (data: unknown) => void;
}

export const useGlobalWebSocket = (handlers: GlobalWebSocketHandlers) => {
  const { user } = useAuth();
  // getAccessToken() prefers localStorage (embedded host) over the store copy.
  const accessToken = useAuthStore(state => state.getAccessToken());
  const connectorRef = useRef<ChatActionCableConnector | null>(null);
  const handlersRef = useRef<GlobalWebSocketHandlers>(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (!user?.id || !user?.pubsub_token || !accessToken) {
      return;
    }

    // Disconnect existing connection if any
    if (connectorRef.current) {
      connectorRef.current.disconnect();
      connectorRef.current = null;
    }

    try {
      const connectionParams: ConnectionParams = {
        channel: 'RoomChannel',
        pubsub_token: user.pubsub_token,
        user_id: user.id,
        access_token: accessToken,
        resolveAccessToken: () => useAuthStore.getState().getAccessToken(),
      };

      // Convert HTTP/HTTPS URL to WS/WSS WebSocket URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const wsProtocol = apiUrl.includes('https') ? 'wss:' : 'ws:';
      const websocketHost = apiUrl.replace(/^https?:/, wsProtocol);

      // Create chat event handlers that forward to our global handlers
      const chatHandlers: ChatEventHandlers = {
        onMessageCreated: (data) => {
          handlersRef.current.onMessageCreated?.(data);
        },
        onConversationUpdated: (data) => {
          handlersRef.current.onConversationUpdated?.(data);
        },
        onNotificationCreated: (data) => {
          handlersRef.current.onNotificationCreated?.(data);
        },
        onNotificationUpdated: (data) => {
          handlersRef.current.onNotificationUpdated?.(data);
        },
        onNotificationDeleted: (data) => {
          handlersRef.current.onNotificationDeleted?.(data);
        },
      };

      connectorRef.current = new ChatActionCableConnector(
        connectionParams,
        websocketHost,
        chatHandlers
      );

    } catch (error) {
      console.error('❌ Global WebSocket: Error connecting', error);
    }
  }, [user?.id, user?.pubsub_token, accessToken]);

  const disconnect = useCallback(() => {
    if (connectorRef.current) {
      connectorRef.current.disconnect();
      connectorRef.current = null;
    }
  }, []);

  // Connect when user, pubsub_token and access token are available
  useEffect(() => {
    if (user?.id && user?.pubsub_token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, user?.pubsub_token, accessToken, connect, disconnect]);

  useEffect(() => {
    const handleAuthLost = () => {
      disconnect();
    };

    window.addEventListener('evolution:auth-lost', handleAuthLost);
    return () => {
      window.removeEventListener('evolution:auth-lost', handleAuthLost);
    };
  }, [disconnect]);

  // Also listen for notification events via window events (from ActionCable)
  useEffect(() => {
    const handleNotificationEvent = (event: CustomEvent) => {
      const { event: eventType, payload } = event.detail || {};

      switch (eventType) {
        case 'notification.created':
          handlersRef.current.onNotificationCreated?.(payload);
          break;
        case 'notification.updated':
          handlersRef.current.onNotificationUpdated?.(payload);
          break;
        case 'notification.deleted':
          handlersRef.current.onNotificationDeleted?.(payload);
          break;
      }
    };

    // Listen for ActionCable notification events
    window.addEventListener('evolution:notification', handleNotificationEvent as EventListener);

    return () => {
      window.removeEventListener('evolution:notification', handleNotificationEvent as EventListener);
    };
  }, []);

  return {
    isConnected: connectorRef.current?.isConnected() || false,
    connect,
    disconnect,
  };
};
