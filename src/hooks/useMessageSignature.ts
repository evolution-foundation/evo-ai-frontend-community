import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar o estado de ativar/desativar assinatura de mensagens
 * Similar ao useUISettings do Vue
 */
export const useMessageSignature = () => {
  const { user } = useAuth();
  const [isSignatureEnabled, setIsSignatureEnabled] = useState<boolean>(false);

  // Carregar preferência do localStorage ao montar
  useEffect(() => {
    const savedPreference = localStorage.getItem('message_signature_enabled');
    if (savedPreference !== null) {
      setIsSignatureEnabled(savedPreference === 'true');
    }
  }, []);

  // Toggle da assinatura
  const toggleSignature = useCallback(() => {
    setIsSignatureEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('message_signature_enabled', String(newValue));
      return newValue;
    });
  }, []);

  // Obter assinatura do usuário
  const getSignature = useCallback(() => {
    const signature = user?.message_signature || '';
    return signature;
  }, [user]);

  // Anexar assinatura ao conteúdo da mensagem se estiver habilitada.
  // Email mantém o formato tradicional (assinatura no final, texto puro).
  // Canais de chat usam o mesmo padrão do agente de IA: negrito, dois
  // pontos, no início da mensagem.
  const appendSignatureIfEnabled = useCallback(
    (content: string, isEmail = false) => {
      if (!isSignatureEnabled) {
        return content;
      }

      const signature = getSignature();
      if (!signature) {
        return content;
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(content);

      if (isEmail) {
        if (content.trim().endsWith(signature.trim())) {
          return content;
        }

        return isHtml ? `${content}<p><br></p><p>${signature}</p>` : `${content}\n\n${signature}`;
      }

      const htmlPrefix = `<p><strong>${signature}:</strong></p>`;
      const plainPrefix = `*${signature}:*\n`;
      if (content.startsWith(isHtml ? htmlPrefix : plainPrefix)) {
        return content;
      }

      return isHtml ? `${htmlPrefix}${content}` : `${plainPrefix}${content}`;
    },
    [isSignatureEnabled, getSignature],
  );

  return {
    isSignatureEnabled,
    toggleSignature,
    getSignature,
    appendSignatureIfEnabled,
    hasSignature: !!user?.message_signature,
  };
};
