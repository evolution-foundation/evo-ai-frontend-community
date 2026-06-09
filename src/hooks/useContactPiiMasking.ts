import { useMemo } from 'react';
import { useAppDataStore } from '@/store/appDataStore';
import { useCurrentUser } from '@/utils/auth';
import { isAdminRole } from '@/constants/roles';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import {
  maskPhone as maskPhoneRaw,
  maskEmail as maskEmailRaw,
  maskIdentifier as maskIdentifierRaw,
} from '@/utils/contact/maskContactPii';

interface UseContactPiiMasking {
  shouldMask: boolean;
  maskPhone: (raw: string | null | undefined) => string | null;
  maskEmail: (raw: string | null | undefined) => string | null;
  maskIdentifier: (raw: string | null | undefined) => string | null;
}

/**
 * Returns mask-aware formatters for contact PII (phone, email, identifier).
 *
 * Mascaramento ativa quando `account.settings.mask_contact_pii === true` E o
 * usuário atual NÃO é administrator. Sem role definida = tratado como não-admin
 * (defensivo). Quando inativo, `maskPhone` ainda passa pelo `formatContactPhone`
 * para manter o comportamento atual de formatação BR.
 */
export function useContactPiiMasking(): UseContactPiiMasking {
  const account = useAppDataStore(state => state.account);
  const currentUser = useCurrentUser();

  const flagEnabled = account?.settings?.mask_contact_pii === true;
  const roleKey = currentUser?.role?.key;
  const isAdmin = !!roleKey && isAdminRole(roleKey);
  const shouldMask = flagEnabled && !isAdmin;

  return useMemo(
    () => ({
      shouldMask,
      maskPhone: raw => {
        const formatted = formatContactPhone(raw);
        if (!shouldMask) return formatted;
        return maskPhoneRaw(formatted);
      },
      maskEmail: raw => {
        if (!shouldMask) return raw ?? null;
        return maskEmailRaw(raw);
      },
      maskIdentifier: raw => {
        if (!shouldMask) return raw ?? null;
        return maskIdentifierRaw(raw);
      },
    }),
    [shouldMask]
  );
}
