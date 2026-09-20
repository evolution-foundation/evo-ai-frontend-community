import { createConsumer, Consumer, Subscription } from '@rails/actioncable';

class ActionCableService {
  private consumer: Consumer | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private pubsubToken: string | null = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  init(pubsubToken: string, userId: string) {
    this.pubsubToken = pubsubToken;
    this.userId = userId;

    // Create WebSocket connection
    // Convert HTTP/HTTPS URL to WS/WSS WebSocket URL
    const apiUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsProtocol = apiUrl.includes('https') ? 'wss:' : 'ws:';
    const wsUrl = apiUrl.replace(/^https?:/, wsProtocol);
    const websocketURL = `${wsUrl}/cable?pubsub_token=${pubsubToken}`;
    this.consumer = createConsumer(websocketURL);

    // Subscribe to essential channels (using RoomChannel for everything)
    this.subscribeToEvents();

    // Setup connection monitoring
    this.monitorConnection();
  }

  private subscribeToEvents() {
    if (!this.consumer || !this.pubsubToken) return;

    const subscription = this.consumer.subscriptions.create(
      {
        channel: 'RoomChannel',
        pubsub_token: this.pubsubToken,
        user_id: this.userId,
      },
      {
        connected: () => {
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
        },

        disconnected: () => {
          this.handleDisconnection();
        },

        received: (message: any) => {
          this.handleEventMessage(message);
        },
      },
    );

    this.subscriptions.set('events', subscription);
  }

  // private subscribeToNotifications() {
  //   // Notifications are handled through RoomChannel in Evolution
  //   // No separate NotificationChannel needed
  // }

  // private subscribeToPresence() {
  //   // Presence is handled through RoomChannel in Evolution
  //   // No separate PresenceChannel needed
  // }

  // The Rails side puts `{ event, data }` on the wire (ActionCableBroadcastJob),
  // so the payload has to be read from `data`, not from a `payload` key.
  private handleEventMessage(message: any) {
    const { event, data: payload } = message ?? {};

    // Dispatch events based on type
    switch (event) {
      case 'conversation.created':
      case 'conversation.updated':
        window.dispatchEvent(new CustomEvent('evolution:conversation', { detail: payload }));
        break;

      case 'message.created':
      case 'message.updated':
        window.dispatchEvent(new CustomEvent('evolution:message', { detail: payload }));
        break;

      case 'conversation.typing_on':
      case 'conversation.typing_off':
        window.dispatchEvent(new CustomEvent('evolution:typing', { detail: payload }));
        break;

      case 'conversation.status_changed':
        window.dispatchEvent(new CustomEvent('evolution:status', { detail: payload }));
        break;

      case 'conversation.contact_changed':
        window.dispatchEvent(new CustomEvent('evolution:contact', { detail: payload }));
        break;

      case 'presence.update':
        window.dispatchEvent(new CustomEvent('evolution:presence', { detail: payload }));
        break;

      // Meta channel relayed by the Evo Hub changed connection state.
      case 'hub_channel.connection_changed':
        window.dispatchEvent(new CustomEvent('evolution:hubChannelConnection', { detail: payload }));
        break;

      default:
        window.dispatchEvent(new CustomEvent('evolution:event', { detail: { event, payload } }));
    }
  }

  // private handleNotification(data: any) {
  //   window.dispatchEvent(new CustomEvent('evolution:notification', { detail: data }));

  //   // Show browser notification if permitted
  //   if (Notification.permission === 'granted' && data.title) {
  //     new Notification(data.title, {
  //       body: data.body,
  //       icon: data.icon || '/logo.png',
  //       tag: `notification-${data.id}`,
  //     });
  //   }
  // }

  // private handlePresenceUpdate(data: any) {
  //   window.dispatchEvent(new CustomEvent('evolution:presence_update', { detail: data }));
  // }

  private monitorConnection() {
    // Check connection status every 30 seconds
    setInterval(() => {
      if (this.consumer && !this.isConnected()) {
        this.reconnect();
      }
    }, 30000);
  }

  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnect();
      }, this.reconnectDelay);

      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.reconnectAttempts++;
    } else {
      console.error('Max reconnection attempts reached');
      window.dispatchEvent(new CustomEvent('evolution:connection_failed'));
    }
  }

  private reconnect() {
    if (this.pubsubToken && this.userId) {
      console.error(
        `Reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`,
      );
      this.disconnect();
      this.init(this.pubsubToken, this.userId);
    }
  }

  isConnected(): boolean {
    if (!this.consumer) return false;

    // Check if any subscription is connected
    for (const subscription of this.subscriptions.values()) {
      if (subscription && (subscription as any).consumer) {
        return true;
      }
    }
    return false;
  }

  updateUserPresence(status: 'online' | 'offline' | 'busy') {
    const eventsSubscription = this.subscriptions.get('events');
    if (eventsSubscription) {
      eventsSubscription.perform('update_presence', { status });
    }
  }

  sendTypingStatus(conversationId: string, isTyping: boolean) {
    const eventsSubscription = this.subscriptions.get('events');
    if (eventsSubscription) {
      eventsSubscription.perform('typing_status', {
        conversation_id: conversationId,
        is_typing: isTyping,
      });
    }
  }

  subscribeToConversation(conversationId: string) {
    // Conversation events are handled through RoomChannel in Evolution
    // No separate ConversationChannel needed
    console.log(`Conversation ${conversationId} events will be received through RoomChannel`);
  }

  unsubscribeFromConversation(conversationId: string) {
    // No separate conversation subscriptions to unsubscribe from
    console.log(`Conversation ${conversationId} - no separate subscription to remove`);
  }

  disconnect() {
    // Unsubscribe from all channels
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();

    // Disconnect consumer
    if (this.consumer) {
      this.consumer.disconnect();
      this.consumer = null;
    }
  }
}

// Singleton instance
export const actionCableService = new ActionCableService();

// Helper hook for React components
export const useActionCable = () => {
  return actionCableService;
};
