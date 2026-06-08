import { BaseActionCableConnector, ConnectionParams } from './BaseActionCableConnector';
import { toast } from 'sonner';

export interface ChatEventHandlers {
  onMessageCreated?: (data: MessageCreatedEvent) => void;
  onMessageUpdated?: (data: MessageUpdatedEvent) => void;
  onConversationCreated?: (data: ConversationCreatedEvent) => void;
  onConversationUpdated?: (data: ConversationUpdatedEvent) => void;
  onConversationStatusChanged?: (data: ConversationStatusChangedEvent) => void;
  onAssigneeChanged?: (data: AssigneeChangedEvent) => void;
  onTypingOn?: (data: TypingEvent) => void;
  onTypingOff?: (data: TypingEvent) => void;
  onPresenceUpdate?: (data: PresenceUpdateEvent) => void;
  onContactUpdated?: (data: ContactUpdatedEvent) => void;
  onConversationRead?: (data: ConversationReadEvent) => void;
  onNotificationCreated?: (data: unknown) => void;
  onNotificationUpdated?: (data: unknown) => void;
  onNotificationDeleted?: (data: unknown) => void;
  onMacroExecutionCompleted?: (data: MacroExecutionCompletedEvent) => void;
}

export interface MacroExecutionCompletedEvent {
  id: string;
  macro_id: string;
  macro_name: string;
  conversation_id: string;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  actions_result?: Array<{ action: string; status: string; error?: string }>;
}

// Event types baseados no ActionCable do Evolution
export interface MessageCreatedEvent {
  id: string;
  content: string;
  message_type: string; // 'incoming' | 'outgoing' | 'activity' | 'template'
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  private: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  source_id: string | null;
  content_type:
    | 'text'
    | 'input_email'
    | 'cards'
    | 'form'
    | 'article'
    | 'image'
    | 'file'
    | 'audio'
    | 'video';
  content_attributes: Record<string, unknown>;
  sender_type: 'contact' | 'agent_bot' | 'agent';
  sender_id: string;
  conversation_id: string;
  conversation: {
    id: string;
    last_activity_at: string;
  };
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
    type: 'contact' | 'agent_bot' | 'agent';
  };
  account_id: string;
  /** ID temporário do frontend; backend devolve no WS para substituir a mensagem pending */
  echo_id?: string;
  attachments?: Array<{
    id: string;
    message_id: string;
    file_type: number | string; // 0=image, 1=audio, 2=video, 3=file, 4=location
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
    transcribed_text?: string; // Audio transcription text
  }>;
}

export interface MessageUpdatedEvent {
  id: string;
  content: string;
  message_type: string; // 'incoming' | 'outgoing' | 'activity' | 'template'
  created_at: number;
  updated_at: number;
  private: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  source_id: string | null;
  content_type:
    | 'text'
    | 'input_email'
    | 'cards'
    | 'form'
    | 'article'
    | 'image'
    | 'file'
    | 'audio'
    | 'video';
  content_attributes: Record<string, unknown>;
  sender_type: 'contact' | 'agent_bot' | 'agent';
  sender_id: string;
  conversation_id: string;
  inbox_id?: string; // ID do inbox para verificação de canal
  conversation: {
    id: string;
    last_activity_at: string;
  };
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
    type: 'contact' | 'agent_bot' | 'agent';
  };
  account_id: string;
  attachments?: Array<{
    id: string;
    message_id: string;
    file_type: number | string; // 0=image, 1=audio, 2=video, 3=file, 4=location
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
    transcribed_text?: string; // Audio transcription text
  }>;
}

/** Conversation event payload: id is canonical UUID; display_id is for UI display only (e.g. #12345). */
export interface ConversationCreatedEvent {
  id: string; // UUID
  display_id?: string | number; // Display number only
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  account_id: string;
  inbox_id: string;
  assignee_id: string | null;
  team_id: string | null;
  meta: {
    sender: {
      id: string;
      name: string;
      email?: string;
      phone_number?: string;
      avatar_url?: string;
    };
    channel?: string;
    provider?: string;
    provider_connection?: {
      connection?: string;
      error?: string;
      qr_data_url?: string;
    };
    assignee: {
      id: string;
      name: string;
    } | null;
    team: {
      id: string;
      name: string;
    } | null;
    hmac_verified: boolean;
  };
  labels: string[]; // Evolution usa string[] para labels
  unread_count: number;
  additional_attributes?: Record<string, unknown>;
  custom_attributes?: Record<string, unknown>;
  priority?: string | null;
}

