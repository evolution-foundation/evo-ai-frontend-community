/**
 * Utilitários de autenticação e autorização
 */

import { useAuth } from '@/contexts/AuthContext';
import { UserResponse } from '@/types/auth';
import { ALL_ROLE_KEYS } from '@/constants/roles';

/**
 * Hook para verificar se o usuário tem uma role válida em alguma conta
 */
export const useHasValidRole = (): boolean => {
  const { user } = useAuth();

  if (!user) return false;

  // In single-tenant mode, check user's role directly
  return !!user.role && (ALL_ROLE_KEYS as readonly string[]).includes(user.role.key);
};

/**
 * Hook para obter os dados do usuário atual
 */
export const useCurrentUser = (): UserResponse | null => {
  const { user } = useAuth();
  return user;
};

/**
 * Verifica se o usuário tem acesso a uma funcionalidade específica
 */
export const useHasFeatureAccess = (feature: string): boolean => {
  const hasValidRole = useHasValidRole();

  // Aqui você pode implementar lógica específica por feature
  // Por exemplo, verificar permissões específicas por conta
  switch (feature) {
    case 'segments':
      return hasValidRole; // Por enquanto, qualquer role válida pode acessar segmentos
    default:
      return hasValidRole;
  }
};
