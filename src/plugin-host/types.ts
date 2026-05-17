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
