import Recorder from 'opus-recorder';

// Pure function extracted from useAudioRecorder so it can be exercised by
// Playwright in a real browser (with --use-fake-device-for-media-stream)
// without mounting React. The config below is the WhatsApp-Cloud-compliant
// PTT (push-to-talk / OGG/Opus) profile:
//
//   ffmpeg -c:a libopus -b:a 48k -ar 48000 -ac 1 -application voip
//          -compression_level 10 -map_metadata -1
//
// Single source of truth for the PTT params — useAudioRecorder imports it.
export const PTT_OPUS_CONFIG = {
  encoderApplication: 2048,
  encoderSampleRate: 48000,
  encoderBitRate: 48000,
  numberOfChannels: 1,
  encoderComplexity: 10,
  streamPages: true,
  rawOpus: false,
} as const;

export const OPUS_ENCODER_PATH = '/opus-recorder/encoderWorker.min.js';

export interface RecordPttResult {
  blob: Blob;
  durationMs: number;
}

// Records `durationMs` of audio from `stream` and returns an OGG/Opus blob
// ready to upload to WhatsApp Cloud.
export const recordPttOgg = async (
  stream: MediaStream,
  durationMs: number,
): Promise<RecordPttResult> => {
  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaStreamSource(stream);

  const chunks: Uint8Array[] = [];
  const recorder = new Recorder({
    ...PTT_OPUS_CONFIG,
    encoderPath: OPUS_ENCODER_PATH,
    // Pass the externally-prepared sourceNode via config (not as start() arg)
    // — that's what tells opus-recorder to skip its own getUserMedia call.
    // See node_modules/opus-recorder/dist/recorder.min.js → initSourceNode:
    //   if (this.config.sourceNode.context) { reuse } else { getUserMedia }
    sourceNode,
  } as ConstructorParameters<typeof Recorder>[0]);

  recorder.ondataavailable = (chunk: Uint8Array) => {
    chunks.push(chunk);
  };

  const startedAt = Date.now();
  await recorder.start();
  await new Promise(resolve => setTimeout(resolve, durationMs));
  await recorder.stop();
  const elapsed = Date.now() - startedAt;

  await audioContext.close();

  const totalSize = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    blob: new Blob([merged], { type: 'audio/ogg' }),
    durationMs: elapsed,
  };
};
