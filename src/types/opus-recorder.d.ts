// Minimal type stub for opus-recorder@8.x — the package ships no TS types.
// Surfaces only what useAudioRecorder.ts needs. See node_modules/opus-recorder
// README for the full option list.

declare module 'opus-recorder' {
  interface RecorderConfig {
    encoderPath?: string;
    encoderApplication?: number; // 2048 = VOIP
    encoderSampleRate?: number;
    encoderBitRate?: number;
    numberOfChannels?: number;
    encoderComplexity?: number;
    streamPages?: boolean;
    rawOpus?: boolean;
    mediaTrackConstraints?: boolean | MediaTrackConstraints;
    // Pass an external MediaStreamAudioSourceNode so opus-recorder skips its
    // internal getUserMedia call. The check is on `sourceNode.context` truthiness.
    sourceNode?: AudioNode;
  }

  export default class Recorder {
    constructor(config?: RecorderConfig);
    ondataavailable: (chunk: Uint8Array) => void;
    start(sourceNode?: AudioNode): Promise<void>;
    stop(): Promise<void>;
    pause(): void;
    resume(): void;
  }
}
