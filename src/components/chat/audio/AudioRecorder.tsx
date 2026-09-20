import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Send, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAudioRecorder, AudioRecordingData } from '@/hooks/chat/useAudioRecorder';

interface AudioRecorderProps {
  onRecordingComplete: (data: AudioRecordingData) => void;
  onRecordingCancel?: () => void;
  disabled?: boolean;
  className?: string;
  autoStart?: boolean;
  preferWhatsAppCloudFormat?: boolean;
}

const WAVEFORM_BARS = 32;

/**
 * Gravador inline estilo WhatsApp: substitui a barra do composer (não é um
 * bloco extra). Fluxo DIRETO — gravar → parar JÁ envia, sem etapa de preview
 * intermediária (WhatsApp não tem "ouvir antes de mandar" na gravação normal).
 * Waveform reage à amplitude REAL do microfone (audioLevel do hook), não é
 * decorativo estático.
 */
const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingCancel,
  disabled = false,
  className = '',
  autoStart = false,
  preferWhatsAppCloudFormat = false,
}) => {
  const { t } = useLanguage('chat');
  const {
    isRecording,
    duration,
    audioLevel,
    hasRecording,
    recordingData,
    startRecording,
    stopRecording,
    deleteRecording,
    isSupported,
  } = useAudioRecorder({
    preferWhatsAppCloudFormat,
    onMaxDurationReached: () => toast.warning(t('audioRecorder.maxDurationReached')),
  });

  // Histórico de amplitude — cada nova leitura de audioLevel entra no fim e
  // empurra as barras mais antigas pra esquerda, como o waveform real do
  // WhatsApp desenhando enquanto grava.
  const [levels, setLevels] = useState<number[]>(() => new Array(WAVEFORM_BARS).fill(0.15));
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  useEffect(() => {
    if (!isRecording) return;
    setLevels(prev => {
      const next = [...prev.slice(1), Math.max(0.12, Math.min(1, audioLevel * 1.8))];
      return next;
    });
  }, [audioLevel, isRecording]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (autoStart && !isRecording && !hasRecording && !disabled) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isRecording, hasRecording, disabled]);

  // Assim que a gravação para, o hook popula recordingData — envia direto
  // (nenhuma etapa de "ouvir antes de mandar"), como o WhatsApp.
  useEffect(() => {
    if (hasRecording && recordingData) {
      onRecordingComplete(recordingData);
      deleteRecording();
      setLevels(new Array(WAVEFORM_BARS).fill(0.15));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRecording, recordingData]);

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    deleteRecording();
    setLevels(new Array(WAVEFORM_BARS).fill(0.15));
    onRecordingCancel?.();
  };

  if (!isSupported) {
    return (
      <div className={`p-4 text-center text-muted-foreground ${className}`}>
        <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('audioRecorder.notSupported')}</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 md:justify-end ${className}`}>
      {/* Cancelar (lixeira) */}
      <button
        type="button"
        onClick={handleCancel}
        disabled={disabled}
        className="flex-shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors"
        title={t('audioRecorder.cancel', 'Cancelar')}
      >
        <Trash2 className="h-5 w-5" />
      </button>

      {/* Ponto vermelho + timer */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-mono text-foreground tabular-nums">{formatDuration(duration)}</span>
      </div>

      {/* Reactive waveform — fills the row on mobile (EVO-2234); on desktop stays a
          fixed w-40 hugged to the right with the other controls, WhatsApp-style.
          overflow-hidden: the bars are flex-shrink-0 (32 * 2px + 31 * 3px = 157px min),
          so under ~333px of viewport they would spill over the send button. */}
      <div className="flex-1 min-w-0 md:flex-none md:w-40 flex items-center justify-between md:justify-normal gap-[3px] h-8 overflow-hidden">
        {levels.map((level, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[2px] rounded-full bg-primary/70 transition-[height] duration-75"
            style={{ height: `${Math.max(12, level * 100)}%` }}
          />
        ))}
      </div>

      {/* Enviar — para (se ainda gravando) e envia direto, um só clique */}
      <button
        type="button"
        onClick={stopRecording}
        disabled={disabled}
        title={t('audioRecorder.send', 'Enviar')}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-primary hover:bg-primary/85 text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-colors"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AudioRecorder;
