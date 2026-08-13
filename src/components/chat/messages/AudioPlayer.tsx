import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface AudioPlayerProps {
  src: string;
  filename?: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, filename, className = '' }) => {
  const { t } = useLanguage('chat');
  const defaultFilename = filename || t('messages.audioPlayer.defaultFilename');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Opções de velocidade de reprodução
  const speedOptions = [1, 1.5, 2];
  const speedLabel = `${playbackRate}x`;

  // Formatar tempo em mm:ss
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular progresso em porcentagem
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Configurar eventos do áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
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
      console.error('Erro ao carregar áudio');
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
  }, [src]);

  // Aplicar velocidade ao elemento de áudio
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

  return (
    <div className={`bg-muted/30 rounded-lg p-3 max-w-sm ${className}`}>
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <Button
          size="sm"
          variant="outline"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="h-8 w-8 rounded-full p-0 flex-shrink-0"
        >
          {isLoading ? (
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3 ml-0.5" />
          )}
        </Button>

        {/* Info e Controles */}
        <div className="flex-1 min-w-0">
          {/* Nome do arquivo */}
          <div className="flex items-center gap-1 mb-1">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate">{defaultFilename}</span>
          </div>

          {/* Barra de progresso */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono w-8">
              {formatTime(currentTime)}
            </span>

            <div
              className="flex-1 h-1 bg-muted rounded-full cursor-pointer relative"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
              {/* Bolinha indicadora */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border border-background shadow-sm transition-all duration-150"
                style={{ left: `${progress}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              />
            </div>

            <span className="text-xs text-muted-foreground font-mono w-8">
              {formatTime(duration)}
            </span>

            {/* Botão de velocidade */}
            <button
              onClick={cycleSpeed}
              className={`
                px-1.5 py-0.5 rounded text-xs font-bold transition-all duration-150
                text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80
                ${playbackRate !== 1 ? 'ring-1 ring-primary ring-opacity-60 text-primary' : ''}
              `}
              title="Velocidade de reprodução"
            >
              {speedLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Elemento de áudio oculto */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
};

export default AudioPlayer;
