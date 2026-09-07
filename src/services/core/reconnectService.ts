import i18n from '@/i18n/config';
import { actionCableService } from './websocket/actionCableService';
import { useAuthStore } from '@/store/authStore';

export class ReconnectService {
  private isOnline = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for WebSocket connection failures
    window.addEventListener('evolution:connection_failed', this.handleConnectionFailed.bind(this));

    // Periodic connectivity check
    this.startPeriodicCheck();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleOnline() {
    this.isOnline = true;
    this.reconnectServices();
  }

  private handleOffline() {
    this.isOnline = false;
    this.stopReconnectTimer();
  }

  private handleConnectionFailed() {
    this.scheduleReconnect();
  }

  private handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Page became visible again, check connection
      this.checkAndReconnect();
    }
  }

  private scheduleReconnect(delay = 5000) {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectServices();
      this.reconnectTimer = null;
    }, delay);
  }

  private stopReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async reconnectServices() {
    if (!this.isOnline) return;

    try {
      // Check if user is still authenticated
      const { currentUser } = useAuthStore.getState();

      if (!currentUser) {
        return;
      }

      // Skip token validation for now to prevent logout issues
      // try {
      //   await validityCheck();
      // } catch (error) {
      //   console.error('ReconnectService.reconnectServices error:', error);
      //   return;
      // }

      // Get updated state after validation
      const { currentUser: updatedUser } = useAuthStore.getState();

      if (!updatedUser || !updatedUser.pubsub_token) {
        return;
      }

      // Reconnect WebSocket if not connected
      if (!actionCableService.isConnected()) {
        actionCableService.init(
          updatedUser.pubsub_token,
          updatedUser.id
        );
      }

      // Dispatch reconnection success event
      window.dispatchEvent(new CustomEvent('evolution:reconnected'));

    } catch (error) {
      console.error('ReconnectService.reconnectServices error:', error);
      // Schedule another reconnect attempt
      this.scheduleReconnect(10000); // Try again in 10 seconds
    }
  }

  private startPeriodicCheck() {
    // Check connection every 60 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndReconnect();
    }, 60000);
  }

  private async checkAndReconnect() {
    // Only check if page is visible and online
    if (document.visibilityState !== 'visible' || !this.isOnline) return;

    const { currentUser } = useAuthStore.getState();
    if (!currentUser) return;

    // Check if WebSocket is connected
    if (!actionCableService.isConnected()) {
      this.reconnectServices();
    }

    // Ping server to check connectivity
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/health/live`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(i18n.t("interface:reconnectservice.healthCheckFailed"));
      }
    } catch (error) {
      console.error('ReconnectService.checkAndReconnect error:', error);
      this.scheduleReconnect();
    }
  }

  // Public methods
  forceReconnect() {
    this.reconnectServices();
  }

  destroy() {
    // Clean up event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    window.removeEventListener('evolution:connection_failed', this.handleConnectionFailed.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Clear timers
    this.stopReconnectTimer();

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton instance
let reconnectService: ReconnectService | null = null;

export const getReconnectService = () => {
  if (!reconnectService) {
    reconnectService = new ReconnectService();
  }
  return reconnectService;
};

export const destroyReconnectService = () => {
  if (reconnectService) {
    reconnectService.destroy();
    reconnectService = null;
  }
};
