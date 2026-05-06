import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/core';
import { setupService } from '@/services/setup/setupService';
import { initClarity } from '@/utils/clarityUtils';

export interface GlobalConfig {
  fbAppId?: string;
  fbApiVersion?: string;
  wpAppId?: string;
  wpApiVersion?: string;
  wpWhatsappConfigId?: string;
  instagramAppId?: string;
  googleOAuthClientId?: string;
  azureAppId?: string;
  // 🔒 SECURITY: Don't expose sensitive API URLs to frontend
  // Only boolean indicators to check if config exists
  hasFacebookConfig?: boolean;
  hasWhatsappConfig?: boolean;
  hasInstagramConfig?: boolean;
  hasEvolutionConfig?: boolean;
  hasEvolutionGoConfig?: boolean;
  hasTwitterConfig?: boolean;
  openaiConfigured?: boolean;
  enableAccountSignup?: boolean;
  recaptchaSiteKey?: string;
  clarityProjectId?: string;
}

interface GlobalConfigContextValue extends GlobalConfig {
  setupRequired: boolean;
  setupLoading: boolean;
}

const GlobalConfigContext = createContext<GlobalConfigContextValue>({
  setupRequired: false,
  setupLoading: true,
});

// Cache global para evitar múltiplas chamadas
let globalConfigCache: GlobalConfig | null = null;
let globalConfigPromise: Promise<GlobalConfig> | null = null;
let setupRequiredCache: boolean | null = null;

// Exportar função para reutilização (com cache)
export const fetchGlobalConfig = async (): Promise<GlobalConfig> => {
  // Se já tem cache, retorna
  if (globalConfigCache) {
    return globalConfigCache;
  }

  // Se já está carregando, retorna a promise existente
  if (globalConfigPromise) {
    return globalConfigPromise;
  }

  // Cria nova promise de carregamento
  globalConfigPromise = (async () => {
    try {
      const res = await api.get('/global_config');
      const data = (res?.data || {}) as GlobalConfig;
      globalConfigCache = data;
      return data;
    } catch (e) {
      console.error('[GlobalConfig] Failed to load from /api/v1/global_config', e);
      globalConfigCache = {};
      return {};
    } finally {
      globalConfigPromise = null;
    }
  })();

  return globalConfigPromise;
};

export const fetchSetupStatus = async (): Promise<boolean> => {
  if (setupRequiredCache !== null) {
    return setupRequiredCache;
  }

  try {
    const status = await setupService.getStatus();
    setupRequiredCache = status.status === 'inactive';
    return setupRequiredCache;
  } catch (e) {
    // Fail open to the setup wizard so a transient backend outage during
    // first boot (auth-service still warming up, migrations running, etc.)
    // doesn't strand the user on /login with no way to bootstrap.
    // The bootstrap endpoint itself rejects with AlreadyBootstrappedError
    // if setup was already completed, so this is safe for healthy installs.
    // Do not cache the failure — the next render retries.
    console.warn('[GlobalConfig] /setup/status failed, defaulting setupRequired=true', e);
    return true;
  }
};

// Listeners para notificar componentes React quando o cache é limpo
const setupCacheListeners: Set<() => void> = new Set();
const globalConfigListeners: Set<() => void> = new Set();

export const clearGlobalConfigCache = () => {
  globalConfigCache = null;
  globalConfigPromise = null;
  // Notificar listeners para re-fetch (ex.: após admin salvar uma config, os
  // booleans `hasXxxConfig` mudam e o fluxo de criação de canal precisa refletir)
  globalConfigListeners.forEach(listener => listener());
};

// Versão await-able: invalida o cache e aguarda o próximo fetch terminar.
// Usado pelo admin após salvar uma config para garantir que `hasXxxConfig`
// já está atualizado antes da UI prosseguir (sem janela de race entre o
// success toast e a próxima ação do usuário).
export const refreshGlobalConfig = async (): Promise<GlobalConfig> => {
  globalConfigCache = null;
  globalConfigPromise = null;
  const data = await fetchGlobalConfig();
  globalConfigListeners.forEach(listener => listener());
  return data;
};

export const clearSetupCache = () => {
  setupRequiredCache = null;
  // Notificar todos os listeners para re-fetch
  setupCacheListeners.forEach(listener => listener());
};

export const GlobalConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<GlobalConfig>(globalConfigCache || {});
  const [setupRequired, setSetupRequired] = useState<boolean>(setupRequiredCache ?? false);
  const [setupLoading, setSetupLoading] = useState<boolean>(setupRequiredCache === null);

  useEffect(() => {
    let mounted = true;

    const loadConfig = () => {
      Promise.all([fetchGlobalConfig(), fetchSetupStatus()]).then(([configData, isSetupRequired]) => {
        if (mounted) {
          setConfig(configData);
          setSetupRequired(isSetupRequired);
          setSetupLoading(false);
          // Initialize Clarity with backend-provided project ID
          if (configData.clarityProjectId) {
            initClarity(configData.clarityProjectId);
          }
        }
      });
    };

    loadConfig();

    // Re-fetch when setup cache is cleared (after bootstrap)
    const onCacheCleared = () => {
      if (mounted) {
        setSetupLoading(true);
        loadConfig();
      }
    };
    setupCacheListeners.add(onCacheCleared);

    // Re-fetch when global config cache is cleared (admin save invalidates it)
    const onGlobalConfigCleared = () => {
      if (mounted) loadConfig();
    };
    globalConfigListeners.add(onGlobalConfigCleared);

    return () => {
      mounted = false;
      setupCacheListeners.delete(onCacheCleared);
      globalConfigListeners.delete(onGlobalConfigCleared);
    };
  }, []);

  const value = useMemo(
    () => ({ ...config, setupRequired, setupLoading }),
    [config, setupRequired, setupLoading],
  );

  return <GlobalConfigContext.Provider value={value}>{children}</GlobalConfigContext.Provider>;
};

export const useGlobalConfig = (): GlobalConfigContextValue => useContext(GlobalConfigContext);
