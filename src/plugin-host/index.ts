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
  __resetPluginHostForTests,
} from './registry';

export { PluginHostProvider } from './PluginHostProvider';
export { PluginSlot } from './PluginSlot';
export { PluginRoutes } from './PluginRoutes';
export { usePluginRoutes } from './usePluginRoutes';
export { PluginErrorBoundary } from './PluginErrorBoundary';

export {
  PluginRuntimeContextProvider,
  usePluginRuntimeContext,
  onRuntimeContextChanged,
  emitRuntimeContextChanged,
} from './runtimeContext';

export { evaluateRouteAccess } from './guards';
