import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ChatActionCableConnector,
  ChatEventHandlers,
} from '@/services/chat/websocket/ChatActionCableConnector';
import { ConnectionParams } from '@/services/chat/websocket/BaseActionCableConnector';

export interface UseWebSocketOptions {
  enabled?: boolean;
  websocketHost?: string;
  handlers?: ChatEventHandlers;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  connector: ChatActionCableConnector | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendTypingOn: (conversationId: string) => void;
  sendTypingOff: (conversationId: string) => void;
  updateHandlers: (handlers: Partial<ChatEventHandlers>) => void;
  reconnect: () => void;
}

/**
 * Hook para gerenciar conexão WebSocket com Evolution
 *
 * @param userId - ID do usuário atual
 * @param pubsubToken - Token de autenticação WebSocket
 * @param options - Opções de configuração
 * @returns Objeto com connector e métodos de controle
 *
 * @example
 * ```typescript
 * const { connector, isConnected, sendTypingOn } = useWebSocket(userId, token, {
 *   handlers: {
 *     onMessageCreated: (data) => console.log('Nova mensagem:', data),
 *     onTypingOn: (data) => console.log('Usuário digitando:', data)
 *   }
 * });
 * ```
 */
export const useWebSocket = (
  userId: string,
  pubsubToken: string,
  options: UseWebSocketOptions = {},
): UseWebSocketReturn => {
  const { enabled = true, websocketHost, handlers = {}, autoConnect = true } = options;

  const connectorRef = useRef<ChatActionCableConnector | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef(handlers);

  // Atualizar handlers ref quando mudarem
  useEffect(() => {
    handlersRef.current = handlers;
    if (connectorRef.current) {
      connectorRef.current.updateHandlers(handlers);
    }
  }, [handlers]);

  /**
   * Conectar ao WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled || !userId || !pubsubToken) {
      console.warn('⚠️ WebSocket não pode conectar - parâmetros insuficientes:', {
        enabled,
        userId: !!userId,
        pubsubToken: !!pubsubToken,
      });
      return;
    }

    // Desconectar conexão anterior se existir
    if (connectorRef.current) {
      connectorRef.current.disconnect();
    }

    try {
      const connectionParams: ConnectionParams = {
        channel: 'RoomChannel', // Canal padrão do Evolution
        pubsub_token: pubsubToken,
        user_id: userId,
      };

      // Criar novo connector
      connectorRef.current = new ChatActionCableConnector(connectionParams, websocketHost, {
        ...handlersRef.current,
        // Adicionar handler para atualizar estado de conexão
        onMessageCreated: (data: any) => {
          setIsConnected(true);
          handlersRef.current.onMessageCreated?.(data);
        },
      });

      // Sobrescrever callbacks de conexão para atualizar estado
      const originalOnConnected = connectorRef.current['onConnected'].bind(connectorRef.current);
      const originalOnDisconnected = connectorRef.current['onDisconnected'].bind(
        connectorRef.current,
      );

      connectorRef.current['onConnected'] = () => {
        setIsConnected(true);
        originalOnConnected();
      };

      connectorRef.current['onDisconnected'] = () => {
        setIsConnected(false);
        originalOnDisconnected();
      };

      // Override onReconnected to update state — triggers refetch in consumers
      const originalOnReconnected = connectorRef.current['onReconnected'].bind(
        connectorRef.current,
      );
      connectorRef.current['onReconnected'] = () => {
        setIsConnected(true);
        originalOnReconnected();
      };
    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      setIsConnected(false);
    }
  }, [enabled, userId, pubsubToken, websocketHost]);

  /**
   * Desconectar do WebSocket
   */
  const disconnect = useCallback(() => {
    if (connectorRef.current) {
      connectorRef.current.disconnect();
      connectorRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Reconectar WebSocket
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000); // Aguardar 1 segundo antes de reconectar
  }, [disconnect, connect]);

  /**
   * Enviar indicação de digitação
   */
  const sendTypingOn = useCallback(
    (conversationId: string) => {
      if (connectorRef.current && isConnected) {
        connectorRef.current.sendTypingOn(conversationId);
      } else {
        console.warn('⚠️ Não é possível enviar typing_on - WebSocket não conectado');
      }
    },
    [isConnected],
  );

  /**
   * Enviar parada de digitação
   */
  const sendTypingOff = useCallback(
    (conversationId: string) => {
      if (connectorRef.current && isConnected) {
        connectorRef.current.sendTypingOff(conversationId);
      } else {
        console.warn('⚠️ Não é possível enviar typing_off - WebSocket não conectado');
      }
    },
    [isConnected],
  );

  /**
   * Atualizar handlers
   */
  const updateHandlers = useCallback((newHandlers: Partial<ChatEventHandlers>) => {
    handlersRef.current = { ...handlersRef.current, ...newHandlers };
    if (connectorRef.current) {
      connectorRef.current.updateHandlers(newHandlers);
    }
  }, []);

  /**
   * Conectar automaticamente quando parâmetros estiverem disponíveis
   */
  useEffect(() => {
    if (autoConnect && enabled && userId && pubsubToken) {
      connect();
    }

    // Cleanup na desmontagem
    return () => {
      if (connectorRef.current) {
        connectorRef.current.destroy();
        connectorRef.current = null;
      }
    };
  }, [autoConnect, enabled, userId, pubsubToken, connect]);

  /**
   * Verificar conexão periodicamente
   */
  useEffect(() => {
    if (!enabled || !connectorRef.current) return;

    const checkConnectionInterval = setInterval(() => {
      const actuallyConnected = connectorRef.current?.isConnected() || false;
      if (actuallyConnected !== isConnected) {
        setIsConnected(actuallyConnected);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(checkConnectionInterval);
  }, [enabled, isConnected]);

  /**
   * Reconectar quando a aba ganha foco (usuário voltou)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && connectorRef.current && !isConnected) {
        setTimeout(() => {
          if (connectorRef.current && !connectorRef.current.isConnected()) {
            reconnect();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, isConnected, reconnect]);

  useEffect(() => {
    const handleAuthLost = () => {
      disconnect();
    };

    window.addEventListener('evolution:auth-lost', handleAuthLost);
    return () => {
      window.removeEventListener('evolution:auth-lost', handleAuthLost);
    };
  }, [disconnect]);

  return {
    connector: connectorRef.current,
    isConnected,
    connect,
    disconnect,
    sendTypingOn,
    sendTypingOff,
    updateHandlers,
    reconnect,
  };
};

/**
 * Hook simplificado para apenas verificar status de conexão
 */
export const useWebSocketStatus = (): { isConnected: boolean } => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Verificar se existe alguma conexão WebSocket ativa
    const checkConnection = () => {
      // Implementar verificação global se necessário
      setIsConnected(false); // Placeholder
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  return { isConnected };
};

export default useWebSocket;
