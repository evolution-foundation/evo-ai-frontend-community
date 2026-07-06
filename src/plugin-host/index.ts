export type {
  PluginManifest,
  PluginSlotContribution,
  PluginSlotComponentProps,
  PluginRoute,
  PluginNavItem,
  PluginProvider,
  PluginGuard,
  PluginGuardArgs,
  PluginRuntimeContextDescriptor,
  RuntimeContextValue,
  RouteNamespace,
  SlotId,
} from './types';
export { RUNTIME_CONTEXT_CHANGED_EVENT } from './types';

export {
  registerPlugin,
  getPlugins,
  getRegisteredPlugins,
  getSlotContributions,
  getRoutes,
  getProviders,
  getGuards,
  getRuntimeContextDescriptor,
  bootAllPlugins,
  subscribe,
} from './registry';

// `__resetPluginHostForTests` lives in `./test-utils` and is NOT
// re-exported here — it is internal-only and intended for plugin-host
// specs that need to reset registry state between cases.

export { PluginHostProvider } from './PluginHostProvider';
export { PluginSlot } from './PluginSlot';
export { PluginRoutes } from './PluginRoutes';
export { usePluginRoutes } from './usePluginRoutes';
export { PluginErrorBoundary } from './PluginErrorBoundary';

export {
  PluginRuntimeContextProvider,
  usePluginRuntimeContext,
  onRuntimeContextChanged,
} from './runtimeContext';

export { evaluateRouteAccess } from './guards';

export type { SetupHostContextValue, SetupCredentials } from './types';
