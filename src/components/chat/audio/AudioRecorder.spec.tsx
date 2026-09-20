import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AudioRecorder from './AudioRecorder';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

const recorder = {
  isRecording: true,
  duration: 3,
  audioLevel: 0.4,
  hasRecording: false,
  recordingData: null,
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  deleteRecording: vi.fn(),
  isSupported: true,
};

vi.mock('@/hooks/chat/useAudioRecorder', () => ({
  useAudioRecorder: () => recorder,
}));

const waveform = () => {
  const row = screen.getByTitle('Enviar').parentElement!;
  return row.querySelector<HTMLElement>('.h-8')!;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// jsdom does not lay out or evaluate media queries, so this locks the classes:
// the bars are flex-shrink-0 (32 * 2px + 31 * 3px = 157px minimum), so without
// overflow-hidden they spill over the send button on narrow screens (EVO-2234).
describe('AudioRecorder responsive waveform (EVO-2234)', () => {
  it('fills the row on mobile and clips the bars instead of letting them spill', () => {
    render(<AudioRecorder onRecordingComplete={vi.fn()} />);

    const bars = waveform();
    expect(bars).toHaveClass('flex-1');
    expect(bars).toHaveClass('min-w-0');
    expect(bars).toHaveClass('overflow-hidden');
  });

  it('keeps the fixed right-hugged waveform on desktop', () => {
    render(<AudioRecorder onRecordingComplete={vi.fn()} />);

    const bars = waveform();
    expect(bars).toHaveClass('md:flex-none');
    expect(bars).toHaveClass('md:w-40');
    expect(bars.parentElement).toHaveClass('md:justify-end');
  });
});