/** Conversation event payload: id is canonical UUID; display_id is for UI display only. */
export interface ConversationUpdatedEvent {
  id: string; // UUID
  display_id?: string | number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  account_id: string;
  inbox_id: string;
  assignee_id: string | null;
  team_id: string | null;
  meta: {
    sender: {
      id: string;
      name: string;
      email?: string;
      phone_number?: string;
      avatar_url?: string;
    };
    channel?: string;
    provider?: string;
    provider_connection?: {
      connection?: string;
      error?: string;
      qr_data_url?: string;
    };
    assignee: {
      id: string;
      name: string;
      avatar_url?: string | null;
      availability_status?: string;
    } | null;
    team: {
      id: string;
      name: string;
    } | null;
    hmac_verified: boolean;
  };
  labels: string[];
  unread_count: number;
  additional_attributes?: Record<string, unknown>;
  custom_attributes?: Record<string, unknown>;
  priority?: string | null;
  can_reply?: boolean;
  channel?: string;
  snoozed_until?: string | null;
  first_reply_created_at?: string | null;
  contact_last_seen_at?: string | null;
  agent_last_seen_at?: string | null;
  waiting_since?: number | null;
  /** Última mensagem (não-activity) para preview na lista; backend envia em push_data.messages[0] */
  messages?: Array<{
    id: string;
    content?: string;
    message_type?: number;
    created_at?: number | string;
    processed_message_content?: string;
    sender?: { id: string; name: string; type?: string };
  }>;
}

export interface ConversationStatusChangedEvent {
  id: string;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  account_id: string;
  updated_at: string;
}

export interface AssigneeChangedEvent {
  id: string;
  assignee_id: string | null;
  account_id: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  } | null;
}

export interface TypingEvent {
  conversation: {
    id: string;
  };
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  account_id: string;
}

export interface PresenceUpdateEvent {
  account_id: string;
  contacts: Array<{
    id: string;
    availability_status: 'online' | 'offline';
  }>;
  users: Array<{
    id: string;
    availability_status: 'online' | 'offline' | 'busy';
  }>;
}

export interface ContactUpdatedEvent {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  account_id: string;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
}

export interface ConversationReadEvent {
  id: string;
  account_id: string;
  unread_count: number;
}

/**
 * ChatActionCableConnector
 * Conector específico para eventos de chat do Evolution
 * Baseado em: evolution/app/javascript/dashboard/helper/actionCable.js
 */
