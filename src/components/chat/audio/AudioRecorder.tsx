import React, { useEffect, useRef } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Play, Pause, Square, Trash2, Mic } from 'lucide-react';
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
  /**
   * Kept for prop compatibility with existing callers. opus-recorder encodes in
   * real time so no separate converter needs to be pre-loaded; this flag is a no-op now.
   */
  shouldPreloadConverter?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingCancel,
  disabled = false,
  className = '',
  autoStart = false,
  preferWhatsAppCloudFormat = false,
  shouldPreloadConverter: _shouldPreloadConverter = false,
}) => {
  const { t } = useLanguage('chat');
  const {
    isRecording,
    isPaused,
    duration,
    hasRecording,
    recordingData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    isSupported,
  } = useAudioRecorder({
    preferWhatsAppCloudFormat,
    onMaxDurationReached: () => toast.warning(t('audioRecorder.maxDurationReached')),
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-iniciar gravação se especificado
  useEffect(() => {
    if (autoStart && !isRecording && !hasRecording && !disabled) {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, isRecording, hasRecording, disabled]);

  // Controlar reprodução do áudio
  const togglePlayback = () => {
    if (!audioRef.current || !recordingData) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Finalizar gravação
  const handleComplete = () => {
    if (recordingData) {
      onRecordingComplete(recordingData);
      deleteRecording();
    }
  };

  // Cancelar gravação
  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    deleteRecording();
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
    <div className={`bg-background border rounded-lg p-3 ${className}`}>
      {/* Tudo em uma linha compacta */}
      <div className="flex items-center justify-between gap-3">
        {/* Controles à esquerda */}
        <div className="flex items-center gap-2">
          {!isRecording && !hasRecording && (
            <Button
              size="sm"
              onClick={startRecording}
              disabled={disabled}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Mic className="h-4 w-4 mr-1" />
              {t('audioRecorder.record')}
            </Button>
          )}

          {isRecording && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={isPaused ? resumeRecording : pauseRecording}
                disabled={disabled}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="destructive" onClick={stopRecording} disabled={disabled}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}

          {hasRecording && (
            <>
              <Button size="sm" variant="outline" onClick={togglePlayback} disabled={disabled}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={disabled}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Timer no centro */}
        <div className="flex items-center gap-2">
          {isRecording && !isPaused && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
          {isRecording && isPaused && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
          <span className="text-lg font-mono font-medium">{formatDuration(duration)}</span>
          {isPaused && (
            <span className="text-sm text-muted-foreground">
              {t('audioRecorder.paused')}
            </span>
          )}
        </div>

        {/* Botão enviar à direita */}
        {hasRecording ? (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={disabled}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {t('audioRecorder.send')}
          </Button>
        ) : (
          <div className="w-16" /> // Placeholder para manter alinhamento
        )}
      </div>

      {/* Audio element para reprodução */}
      {recordingData && (
        <audio
          ref={audioRef}
          src={recordingData.url}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      )}
    </div>
  );
};

export default AudioRecorder;
