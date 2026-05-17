import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from 'react';
import { getRuntimeContextDescriptor } from './registry';
import { RUNTIME_CONTEXT_CHANGED_EVENT, type RuntimeContextValue } from './types';

const RuntimeContextCtx = createContext<RuntimeContextValue>(undefined);

const runtimeContextBus =
  typeof window !== 'undefined' ? new EventTarget() : null;

/**
 * Internal: dispatches a `runtimeContextChanged` event on the in-memory
 * bus. Only `RuntimeContextBridge` is expected to call this — it is NOT
 * exported from `@/plugin-host`'s public surface because any caller can
 * spoof a context-change payload that downstream listeners attached via
 * `onRuntimeContextChanged` would react to. If you need to push context
 * from outside React, register a `runtimeContext` descriptor on a
 * plugin manifest instead.
 *
 * @internal
 */
export function emitRuntimeContextChanged(value: RuntimeContextValue): void {
  if (!runtimeContextBus) return;
  runtimeContextBus.dispatchEvent(
    new CustomEvent(RUNTIME_CONTEXT_CHANGED_EVENT, { detail: value }),
  );
}

export function onRuntimeContextChanged(
  listener: (value: RuntimeContextValue) => void,
): () => void {
  if (!runtimeContextBus) return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<RuntimeContextValue>).detail;
    listener(detail);
  };
  runtimeContextBus.addEventListener(RUNTIME_CONTEXT_CHANGED_EVENT, handler);
  return () => runtimeContextBus.removeEventListener(RUNTIME_CONTEXT_CHANGED_EVENT, handler);
}

export function usePluginRuntimeContext(): RuntimeContextValue {
  return useContext(RuntimeContextCtx);
}

function RuntimeContextBridge({
  useValue,
  children,
}: {
  useValue: () => RuntimeContextValue;
  children: ReactNode;
}) {
  const value = useValue();
  const previous = useRef<RuntimeContextValue>(undefined);
  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      emitRuntimeContextChanged(value);
    }
  }, [value]);
  return createElement(RuntimeContextCtx.Provider, { value }, children);
}

export function PluginRuntimeContextProvider({ children }: { children: ReactNode }) {
  const descriptor = getRuntimeContextDescriptor();
  if (!descriptor) {
    return createElement(RuntimeContextCtx.Provider, { value: undefined }, children);
  }
  const { Provider, useValue } = descriptor;
  const bridge = createElement(RuntimeContextBridge, { useValue, children });
  return createElement(Provider, null, bridge);
}