export class ChatActionCableConnector extends BaseActionCableConnector {
  private chatEventHandlers: ChatEventHandlers = {};
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    connectionParams: ConnectionParams,
    websocketHost?: string,
    handlers?: ChatEventHandlers,
  ) {
    super(connectionParams, websocketHost);

    if (handlers) {
      this.chatEventHandlers = handlers;
    }

    this.setupChatEvents();
  }

  /**
   * Configurar event handlers específicos do chat
   */
  private setupChatEvents(): void {
    // Eventos principais de mensagens
    this.onEvent('message.created', this.onMessageCreated);
    this.onEvent('message.updated', this.onMessageUpdated);

    // Eventos de conversação
    this.onEvent('conversation.created', this.onConversationCreated);
    this.onEvent('conversation.updated', this.onConversationUpdated);
    this.onEvent('conversation.status_changed', this.onConversationStatusChanged);
    this.onEvent('conversation.read', this.onConversationRead);

    // Eventos de atribuição
    this.onEvent('assignee.changed', this.onAssigneeChanged);

    // Eventos de digitação
    this.onEvent('conversation.typing_on', this.onTypingOn);
    this.onEvent('conversation.typing_off', this.onTypingOff);

    // Eventos de presença
    this.onEvent('presence.update', this.onPresenceUpdate);

    // Eventos de contato
    this.onEvent('contact.updated', this.onContactUpdated);

    // Eventos de notificação
    this.onEvent('notification.created', this.onNotificationCreated);
    this.onEvent('notification.updated', this.onNotificationUpdated);
    this.onEvent('notification.deleted', this.onNotificationDeleted);

    // Eventos de macro
    this.onEvent('macro.execution.completed', this.onMacroExecutionCompleted);

    // Eventos de sistema
    this.onEvent('user:logout', this.onUserLogout);
    this.onEvent('page:reload', this.onPageReload);
  }

  /**
   * Handler para nova mensagem criada
   */
  private onMessageCreated = (data: unknown): void => {
    const eventData = data as MessageCreatedEvent;

    // Chamar handler customizado
    this.chatEventHandlers.onMessageCreated?.(eventData);
  };

  /**
   * Handler para mensagem atualizada
   */
  private onMessageUpdated = (data: unknown): void => {
    const eventData = data as MessageUpdatedEvent;
    this.chatEventHandlers.onMessageUpdated?.(eventData);
  };

  /**
   * Handler para nova conversa criada
   */
  private onConversationCreated = (data: unknown): void => {
    const eventData = data as ConversationCreatedEvent;
    this.chatEventHandlers.onConversationCreated?.(eventData);
  };

  /**
   * Handler para conversa atualizada
   */
  private onConversationUpdated = (data: unknown): void => {
    const eventData = data as ConversationUpdatedEvent;
    this.chatEventHandlers.onConversationUpdated?.(eventData);
  };

  /**
   * Handler para mudança de status da conversa
   */
  private onConversationStatusChanged = (data: unknown): void => {
    const eventData = data as ConversationStatusChangedEvent;
    this.chatEventHandlers.onConversationStatusChanged?.(eventData);
  };

  /**
   * Handler para mudança de assignee
   */
  private onAssigneeChanged = (data: unknown): void => {
    const eventData = data as AssigneeChangedEvent;
    this.chatEventHandlers.onAssigneeChanged?.(eventData);
  };

  /**
   * Handler para notificação criada
   */
  private onNotificationCreated = (data: unknown): void => {
    // Dispatch custom event for global listeners
    window.dispatchEvent(
      new CustomEvent('evolution:notification', {
        detail: { event: 'notification.created', payload: data },
      }),
    );
    this.chatEventHandlers.onNotificationCreated?.(data);
  };

  /**
   * Handler para notificação atualizada
   */
  private onNotificationUpdated = (data: unknown): void => {
    window.dispatchEvent(
      new CustomEvent('evolution:notification', {
        detail: { event: 'notification.updated', payload: data },
      }),
    );
    this.chatEventHandlers.onNotificationUpdated?.(data);
  };

  /**
   * Handler para notificação deletada
   */
  private onNotificationDeleted = (data: unknown): void => {
    window.dispatchEvent(
      new CustomEvent('evolution:notification', {
        detail: { event: 'notification.deleted', payload: data },
      }),
    );
    this.chatEventHandlers.onNotificationDeleted?.(data);
  };

  /**
   * Handler para resultado de execução de macro
   */
  private onMacroExecutionCompleted = (data: unknown): void => {
    const eventData = data as MacroExecutionCompletedEvent;

    if (eventData.status === 'failed') {
      toast.error(
        `Macro "${eventData.macro_name}" falhou: ${eventData.error_message || 'erro desconhecido'}`,
        { duration: 8000 },
      );
    }

    this.chatEventHandlers.onMacroExecutionCompleted?.(eventData);
  };

  /**
   * Handler para início de digitação
   */
  private onTypingOn = (data: unknown): void => {
    const eventData = data as TypingEvent;

    const conversationId = eventData.conversation.id;

    // Limpar timer anterior se existir
    this.clearTypingTimer(conversationId);

    // Chamar handler customizado
    this.chatEventHandlers.onTypingOn?.(eventData);

    // Iniciar timer para auto-off após 30 segundos
    this.initTypingTimer(eventData);
  };

  /**
   * Handler para fim de digitação
   */
  private onTypingOff = (data: unknown): void => {
    const eventData = data as TypingEvent;

    const conversationId = eventData.conversation.id;
    this.clearTypingTimer(conversationId);

    this.chatEventHandlers.onTypingOff?.(eventData);
  };

  /**
   * Handler para atualização de presença
   */
  private onPresenceUpdate = (data: unknown): void => {
    const eventData = data as PresenceUpdateEvent;
    this.chatEventHandlers.onPresenceUpdate?.(eventData);
  };

  /**
   * Handler para contato atualizado
   */
  private onContactUpdated = (data: unknown): void => {
    const eventData = data as ContactUpdatedEvent;
    this.chatEventHandlers.onContactUpdated?.(eventData);
  };

  /**
   * Handler para conversa lida
   */
  private onConversationRead = (data: unknown): void => {
    const eventData = data as ConversationReadEvent;
    this.chatEventHandlers.onConversationRead?.(eventData);
  };

  /**
   * Handler para logout do usuário
   */
  private onUserLogout = (): void => {
    // Desconectar e limpar
    this.disconnect();

    // Redirecionar para login se necessário
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  /**
   * Handler para reload da página
   */
  private onPageReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  /**
   * Iniciar timer de digitação
   */
  private initTypingTimer(data: TypingEvent): void {
    const conversationId = data.conversation.id;

    // Auto-off após 30 segundos
    const timer = setTimeout(() => {
      this.onTypingOff(data);
    }, 30000);

    this.typingTimers.set(conversationId, timer);
  }

  /**
   * Limpar timer de digitação
   */
  private clearTypingTimer(conversationId: string): void {
    const timer = this.typingTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(conversationId);
    }
  }

  /**
   * Atualizar handlers de evento
   */
  public updateHandlers(handlers: Partial<ChatEventHandlers>): void {
    this.chatEventHandlers = { ...this.chatEventHandlers, ...handlers };
  }

  /**
   * Enviar indicação de digitação
   */
  public sendTypingOn(conversationId: string): void {
    this.perform('typing_on', { conversation_id: conversationId });
  }

  /**
   * Enviar parada de digitação
   */
  public sendTypingOff(conversationId: string): void {
    this.perform('typing_off', { conversation_id: conversationId });
  }

  /**
   * Callback quando reconectado
   */
  protected onReconnected(): void {
    super.onReconnected();
    toast.success('Conexão em tempo real reestabelecida', {
      description: 'Agora você receberá mensagens em tempo real novamente.',
    });
  }

  /**
   * Callback quando desconectado
   */
  protected onDisconnected(): void {
    super.onDisconnected();
    toast.warning('Conexão em tempo real perdida', {
      description: 'Tentando reconectar automaticamente...',
    });
  }

  /**
   * Cleanup na destruição
   */
  public destroy(): void {
    // Limpar todos os timers de digitação
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();

    // Chamar cleanup da classe base
    super.destroy();
  }
}

export default ChatActionCableConnector;
