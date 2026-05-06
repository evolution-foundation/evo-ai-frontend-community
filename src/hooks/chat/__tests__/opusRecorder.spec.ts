import { describe, it, expect } from 'vitest';
import { existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Guards the opus-recorder pipeline that produces WhatsApp-Cloud-compatible
// PTT (push-to-talk / OGG/Opus) audio directly from the mic, with no
// post-conversion. This file does NOT try to run the recorder in jsdom (it
// needs real AudioContext + Worker), but it pins the contracts that, if
// broken, would break PTT in production:
//
//   1. opus-recorder package shape (worker file present and non-trivial size)
//   2. Vite plugin self-hosts the worker at /opus-recorder/encoderWorker.min.js
//   3. The hook calls Recorder() with the exact PTT-compliant params:
//        encoderApplication=2048 (VOIP), sampleRate=48000, channels=1,
//        bitRate=48000, complexity=10, streamPages=true, rawOpus=false
//   4. The hook points Recorder at OUR self-hosted encoder, not unpkg/CDN

const ROOT = path.resolve(__dirname, '../../../..');
const OPUS_DIR = path.join(ROOT, 'node_modules/opus-recorder/dist');
const VITE_CONFIG = path.join(ROOT, 'vite.config.ts');
const HOOK = path.join(ROOT, 'src/hooks/chat/useAudioRecorder.ts');

describe('opus-recorder package shape', () => {
  it('ships a non-trivial encoderWorker.min.js (libopusenc inside)', () => {
    const p = path.join(OPUS_DIR, 'encoderWorker.min.js');
    expect(existsSync(p), `missing ${p}`).toBe(true);
    // libopusenc is ~280KB embedded as base64; the worker file should be ~376KB.
    // Anything under 100KB means a broken tarball.
    expect(statSync(p).size).toBeGreaterThan(100 * 1024);
  });
});

describe('vite plugin self-hosts opus-recorder assets', () => {
  const config = readFileSync(VITE_CONFIG, 'utf8');

  it('declares OPUS_RECORDER_DIR pointing at node_modules/opus-recorder/dist', () => {
    expect(config).toMatch(
      /OPUS_RECORDER_DIR\s*=\s*path\.resolve\([^)]*opus-recorder\/dist/,
    );
  });

  it('serves encoderWorker.min.js (the file the hook fetches)', () => {
    const match = config.match(/OPUS_RECORDER_FILES\s*=\s*\[([^\]]+)\]/);
    expect(match, 'could not find OPUS_RECORDER_FILES in vite.config.ts').toBeTruthy();
    const declared = (match![1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
    expect(declared).toContain('encoderWorker.min.js');
  });

  it('does NOT reference unpkg/cdn for the encoder (must be self-hosted)', () => {
    const hookSrc = readFileSync(HOOK, 'utf8');
    expect(hookSrc).not.toMatch(/unpkg\.com|cdn\.jsdelivr|cdn\.skypack/);
  });
});

describe('useAudioRecorder PTT config (WhatsApp Cloud compliance)', () => {
  const hookSrc = readFileSync(HOOK, 'utf8');

  it('points the encoder at the self-hosted worker path', () => {
    expect(hookSrc).toMatch(
      /OPUS_ENCODER_PATH\s*=\s*['"]\/opus-recorder\/encoderWorker\.min\.js['"]/,
    );
  });

  // These four are the PTT contract with WhatsApp Cloud. If any of them drift,
  // Cloud may accept the file as a generic attachment instead of a voice note,
  // OR reject it outright. Pin each one explicitly.

  it('encoderApplication is 2048 (VOIP — required for voice notes)', () => {
    expect(hookSrc).toMatch(/encoderApplication:\s*2048/);
  });

  it('encoderSampleRate is 48000 (Opus PTT standard)', () => {
    expect(hookSrc).toMatch(/encoderSampleRate:\s*48000/);
  });

  it('numberOfChannels is 1 (mono — Cloud rejects stereo PTT)', () => {
    expect(hookSrc).toMatch(/numberOfChannels:\s*1/);
  });

  it('encoderBitRate is 48000 (matches -b:a 48k from prior FFmpeg pipeline)', () => {
    expect(hookSrc).toMatch(/encoderBitRate:\s*48000/);
  });

  it('encoderComplexity is 10 (max quality, matches -compression_level 10)', () => {
    expect(hookSrc).toMatch(/encoderComplexity:\s*10/);
  });

  it('streamPages is true and rawOpus is false (proper OGG container)', () => {
    expect(hookSrc).toMatch(/streamPages:\s*true/);
    expect(hookSrc).toMatch(/rawOpus:\s*false/);
  });

  it('produces a Blob with type "audio/ogg" on stop', () => {
    // The merge logic must wrap merged Uint8Array in a Blob({ type: 'audio/ogg' }).
    expect(hookSrc).toMatch(/new Blob\(\[merged\],\s*\{\s*type:\s*['"]audio\/ogg['"]/);
  });
});

describe('useAudioRecorder NEVER falls back to FFmpeg WASM', () => {
  const hookSrc = readFileSync(HOOK, 'utf8');

  it('does not import @ffmpeg/ffmpeg', () => {
    expect(hookSrc).not.toMatch(/@ffmpeg\/ffmpeg/);
  });

  it('does not call ffmpeg.run / ffmpeg.load / fetchFile', () => {
    expect(hookSrc).not.toMatch(/ffmpeg\.(run|load|FS)\(/);
    expect(hookSrc).not.toMatch(/fetchFile\(/);
  });
});
