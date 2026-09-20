import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';

interface WebSocketMessage {
  event: string;
  data: any;
  account_id?: string;
}

interface NotificationWebSocketProps {
  onNotificationCreated: (data: any) => void;
  onNotificationDeleted: (data: any) => void;
  onNotificationUpdated: (data: any) => void;
  onNotificationReadAll: () => void;
}

export const useNotificationWebSocket = (callbacks: NotificationWebSocketProps) => {
  const { user } = useAuth();
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const getWebSocketUrl = () => {
    // Get WebSocket URL from backend Rails (not Vite)
    const apiUrl = import.meta.env.VITE_API_URL;
    const wsProtocol = apiUrl.includes('https') ? 'wss:' : 'ws:';
    const wsUrl = apiUrl.replace(/^https?:/, wsProtocol);

    // Same resolver as the HTTP header: a stale in-memory token opens a cable the
    // server rejects.
    const token = useAuthStore.getState().getAccessToken() || '';

    return `${wsUrl}/cable?token=${token}`;
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.event) {
        case 'notification.created':
          callbacks.onNotificationCreated(message.data);
          break;

        case 'notification.deleted':
          callbacks.onNotificationDeleted(message.data);
          break;

        case 'notification.updated':
          callbacks.onNotificationUpdated(message.data);
          break;

        case 'notification.read_all':
          callbacks.onNotificationReadAll();
          break;

        default:
          // Handle other events if needed
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  const connectWebSocket = () => {
    if (!user) {
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        reconnectAttempts.current = 0;

        // Subscribe to notifications channel
        const subscriptionMessage = {
          command: 'subscribe',
          identifier: JSON.stringify({
            channel: 'RoomChannel',
            pubsub_token: user.pubsub_token,
            user_id: user.id,
          }),
        };

        websocketRef.current?.send(JSON.stringify(subscriptionMessage));
      };

      websocketRef.current.onmessage = handleWebSocketMessage;

      websocketRef.current.onclose = event => {
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, timeout);
        }
      };

      websocketRef.current.onerror = error => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Component unmounting');
      websocketRef.current = null;
    }
  };

  // Connect when user is available
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return disconnectWebSocket;
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return disconnectWebSocket;
  }, []);

  return {
    isConnected: websocketRef.current?.readyState === WebSocket.OPEN,
    reconnectAttempts: reconnectAttempts.current,
  };
};
