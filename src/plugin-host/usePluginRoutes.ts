import { useSyncExternalStore } from 'react';
import { getRoutes, subscribe } from './registry';
import type { PluginRoute, RouteNamespace } from './types';

export function usePluginRoutes(namespace?: RouteNamespace): PluginRoute[] {
  return useSyncExternalStore(
    subscribe,
    () => getRoutes(namespace),
    () => getRoutes(namespace),
  );
}
