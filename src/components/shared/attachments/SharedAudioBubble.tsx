import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Download, Volume2 } from 'lucide-react';
import type { SharedAttachment } from './SharedImageBubble';

// Ícones preenchidos customizados
const PlayFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
);

const PauseFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

interface SharedAudioBubbleProps {
  attachments: SharedAttachment[];
  messageType?: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const SharedAudioBubble: React.FC<SharedAudioBubbleProps> = ({
  attachments,
  messageType = 'in',
  onToast
}) => {
  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <AudioPlayer
          key={attachment.id || index}
          attachment={attachment}
          messageType={messageType}
          onToast={onToast}
        />
      ))}
    </div>
  );
};

interface AudioPlayerProps {
  attachment: SharedAttachment;
  messageType: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ attachment, messageType, onToast }) => {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Opções de velocidade de reprodução
  const speedOptions = [1, 1.5, 2];

  // Formatar label da velocidade (ex: "1x", "1.5x", "2x")
  const speedLabel = `${playbackRate}x`;

  const audioUrl = attachment.data_url || attachment.file_url;
  const filename = attachment.fallback_title || t('attachments.audio.title');

  // Formatar tempo em mm:ss
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular progresso em porcentagem com proteção
  const progress = (duration > 0 && isFinite(duration))
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  // Configurar eventos do áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const dur = audio.duration;
      if (isFinite(dur)) {
        setDuration(dur);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      setIsLoading(false);
      onToast?.(t('attachments.audio.loadError'), 'error');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, onToast]);

  // Aplicar velocidade ao elemento de áudio sempre que mudar
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Ciclar pela velocidade: 1x → 1.5x → 2x → 1x
  const cycleSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    setPlaybackRate(speedOptions[nextIndex]);
  };

  // Controlar reprodução
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  // Controlar posição do áudio
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = x / width;
    const newTime = clickRatio * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Download do áudio
  const downloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onToast?.(t('attachments.audio.downloadStarted', { filename }), 'success');
    }
  };

  if (!audioUrl) {
    return (
      <div className={`rounded-lg p-3 max-w-xs ${
        messageType === 'out' ? 'bg-white/10' : 'bg-slate-100'
      }`}>
        <div className={`flex items-center gap-2 ${
          messageType === 'out' ? 'text-white/70' : 'text-slate-500'
        }`}>
          <Volume2 className="h-4 w-4" />
          <span className="text-sm">{t('attachments.audio.notAvailable')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 max-w-xs ${
      messageType === 'out' ? 'bg-white/10' : 'bg-slate-50'
    }`}>
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
            ${isLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-105 active:scale-95'
            }
            ${messageType === 'out'
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }
          `}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <PauseFilled className="w-4 h-4" />
          ) : (
            <PlayFilled className="w-4 h-4" />
          )}
        </button>

        {/* Info e Controles */}
        <div className="flex-1 min-w-0">
          {/* Nome do arquivo e download */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1 min-w-0">
              <Volume2 className={`h-3 w-3 flex-shrink-0 ${
                messageType === 'out' ? 'text-white/70' : 'text-slate-500'
              }`} />
              <span className={`text-xs font-medium truncate ${
                messageType === 'out' ? 'text-white/90' : 'text-slate-600'
              }`}>
                {filename}
              </span>
            </div>
            {/* Botão de velocidade */}
            <button
              onClick={cycleSpeed}
              className={`
                flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold transition-all duration-150
                ${messageType === 'out'
                  ? 'text-white/90 hover:text-white bg-white/10 hover:bg-white/20'
                  : 'text-slate-600 hover:text-slate-800 bg-slate-200 hover:bg-slate-300'
                }
                ${playbackRate !== 1 ? 'ring-1 ring-current ring-opacity-50' : ''}
              `}
              title="Velocidade de reprodução"
            >
              {speedLabel}
            </button>
            <button
              onClick={downloadAudio}
              className={`
                flex-shrink-0 p-1 rounded transition-colors
                ${messageType === 'out'
                  ? 'text-white/70 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }
              `}
              title={t('attachments.audio.download')}
            >
              <Download className="h-3 w-3" />
            </button>
          </div>

          {/* Barra de progresso */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono w-8 ${
              messageType === 'out' ? 'text-white/70' : 'text-slate-500'
            }`}>
              {formatTime(currentTime)}
            </span>

            {/* Progress Bar */}
            <div
              className={`
                flex-1 h-2 rounded-full cursor-pointer relative transition-colors
                ${messageType === 'out' ? 'bg-white/20' : 'bg-slate-300'}
              `}
              onClick={handleProgressClick}
            >
              <div
                className={`
                  h-full rounded-full transition-all duration-150
                  ${messageType === 'out' ? 'bg-white/70' : 'bg-slate-500'}
                `}
                style={{ width: `${progress}%` }}
              />
              {/* Progress indicator */}
              <div
                className={`
                  absolute top-1/2 w-3 h-3 rounded-full border shadow-sm transition-all duration-150
                  ${messageType === 'out'
                    ? 'bg-white/90 border-white/50'
                    : 'bg-slate-600 border-slate-300'
                  }
                `}
                style={{
                  left: `${progress}%`,
                  transform: 'translateX(-50%) translateY(-50%)'
                }}
              />
            </div>

            <span className={`text-xs font-mono w-8 ${
              messageType === 'out' ? 'text-white/70' : 'text-slate-500'
            }`}>
              {formatTime(duration)}
            </span>
          </div>

          {/* Tamanho do arquivo */}
          {attachment.file_size && (
            <div className="mt-1">
              <span className={`text-xs ${
                messageType === 'out' ? 'text-white/60' : 'text-slate-400'
              }`}>
                {Math.round(attachment.file_size / 1024)} KB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Elemento de áudio oculto */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
    </div>
  );
};

export default SharedAudioBubble;
