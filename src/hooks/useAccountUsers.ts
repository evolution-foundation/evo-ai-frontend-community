import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { usersService } from '@/services/users';
import type { User } from '@/types/users';

export function useAccountUsers() {
  const { t: tUi } = useUiTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await usersService.getUsers();

      if (response.data) {
        // Normalizar dados
        const userData = Array.isArray(response.data) ? response.data : [];

        setUsers(userData);
      }
    } catch (err) {
      console.error('Error loading account users:', err);
      setError(err instanceof Error ? err.message : tUi("interface:useaccountusers.couldNotLoadUsers"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tUi]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,
    reload: loadUsers,
  };
}
