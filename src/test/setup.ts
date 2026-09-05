import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Node 22+ exposes an experimental `localStorage` global that resolves to
// undefined unless --localstorage-file is provided, shadowing jsdom's own
// implementation. Any spec importing a module that touches localStorage at
// import time would crash ("Cannot read properties of undefined"). Install a
// minimal in-memory Storage before specs are collected.
{
  const existing = (globalThis as { localStorage?: Storage }).localStorage;
  const broken =
    !existing ||
    typeof existing.getItem !== 'function' ||
    typeof existing.setItem !== 'function';
  if (broken) {
    class MemoryStorage implements Storage {
      private store = new Map<string, string>();
      get length(): number {
        return this.store.size;
      }
      clear(): void {
        this.store.clear();
      }
      getItem(key: string): string | null {
        return this.store.has(key) ? (this.store.get(key) as string) : null;
      }
      key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
      }
      removeItem(key: string): void {
        this.store.delete(key);
      }
      setItem(key: string, value: string): void {
        this.store.set(String(key), String(value));
      }
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}

// @tanstack/react-virtual measures the scroll element via ResizeObserver +
// getBoundingClientRect, both of which JSDOM stubs as 0×0. The virtualizer
// then renders zero items, which breaks any test that asserts on the
// rendered list. Replace it with a deterministic stub that returns every
// item as visible — tests can still assert on render output, presence of
// the load-more button, and the prefetch trigger.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        key: i,
        start: i * 100,
        size: 100,
      })),
    getTotalSize: () => count * 100,
    measureElement: () => {},
  }),
}));

// JSDOM ships neither ResizeObserver, IntersectionObserver, nor PointerEvent.
// Radix UI primitives (Select, Tabs) and cmdk depend on pointer-capture APIs;
// EventSelector and ContactEventsTab tests rely on these
// stubs to mount. The IO and RO mocks below are dispatchable — tests can
// fire synthetic entries via the `triggerIO(idx, entries)` / `triggerRO`
// globals to exercise sentinel callbacks without a real layout pass.
if (typeof Element !== 'undefined') {
  if (!(Element.prototype as unknown as { hasPointerCapture?: unknown }).hasPointerCapture) {
    (Element.prototype as unknown as { hasPointerCapture: () => boolean }).hasPointerCapture = () => false;
  }
  if (!(Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture) {
    (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};
  }
  if (!(Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture) {
    (Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
  }
  if (!(Element.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView) {
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
  }
}

type IOEntry = Partial<IntersectionObserverEntry> & { isIntersecting: boolean };

// Install the dispatchable mocks UNCONDITIONALLY so tests behave the same
// across jsdom versions. If jsdom ever ships a partial native implementation
// of IntersectionObserver / ResizeObserver, leaving the guard in place would
// silently bypass these mocks and break `triggerIO` / `triggerRO`.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    const g = globalThis as unknown as { __intersectionObservers?: MockIntersectionObserver[] };
    g.__intersectionObservers ??= [];
    g.__intersectionObservers.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

class MockResizeObserver implements ResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    const g = globalThis as unknown as { __resizeObservers?: MockResizeObserver[] };
    g.__resizeObservers ??= [];
    g.__resizeObservers.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

// Dispatch helpers — fire a synthetic entry list to a mocked observer instance
// by index. Tests can also read the global arrays directly for advanced
// scenarios (counting observers, asserting disconnect, etc.).
(globalThis as unknown as { triggerIO?: (idx: number, entries: IOEntry[]) => void }).triggerIO = (
  idx: number,
  entries: IOEntry[],
) => {
  const g = globalThis as unknown as {
    __intersectionObservers?: Array<{ callback: IntersectionObserverCallback }>;
  };
  const observer = g.__intersectionObservers?.[idx];
  if (!observer) return;
  observer.callback(
    entries as unknown as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  );
};

(globalThis as unknown as { triggerRO?: (idx: number, entries: ResizeObserverEntry[]) => void }).triggerRO = (
  idx: number,
  entries: ResizeObserverEntry[],
) => {
  const g = globalThis as unknown as {
    __resizeObservers?: Array<{ callback: ResizeObserverCallback }>;
  };
  const observer = g.__resizeObservers?.[idx];
  if (!observer) return;
  observer.callback(entries, {} as ResizeObserver);
};
