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

  // Antepõe a assinatura (em negrito) ao início do conteúdo da mensagem se estiver habilitada
  const appendSignatureIfEnabled = useCallback(
    (content: string) => {
      if (!isSignatureEnabled) {
        return content;
      }

      const signature = getSignature();
      if (!signature) {
        return content;
      }

      // Ignora um "*" ou "<p><strong>" já presentes na frente, senão o guard
      // nunca reconhece um conteúdo que já recebeu o prefixo antes.
      const contentWithoutLeadingMarkup = content.trim().replace(/^(<p>)?(<strong>|\*)/i, '');
      if (contentWithoutLeadingMarkup.startsWith(signature.trim())) {
        return content;
      }

      const isHtml = /<[a-z][\s\S]*>/i.test(content);
      if (isHtml) {
        // Injeta dentro do primeiro <p> (se houver) pra ficar na mesma linha
        // da mensagem, em vez de um parágrafo próprio acima dela.
        const openingParagraphMatch = content.match(/^\s*<p[^>]*>/i);
        const prefix = `<strong>${signature}:</strong> `;
        if (openingParagraphMatch) {
          const tagLength = openingParagraphMatch[0].length;
          return content.slice(0, tagLength) + prefix + content.slice(tagLength);
        }
        return prefix + content;
      }

      return `*${signature}:* ${content}`;
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
