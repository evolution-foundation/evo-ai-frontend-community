import type { ComponentType, ReactNode } from 'react';

export type SlotId =
  | 'app.providers'
  | 'header.left'
  | 'header.right'
  | 'sidebar.afterMain'
  | 'admin.nav'
  | 'admin.routes'
  | 'settings.sections'
  | 'dashboard.widgets'
  | 'notifications.banner';

export type RouteNamespace = 'admin' | 'customer' | 'public';

export type RuntimeContextValue = unknown;

export interface PluginSlotComponentProps {
  runtimeContext: RuntimeContextValue;
}

export interface PluginSlotContribution {
  id: string;
  order?: number;
  component: ComponentType<PluginSlotComponentProps>;
  fallback?: ReactNode;
}

export interface PluginRoute {
  id: string;
  path: string;
  namespace?: RouteNamespace;
  layout?: 'main' | 'none';
  element: () => Promise<{ default: ComponentType }>;
  requiredCapability?: string;
  requiredRole?: string;
  fallback?: ReactNode;
}

export interface PluginNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  order?: number;
}

export type PluginProvider = ComponentType<{ children: ReactNode }>;

export interface PluginGuardArgs {
  requiredCapability?: string;
  requiredRole?: string;
  runtimeContext: RuntimeContextValue;
}

export type PluginGuard = (args: PluginGuardArgs) => boolean;

/**
 * Runtime context exposed by a plugin to the host. The host has no idea
 * what the shape of the context is; the plugin owns it end-to-end.
 *
 * Contract:
 * - `Provider` must wrap its children with whatever React context the
 *   plugin uses internally; it MUST NOT mutate the host's state.
 * - `useValue` is read by the host bridge on every render. It MUST return
 *   either a stable reference (when the value did not change) or a new
 *   reference (when it did) — the host uses reference equality to decide
 *   whether to emit a `runtimeContextChanged` event.
 * - The returned value SHOULD be treated as immutable by every consumer.
 *   Plugins MUST NOT expose mutators (e.g. setState callbacks) through
 *   the value; if a plugin needs to expose actions, it must do so through
 *   its own internal context, not through the host's shared context. Any
 *   other plugin that consumes `usePluginRuntimeContext()` is otherwise
 *   able to mutate the registering plugin's state.
 */
export interface PluginRuntimeContextDescriptor {
  Provider: ComponentType<{ children: ReactNode }>;
  useValue: () => RuntimeContextValue;
}

export interface PluginManifest {
  id: string;
  onBoot?: () => void;
  providers?: PluginProvider[];
  slots?: Partial<Record<SlotId, PluginSlotContribution[]>>;
  routes?: PluginRoute[];
  navItems?: PluginNavItem[];
  guard?: PluginGuard;
  runtimeContext?: PluginRuntimeContextDescriptor;
}

export type RegisteredPlugin = PluginManifest;

export const RUNTIME_CONTEXT_CHANGED_EVENT = 'runtimeContextChanged';
