import { BaseFilter, ALL_CONVERSATION_FILTER } from '@/types/core';

// v2: o default mudou de status=open para status=all ("Todas"). Bumpar a chave
// força um reset único p/ usuários que tinham o default antigo persistido — senão
// o filtro salvo os prende no status=open e o novo default nunca se aplica.
const STORAGE_KEY = 'evoai:conversation:filters:v2';

export const saveConversationFilters = (filters: BaseFilter[]): void => {
  try {
    const storageKey = `${STORAGE_KEY}`;
    localStorage.setItem(storageKey, JSON.stringify(filters));
  } catch (error) {
    console.error('Error saving conversation filters to localStorage:', error);
  }
};

export const loadConversationFilters = (): BaseFilter[] | null => {
  try {
    const storageKey = `${STORAGE_KEY}`;
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading conversation filters from localStorage:', error);
    return null;
  }
};

export const clearConversationFilters = (): void => {
  try {
    const storageKey = `${STORAGE_KEY}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error clearing conversation filters from localStorage:', error);
  }
};

export const getDefaultFilter = (): BaseFilter[] => {
  // Visão padrão ao abrir = todos os status (status=all; nenhum chip marcado).
  return [ALL_CONVERSATION_FILTER];
};
