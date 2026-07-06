import { useSyncExternalStore, type ReactNode } from 'react';
import { getSlotContributions, subscribe } from './registry';
import { PluginErrorBoundary } from './PluginErrorBoundary';
import { usePluginRuntimeContext } from './runtimeContext';
import type { SlotId } from './types';

interface PluginSlotProps {
  id: SlotId;
  fallback?: ReactNode;
  componentProps?: Record<string, unknown>;
}

export function PluginSlot({ id, fallback = null, componentProps }: PluginSlotProps) {
  const contributions = useSyncExternalStore(
    subscribe,
    () => getSlotContributions(id),
    () => getSlotContributions(id),
  );
  const runtimeContext = usePluginRuntimeContext();

  if (contributions.length === 0) return <>{fallback}</>;

  return (
    <>
      {contributions.map(contribution => {
        const Component = contribution.component;
        return (
          <PluginErrorBoundary
            key={contribution.id}
            pluginId={contribution.id}
            fallback={contribution.fallback}
          >
            <Component {...(componentProps ?? {})} runtimeContext={runtimeContext} />
          </PluginErrorBoundary>
        );
      })}
    </>
  );
}
