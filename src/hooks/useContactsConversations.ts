import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { contactsService } from '@/services/contacts';
import type { Contact } from '@/types/contacts';

interface UseContactsConversationsOptions {
  contacts: Contact[];
  enabled?: boolean;
}

/**
 * Hook para carregar conversas de múltiplos contatos de uma vez
 * Reduz chamadas de API fazendo chamadas em batches para evitar sobrecarga
 * Limita a 20 contatos por vez para evitar muitas chamadas simultâneas
 */
export function useContactsConversations({
  contacts,
  enabled = true,
}: UseContactsConversationsOptions) {
  const { t: tUi } = useUiTranslation();
  const [conversationsMap, setConversationsMap] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Carregar conversas de todos os contatos em paralelo
  const contactsKey = useMemo(() => contacts.map(c => c.id).join(','), [contacts]);

  useEffect(() => {
    if (!enabled || contacts.length === 0) {
      setConversationsMap(new Map());
      return;
    }

    // Limitar a 20 contatos para evitar muitas chamadas
    // Se houver mais contatos, carregar apenas os primeiros 20
    const MAX_CONTACTS = 20;
    const contactsToLoad = contacts.slice(0, MAX_CONTACTS);

    const loadConversations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Carregar conversas de todos os contatos em paralelo, mas em batches para evitar sobrecarga
        const BATCH_SIZE = 5; // Processar 5 contatos por vez para evitar sobrecarga
        const batches: Contact[][] = [];

        for (let i = 0; i < contactsToLoad.length; i += BATCH_SIZE) {
          batches.push(contactsToLoad.slice(i, i + BATCH_SIZE));
        }

        const newMap = new Map<string, string[]>();

        // Processar batches sequencialmente, mas contatos dentro do batch em paralelo
        for (const batch of batches) {
          const conversationPromises = batch.map(async (contact: Contact) => {
            try {
              const response = await contactsService.getContactConversations(contact.id);
              const conversations = response.data || [];
              return {
                contactId: contact.id,
                conversationIds: conversations.map(c => String(c.id)),
              };
            } catch (err) {
              console.error(`Error loading conversations for contact ${contact.id}:`, err);
              return {
                contactId: contact.id,
                conversationIds: [],
              };
            }
          });

          const results = await Promise.all(conversationPromises);
          results.forEach(result => {
            newMap.set(result.contactId, result.conversationIds);
          });

          // Pequeno delay entre batches para evitar sobrecarga
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        setConversationsMap(newMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(tUi("interface:usecontactsconversations.couldNotLoadContactConversations")));
        console.error('Error loading contacts conversations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsKey, enabled, tUi]);

  // Função helper para obter conversas de um contato específico
  const getContactConversationIds = useMemo(() => {
    return (contactId: string): string[] => {
      return conversationsMap.get(contactId) || [];
    };
  }, [conversationsMap]);

  return {
    conversationsMap,
    isLoading,
    error,
    getContactConversationIds,
  };
}
