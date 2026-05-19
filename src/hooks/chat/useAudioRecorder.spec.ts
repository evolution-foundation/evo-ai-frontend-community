import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from './useAudioRecorder';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Minimal MediaRecorder mock
class MockMediaRecorder {
  static isTypeSupported = (type: string) => type.includes('webm') || type.includes('ogg');

  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  state = 'inactive';

  constructor(public stream: MediaStream, public options?: MediaRecorderOptions) {}

  start() {
    this.state = 'recording';
    // Emit a data chunk immediately
    this.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) });
  }

  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }

  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
}

const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
} as unknown as MediaStream;

const mockAudioContext = {
  createAnalyser: () => ({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
  }),
  createMediaStreamSource: () => ({ connect: vi.fn() }),
  close: vi.fn(),
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();

  Object.defineProperty(global, 'MediaRecorder', {
    value: MockMediaRecorder,
    writable: true,
  });

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
  });

  Object.defineProperty(global, 'AudioContext', {
    value: vi.fn(() => mockAudioContext),
    writable: true,
  });

  Object.defineProperty(global, 'URL', {
    value: { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() },
    writable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAudioRecorder', () => {
  it('starts with no recording', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.hasRecording).toBe(false);
    expect(result.current.duration).toBe(0);
  });

  it('sets isRecording to true after startRecording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });

  it('sets hasRecording to true after stopRecording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.hasRecording).toBe(true);
    expect(result.current.isRecording).toBe(false);
  });

  it('increments duration while recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.duration).toBeGreaterThan(0);
  });

  it('pauses and resumes recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => { result.current.pauseRecording(); });
    expect(result.current.isPaused).toBe(true);

    act(() => { result.current.resumeRecording(); });
    expect(result.current.isPaused).toBe(false);
  });

  it('deletes recording and resets state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    act(() => { result.current.stopRecording(); });
    act(() => { result.current.deleteRecording(); });

    expect(result.current.hasRecording).toBe(false);
    expect(result.current.recordingData).toBeNull();
  });

  it('auto-stops and calls onMaxDurationReached after 5 minutes (C3)', async () => {
    const onMaxDurationReached = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ onMaxDurationReached }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance past the 5-minute cap and flush all state updates
    await act(async () => {
      vi.advanceTimersByTime(300_000 + 500);
    });

    expect(onMaxDurationReached).toHaveBeenCalledOnce();
    expect(result.current.isRecording).toBe(false);
  });

  it('does not trigger cap callback if stopped before 5 minutes', async () => {
    const onMaxDurationReached = vi.fn();
    const { result } = renderHook(() =>
      useAudioRecorder({ onMaxDurationReached }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      vi.advanceTimersByTime(60_000); // 1 minute
      result.current.stopRecording();
    });

    act(() => {
      vi.advanceTimersByTime(300_000); // advance past cap after stop
    });

    expect(onMaxDurationReached).not.toHaveBeenCalled();
  });

  it('prevents duplicate recordings from starting simultaneously', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      // Trigger two concurrent starts
      await Promise.all([
        result.current.startRecording(),
        result.current.startRecording(),
      ]);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
  });
});
