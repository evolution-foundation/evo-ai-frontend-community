import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { bootAllPlugins, getProviders, subscribe } from './registry';
import { PluginErrorBoundary } from './PluginErrorBoundary';
import { PluginRuntimeContextProvider } from './runtimeContext';

interface PluginHostProviderProps {
  children: ReactNode;
}

export function PluginHostProvider({ children }: PluginHostProviderProps) {
  const providers = useSyncExternalStore(
    subscribe,
    () => getProviders(),
    () => getProviders(),
  );

  useEffect(() => {
    bootAllPlugins();
  }, []);

  const composed = providers.reduceRight<ReactNode>((acc, Provider, index) => {
    return (
      <PluginErrorBoundary pluginId={`provider:${index}`} fallback={acc}>
        <Provider>{acc}</Provider>
      </PluginErrorBoundary>
    );
  }, children);

  return <PluginRuntimeContextProvider>{composed}</PluginRuntimeContextProvider>;
}
