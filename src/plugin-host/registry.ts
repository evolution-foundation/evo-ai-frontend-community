import type {
  PluginManifest,
  PluginSlotContribution,
  PluginRoute,
  PluginRuntimeContextDescriptor,
  RegisteredPlugin,
  SlotId,
} from './types';

type Listener = () => void;

const plugins: RegisteredPlugin[] = [];
const listeners = new Set<Listener>();
let bootInvoked = false;

const slotCache = new Map<SlotId, PluginSlotContribution[]>();
const routeCache = new Map<string, PluginRoute[]>();
let idsCache: readonly string[] = [];
let providersCache: ReturnType<typeof computeProviders> = [];
let guardsCache: ReturnType<typeof computeGuards> = [];

function computeProviders() {
  return plugins.flatMap(p => p.providers ?? []);
}

function computeGuards() {
  return plugins
    .map(p => p.guard)
    .filter((g): g is NonNullable<typeof g> => typeof g === 'function');
}

function rebuildCaches(): void {
  slotCache.clear();
  routeCache.clear();
  idsCache = plugins.map(p => p.id);
  providersCache = computeProviders();
  guardsCache = computeGuards();
}

/**
 * Registers a plugin. Idempotent on `id`: registering the same id twice is
 * a no-op (logged via console.warn) — the second manifest is dropped and
 * its `onBoot` is NOT invoked. Callers that need to swap a plugin at
 * runtime must reset the host first (test-only `__resetPluginHostForTests`).
 */
export function registerPlugin(manifest: PluginManifest): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    throw new Error('[plugin-host] registerPlugin requires a manifest with a non-empty id');
  }
  if (plugins.some(p => p.id === manifest.id)) {
    console.warn(`[plugin-host] plugin "${manifest.id}" already registered; ignoring duplicate`);
    return;
  }
  plugins.push(manifest);
  notify();
  if (bootInvoked && typeof manifest.onBoot === 'function') {
    safeBoot(manifest);
  }
}

export function getPlugins(): readonly string[] {
  return idsCache;
}

export function getRegisteredPlugins(): readonly RegisteredPlugin[] {
  return plugins;
}

export function getSlotContributions(slot: SlotId): PluginSlotContribution[] {
  const cached = slotCache.get(slot);
  if (cached) return cached;
  const collected: PluginSlotContribution[] = [];
  for (const plugin of plugins) {
    const fromSlot = plugin.slots?.[slot];
    if (fromSlot) collected.push(...fromSlot);
  }
  collected.sort((a, b) => {
    const oa = a.order ?? 0;
    const ob = b.order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id.localeCompare(b.id);
  });
  slotCache.set(slot, collected);
  return collected;
}

export function getRoutes(namespace?: PluginRoute['namespace']): PluginRoute[] {
  const key = namespace ?? '__all__';
  const cached = routeCache.get(key);
  if (cached) return cached;
  const out: PluginRoute[] = [];
  for (const plugin of plugins) {
    if (!plugin.routes) continue;
    for (const route of plugin.routes) {
      if (!namespace || (route.namespace ?? 'customer') === namespace) out.push(route);
    }
  }
  routeCache.set(key, out);
  return out;
}

export function getProviders() {
  return providersCache;
}

export function getGuards() {
  return guardsCache;
}

export function getRuntimeContextDescriptor(): PluginRuntimeContextDescriptor | null {
  let chosen: PluginRuntimeContextDescriptor | null = null;
  for (const plugin of plugins) {
    if (!plugin.runtimeContext) continue;
    if (chosen) {
      console.warn(
        `[plugin-host] multiple plugins registered a runtimeContext; "${plugin.id}" ignored`,
      );
      continue;
    }
    chosen = plugin.runtimeContext;
  }
  return chosen;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  rebuildCaches();
  for (const l of listeners) l();
}

function safeBoot(manifest: PluginManifest): void {
  try {
    manifest.onBoot?.();
  } catch (err) {
    console.error(`[plugin-host] onBoot failed for "${manifest.id}"`, err);
  }
}

export function bootAllPlugins(): void {
  if (bootInvoked) return;
  bootInvoked = true;
  for (const plugin of plugins) {
    if (typeof plugin.onBoot === 'function') safeBoot(plugin);
  }
}

export function __resetPluginHostForTests(): void {
  plugins.length = 0;
  listeners.clear();
  bootInvoked = false;
  rebuildCaches();
}

rebuildCaches();
