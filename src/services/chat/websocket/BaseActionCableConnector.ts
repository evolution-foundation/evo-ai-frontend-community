import { createConsumer, Consumer, Subscription } from '@rails/actioncable';

const PRESENCE_INTERVAL = 20000; // 20 segundos
const INITIAL_RECONNECT_INTERVAL = 1000; // 1 segundo
const MAX_RECONNECT_INTERVAL = 30000; // 30 segundos (teto do backoff)
const MAX_RECONNECT_ATTEMPTS = 50; // desiste após 50 tentativas (~5 min com backoff)

export interface WebSocketEvent {
  event: string;
  data: unknown;
}

export interface ConnectionParams {
  channel: string;
  pubsub_token: string;
  user_id: string;
}

export interface EventHandlers {
  [key: string]: (data: unknown) => void;
}

/**
 * BaseActionCableConnector
 * Classe base para conexão WebSocket com Evolution usando ActionCable
 * Baseada em: evolution/app/javascript/shared/helpers/BaseActionCableConnector.js
 */
export class BaseActionCableConnector {
  protected consumer: Consumer;
  protected subscription: Subscription | null = null;
  protected events: EventHandlers = {};
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected presenceTimer: NodeJS.Timeout | null = null;
  protected connectionParams: ConnectionParams;
  protected websocketURL?: string;
  protected reconnectAttempts = 0;

  static isDisconnected = false;

  constructor(connectionParams: ConnectionParams, websocketHost?: string) {
    this.connectionParams = connectionParams;

    // Convert HTTP/HTTPS URL to WS/WSS WebSocket URL
    if (websocketHost) {
      const wsProtocol = websocketHost.includes('https') ? 'wss:' : 'ws:';
      const wsUrl = websocketHost.replace(/^https?:/, wsProtocol);
      this.websocketURL = `${wsUrl}/cable`;
    } else {
      this.websocketURL = undefined;
    }

    // Criar consumer ActionCable
    this.consumer = createConsumer(this.websocketURL || '/cable');

    this.connect();
  }

  /**
   * Conectar ao canal WebSocket
   */
  protected connect(): void {
    try {
      this.subscription = this.consumer.subscriptions.create(
        {
          channel: this.connectionParams.channel,
          pubsub_token: this.connectionParams.pubsub_token,
          user_id: this.connectionParams.user_id,
        },
        {
          // Receber mensagens do WebSocket
          received: (data: unknown) => this.onReceived(data as WebSocketEvent),

          // Conectado com sucesso
          connected: () => {
            const wasReconnecting = this.reconnectAttempts > 0;
            BaseActionCableConnector.isDisconnected = false;
            this.reconnectAttempts = 0;
            this.onConnected();
            this.startPresenceInterval();
            this.clearReconnectTimer();
            if (wasReconnecting) {
              this.onReconnected();
            }
          },

          // Desconectado
          disconnected: () => {
            BaseActionCableConnector.isDisconnected = true;
            this.onDisconnected();
            this.stopPresenceInterval();
            this.initReconnectTimer();
          },

          // Note: 'rejected' callback não é suportado na tipagem do ActionCable
          // mas pode ser chamado em runtime. Implementar manualmente se necessário.
        },
      );
    } catch (error) {
      console.error('❌ Erro ao criar subscription:', error);
      this.initReconnectTimer();
    }
  }

  /**
   * Verificar se o evento é válido para este cliente
   */
  protected isAValidEvent(_data: unknown): boolean {
    // In single-tenant mode, all events are valid
    return true;
  }

  /**
   * Processar mensagem recebida do WebSocket
   */
  protected onReceived = (payload: WebSocketEvent): void => {
    const { event, data } = payload || {};

    if (this.events[event] && typeof this.events[event] === 'function') {
      try {
        this.events[event](data);
      } catch (error) {
        console.error(`❌ Erro ao processar evento ${event}:`, error);
      }
    }
  };

  /**
   * Callback quando conectado
   */
  protected onConnected(): void {
    // Implementação padrão - pode ser sobrescrita
  }

  /**
   * Callback quando desconectado
   */
  protected onDisconnected(): void {
    // Implementação padrão - pode ser sobrescrita
  }

