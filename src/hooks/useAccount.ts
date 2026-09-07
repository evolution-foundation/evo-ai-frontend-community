import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { accountService } from '../services/account/accountService';
import type { Account, AccountFeatures } from '@/types/settings';
import { useAuthStore } from '@/store/authStore';

interface UseAccountReturn {
  account: Account | null;
  loading: boolean;
  error: string | null;

  // Feature checking
  isFeatureEnabled: (featureName: keyof AccountFeatures) => boolean;
  hasAllFeatures: (featureNames: (keyof AccountFeatures)[]) => boolean;
  hasAnyFeature: (featureNames: (keyof AccountFeatures)[]) => boolean;
  enabledFeatures: string[];
  disabledFeatures: string[];

  // Account operations
  updateAccount: (data: Partial<Account>) => Promise<void>;
  refreshAccount: () => Promise<void>;
}

export function useAccount(): UseAccountReturn {
  const { t: tUi } = useUiTranslation();
  const currentUser = useAuthStore(state => state.currentUser);

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFeatureEnabled = (featureName: keyof AccountFeatures): boolean => {
    if (!account?.features) return false;
    if (featureName === 'evolution_v4') return true;
    return account.features[featureName] || false;
  };

  const hasAllFeatures = (featureNames: (keyof AccountFeatures)[]): boolean => {
    return featureNames.every(feature => isFeatureEnabled(feature));
  };

  const hasAnyFeature = (featureNames: (keyof AccountFeatures)[]): boolean => {
    return featureNames.some(feature => isFeatureEnabled(feature));
  };

  const enabledFeatures = useMemo(() => {
    if (!account?.features) return [];
    return Object.entries(account.features)
      .filter(([_, enabled]) => enabled === true)
      .map(([feature, _]) => feature);
  }, [account?.features]);

  const disabledFeatures = useMemo(() => {
    if (!account?.features) return [];
    return Object.entries(account.features)
      .filter(([_, enabled]) => enabled === false)
      .map(([feature, _]) => feature);
  }, [account?.features]);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountService.getAccount();
      setAccount(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : tUi("interface:useaccount.couldNotLoadAccount");
      setError(errorMessage);
      console.error('Erro ao carregar conta:', err);
    } finally {
      setLoading(false);
    }
  }, [tUi]);

  const updateAccount = async (data: Partial<Account>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedAccount = await accountService.updateAccount(data);
      setAccount(updatedAccount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : tUi("interface:useaccount.couldNotUpdateAccount");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshAccount = async () => {
    await fetchAccount();
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchAccount();
    }
  }, [currentUser?.id, fetchAccount]);

  return {
    account,
    loading,
    error,
    isFeatureEnabled,
    hasAllFeatures,
    hasAnyFeature,
    enabledFeatures,
    disabledFeatures,
    updateAccount,
    refreshAccount,
  };
}

// Hook for feature checking without loading full account (requires account to be loaded elsewhere)
export function useFeatures(account: Account | null) {
  const isFeatureEnabled = (featureName: keyof AccountFeatures): boolean => {
    if (!account?.features) return false;

    // Always enable V4 interface by default
    if (featureName === 'evolution_v4') return true;

    return account.features[featureName] || false;
  };

  const hasAllFeatures = (featureNames: (keyof AccountFeatures)[]): boolean => {
    return featureNames.every(feature => isFeatureEnabled(feature));
  };

  const hasAnyFeature = (featureNames: (keyof AccountFeatures)[]): boolean => {
    return featureNames.some(feature => isFeatureEnabled(feature));
  };

  return {
    isFeatureEnabled,
    hasAllFeatures,
    hasAnyFeature,
  };
}

