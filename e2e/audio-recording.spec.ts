import { test, expect } from '@playwright/test';

// End-to-end test that the opus-recorder PTT pipeline produces a real
// OGG/Opus blob in a real browser, with a real microphone stream
// (--use-fake-device-for-media-stream supplies a synthetic 440Hz tone).
//
// This is the test that would have caught:
//   - The empty 'audio: {}' getUserMedia call shipped in 08b8571
//   - The 0-byte ffmpeg-core.worker.js (atob InvalidCharacterError)
//   - The SharedArrayBuffer requirement of @ffmpeg/core
//   - Any future drift in PTT_OPUS_CONFIG that breaks the OGG container
//
// Hard contract: the returned blob MUST start with magic bytes 'OggS'
// (the Ogg page header). If that's missing, WhatsApp Cloud will reject it.

test('recordPttOgg produces a valid OGG/Opus blob', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.stack || err.message));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Vite dev server emits a benign "Failed to load resource: 404" for
    // optional sourcemaps it tries to fetch. Ignore those — they don't reflect
    // a real bug in the recording pipeline. Real recorder failures surface
    // through `pageerror` (uncaught) or as the resolved evaluate result.
    if (/Failed to load resource.*404/.test(text)) return;
    errors.push(text);
  });

  await page.goto('/e2e-harness.html');
  await page.waitForFunction(() => (window as unknown as { __e2e?: { ready: boolean } }).__e2e?.ready === true);

  const result = await page.evaluate(async () => {
    try {
      return await (
        window as unknown as { __e2e: { recordPtt: (ms: number) => Promise<unknown> } }
      ).__e2e.recordPtt(1500);
    } catch (e) {
      const err = e as Error;
      return { ok: false, error: err?.stack || err?.message || String(e) };
    }
  });

  expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);

  const r = result as {
    ok: boolean;
    error?: string;
    size: number;
    type: string;
    magic: string;
    elapsed: number;
  };

  expect(r.ok, `recordPtt threw: ${r.error}`).toBe(true);
  expect(r.type).toBe('audio/ogg');
  // 1.5s of 48kHz mono Opus at 48kbps ≈ 9KB; allow generous lower bound.
  expect(r.size).toBeGreaterThan(2 * 1024);
  // The Ogg page magic — the byte sequence WhatsApp Cloud will look for.
  expect(r.magic).toBe('OggS');
  // We asked for ~1500ms; allow ±500ms for encoder flush.
  expect(r.elapsed).toBeGreaterThan(1000);
  expect(r.elapsed).toBeLessThan(3000);
});