  /**
   * Callback quando reconectado
   */
  protected onReconnected(): void {
    // Implementação padrão - pode ser sobrescrita
  }

  /**
   * Callback quando conexão rejeitada
   */
  protected onRejected(): void {
    // Implementação padrão - pode ser sobrescrita
  }

  /**
   * Tentar reconectar ativamente ao WebSocket.
   * Remove a subscription stale e chama connect() para criar nova.
   * Usa backoff exponencial: 1s → 2s → 4s → 8s → ... → 30s (teto).
   */
  protected attemptReconnect(): void {
    if (!this.consumer) {
      console.warn('⚠️ Consumer não disponível');
      return;
    }

    // Incrementar tentativas ANTES do check de visibilidade para que
    // o backoff funcione mesmo com tab em background (evita loop de 1s).
    this.reconnectAttempts += 1;

    // Não tentar reconectar com tab oculta — agendar para quando voltar
    if (typeof document !== 'undefined' && document.hidden) {
      this.initReconnectTimer();
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`❌ WebSocket: desistiu após ${MAX_RECONNECT_ATTEMPTS} tentativas de reconexão`);
      return;
    }

    console.info(`🔄 WebSocket: tentativa de reconexão ${this.reconnectAttempts}...`);

    // Remover subscription antiga antes de criar nova
    if (this.subscription) {
      try {
        this.subscription.unsubscribe();
      } catch {
        // Ignorar erros ao remover subscription stale
      }
      this.subscription = null;
    }

    // Reconectar ativamente
    this.connect();
  }

  /**
   * Verificar status e decidir próxima ação.
   * Chamado pelo timer de reconexão.
   */
  protected checkConnection(): void {
    if (!BaseActionCableConnector.isDisconnected) {
      // Conexão restaurada — nada a fazer (onReconnected já foi chamado
      // pelo callback connected: via wasReconnecting)
      this.clearReconnectTimer();
      return;
    }

    // Ainda desconectado — tentar reconexão ativa
    this.attemptReconnect();
  }

  /**
   * Agendar tentativa de reconexão com backoff exponencial.
   * Intervalo dobra a cada tentativa: 1s → 2s → 4s → ... → 30s (teto).
   */
  protected initReconnectTimer(): void {
    this.clearReconnectTimer();

    const backoffInterval = Math.min(
      INITIAL_RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_INTERVAL,
    );

    this.reconnectTimer = setTimeout(() => {
      this.checkConnection();
    }, backoffInterval);
  }

  /**
   * Limpar timer de reconexão
   */
  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Iniciar interval de presença
   */
  protected startPresenceInterval(): void {
    this.stopPresenceInterval();

    const updatePresence = () => {
      if (this.subscription && !BaseActionCableConnector.isDisconnected) {
        this.perform('update_presence');
      }

      this.presenceTimer = setTimeout(updatePresence, PRESENCE_INTERVAL);
    };

    // Primeira atualização
    updatePresence();
  }

  /**
   * Parar interval de presença
   */
  protected stopPresenceInterval(): void {
    if (this.presenceTimer) {
      clearTimeout(this.presenceTimer);
      this.presenceTimer = null;
    }
  }

  /**
   * Registrar event handler
   */
  public onEvent(event: string, handler: (data: unknown) => void): void {
    this.events[event] = handler;
  }

  /**
   * Remover event handler
   */
  public offEvent(event: string): void {
    delete this.events[event];
  }

  /**
   * Enviar ação para o servidor
   */
  public perform(action: string, data?: unknown): void {
    if (this.subscription) {
      this.subscription.perform(action, data);
    } else {
      console.warn('⚠️ Não é possível performar action - subscription não disponível');
    }
  }

  /**
   * Verificar se está conectado
   */
  public isConnected(): boolean {
    return !!this.subscription && !BaseActionCableConnector.isDisconnected;
  }

  /**
   * Desconectar do WebSocket
   */
  public disconnect(): void {
    this.clearReconnectTimer();
    this.stopPresenceInterval();

    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }

    if (this.consumer) {
      this.consumer.disconnect();
    }

    BaseActionCableConnector.isDisconnected = true;
  }

  /**
   * Cleanup na destruição
   */
  public destroy(): void {
    this.disconnect();
    this.events = {};
  }
}

export default BaseActionCableConnector;
