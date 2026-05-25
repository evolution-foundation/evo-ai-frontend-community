import '@testing-library/jest-dom';

// JSDOM ships neither ResizeObserver nor PointerEvent; cmdk + Radix UI primitives
// rely on both. Tests under src/components/journey/shared/* (EVO-1261 EventSelector,
// future shared dropdowns) need these stubs to mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (typeof Element !== 'undefined' && !(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).setPointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
}
