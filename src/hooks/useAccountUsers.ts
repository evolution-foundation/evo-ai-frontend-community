import { useState, useEffect, useCallback } from 'react';
import { usersService } from '@/services/users';
import type { User } from '@/types/users';
import { fetchAllPages } from '@/utils/apiHelpers';

export function useAccountUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const userData = await fetchAllPages(page => usersService.getUsers({ page }));
      setUsers(userData);
    } catch (err) {
      console.error('Error loading account users:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
