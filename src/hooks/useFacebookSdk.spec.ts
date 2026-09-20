import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFacebookSdk } from './useFacebookSdk';

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

describe('useFacebookSdk', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
    delete (window as { FB?: unknown }).FB;
    delete (window as { fbAsyncInit?: unknown }).fbAsyncInit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves as soon as the SDK defines window.FB', async () => {
    const { result } = renderHook(() => useFacebookSdk());
    const promise = result.current.loadSdk();

    (window as { FB?: unknown }).FB = { init: vi.fn() };
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBeUndefined();
  });

  // Three other components inject this same script and overwrite fbAsyncInit
  // without chaining. Waiting only on that callback deadlocked the caller.
  it('rejects instead of hanging when a pre-existing script never loads', async () => {
    const stale = document.createElement('script');
    stale.id = 'facebook-jssdk';
    stale.src = SDK_SRC;
    document.head.appendChild(stale);

    const { result } = renderHook(() => useFacebookSdk());
    const promise = result.current.loadSdk();
    const assertion = expect(promise).rejects.toThrow(/failed to load/i);

    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
  });

  it('does not inject a second script when one is already there without an id', async () => {
    const idless = document.createElement('script');
    idless.src = SDK_SRC;
    document.head.appendChild(idless);

    const { result } = renderHook(() => useFacebookSdk());
    const promise = result.current.loadSdk();
    const assertion = expect(promise).rejects.toThrow(/failed to load/i);

    expect(document.querySelectorAll(`script[src="${SDK_SRC}"]`)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
  });

  // A failed load used to leave loading.current set, so every later attempt in
  // the same page got the same dead promise back.
  it('allows a retry after a failed load', async () => {
    const { result } = renderHook(() => useFacebookSdk());
    const first = result.current.loadSdk();
    const firstAssertion = expect(first).rejects.toThrow(/failed to load/i);
    await vi.advanceTimersByTimeAsync(11_000);
    await firstAssertion;

    const second = result.current.loadSdk();
    (window as { FB?: unknown }).FB = { init: vi.fn() };
    await vi.advanceTimersByTimeAsync(200);

    await expect(second).resolves.toBeUndefined();
  });
});
