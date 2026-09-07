import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import usersService from '@/services/users/usersService';
import { toast } from 'sonner';
import type { User } from '@/types/users';

export function useUserAvailability() {
  const { t: tUi } = useUiTranslation();
  const [updating, setUpdating] = useState<string[]>([]);

  const updateAvailability = useCallback(
    async (userId: string, availability: 'online' | 'busy' | 'offline'): Promise<User | null> => {
      setUpdating(prev => [...prev, userId]);

      try {
        const response = await usersService.updateAvailability(userId, availability);
        return response;
      } catch (error) {
        console.error('Erro ao atualizar disponibilidade:', error);
        toast.error(tUi("interface:useuseravailability.couldNotUpdateAvailabilityStatus"));
        return null;
      } finally {
        setUpdating(prev => prev.filter(id => id !== userId));
      }
    },
    [tUi],
  );

  const isUpdating = useCallback((userId: string) => updating.includes(userId), [updating]);

  return {
    updateAvailability,
    isUpdating,
  };
}

export const availabilityOptions = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'busy', get label() { return i18n.t("users:details.status.busy"); }, color: 'bg-yellow-500' },
  { value: 'offline', label: 'Offline', color: 'bg-gray-500' },
] as const;

export function getAvailabilityConfig(status: string) {
  return availabilityOptions.find(option => option.value === status) || availabilityOptions[2];
}
