import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';

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
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

interface MessageAudioProps {
  attachments: Attachment[];
}

const MessageAudio: React.FC<MessageAudioProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');
  const [currentPlaying, setCurrentPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Opções de velocidade: 1x → 1.5x → 2x → 1x
  const speedOptions = [1, 1.5, 2];
  const speedLabel = `${playbackRate}x`;

  const cycleSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    setPlaybackRate(speedOptions[nextIndex]);
  };

  // Cache global de durações por attachment (persiste entre re-renders)
  const globalDurationsRef = useRef<Record<string, number>>({});

  const downloadFile = (attachment: Attachment) => {
    if (attachment.data_url) {
      const link = document.createElement('a');
      link.href = attachment.data_url;
      link.download = attachment.fallback_title || t('messages.messageAudio.audioFallback');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('messages.messageAudio.downloadStarted'), {
        description: attachment.fallback_title || t('messages.messageAudio.audioFallback'),
      });
    }
  };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes === 0) return '0 Bytes';
  //   const k = 1024;
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  // };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cache busting para áudios (como o Evolution)
  const timeStampAppendedURL = (dataUrl: string): string => {
    try {
      const url = new URL(dataUrl);
      if (!url.searchParams.has('t')) {
        url.searchParams.append('t', Date.now().toString());
      }
      return url.toString();
    } catch {
      return dataUrl;
    }
  };

  const loadDurationSimple = (url: string, attachmentId?: number | string) => {
    if (durations[url]) return;

    // Evitar reprocessamento do mesmo attachment ID
    if (attachmentId && globalDurationsRef.current[attachmentId]) {
      setDurations(prev => ({ ...prev, [url]: globalDurationsRef.current[attachmentId] }));
      return;
    }

    // PRIMEIRO: Para blobs locais, verificar se tem duração customizada
    if (url.startsWith('blob:')) {
      try {
        fetch(url)
          .then(response => response.blob())
          .then(blob => {
            const customDuration = (blob as any).__duration;
            if (customDuration && customDuration > 0) {
              setDurations(prev => ({ ...prev, [url]: customDuration }));

              if (attachmentId) {
                globalDurationsRef.current[attachmentId] = customDuration;
              }
              return;
            }

            // Fallback para método normal
            loadFromAudioElement();
          })
          .catch(() => {
            loadFromAudioElement();
          });
      } catch {
        loadFromAudioElement();
      }
    } else {
      // Para URLs do servidor, usar método normal diretamente
      loadFromAudioElement();
    }

    function loadFromAudioElement() {
      // CRIAR ELEMENTO TEMPORÁRIO SEPARADO - NÃO AFETA A REPRODUÇÃO
      const tempAudio = document.createElement('audio');
      const timestampedUrl = timeStampAppendedURL(url);

      const cleanup = () => {
        tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
        tempAudio.removeEventListener('error', onError);
        tempAudio.remove(); // Remove do DOM
      };

      const onLoadedMetadata = () => {
        const duration = tempAudio.duration;

        // SE DURAÇÃO É VÁLIDA, USAR DIRETO
        if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
          setDurations(prev => ({ ...prev, [url]: duration }));

          if (attachmentId) {
            globalDurationsRef.current[attachmentId] = duration;
          }

          cleanup();
          return;
        }

        // SE DURAÇÃO É INFINITY/NaN, APLICAR WORKAROUND
        if (duration === Infinity || isNaN(duration)) {
          // APLICAR FIX DO STACKOVERFLOW NO ELEMENTO TEMPORÁRIO
          tempAudio.currentTime = 1e101; // Força recálculo

          const onTimeUpdate = () => {
            const realDuration = tempAudio.duration;

            if (
              realDuration &&
              !isNaN(realDuration) &&
              isFinite(realDuration) &&
              realDuration > 0
            ) {
              setDurations(prev => ({ ...prev, [url]: realDuration }));

              if (attachmentId) {
                globalDurationsRef.current[attachmentId] = realDuration;
              }

              // Remove listener e limpa
              tempAudio.removeEventListener('timeupdate', onTimeUpdate);
              cleanup();
            }
          };

          // Adicionar listener para timeupdate
          tempAudio.addEventListener('timeupdate', onTimeUpdate);

          // Timeout de segurança (10 segundos)
          setTimeout(() => {
            tempAudio.removeEventListener('timeupdate', onTimeUpdate);
            cleanup();
          }, 10000);
        } else {
          cleanup();
        }
      };

      const onError = () => {
        cleanup();
      };

      // Configurar elemento temporário
      tempAudio.addEventListener('loadedmetadata', onLoadedMetadata);
      tempAudio.addEventListener('error', onError);
      tempAudio.preload = 'metadata';
      tempAudio.volume = 0; // Silencioso
      tempAudio.style.display = 'none'; // Invisível
      tempAudio.src = timestampedUrl;

      // Adicionar ao DOM temporariamente
      document.body.appendChild(tempAudio);
    }
  };

  // const loadDurationFromPlaybackElement = (url: string, attachmentId?: number | string) => {
  //   if (durations[url]) return;

  //   // PRIMEIRO: Para blobs locais, verificar se tem duração customizada
  //   if (url.startsWith('blob:')) {
  //     try {
  //       fetch(url)
  //         .then(response => response.blob())
  //         .then(blob => {
  //           const customDuration = (blob as any).__duration;
  //           if (customDuration && customDuration > 0) {
  //             setDurations(prev => ({ ...prev, [url]: customDuration }));

  //             if (attachmentId) {
  //               globalDurationsRef.current[attachmentId] = customDuration;
  //             }
  //             return;
  //           }

  //           // Fallback para elemento de reprodução
  //           usePlaybackElementForDuration();
  //         })
  //         .catch(() => {
  //           usePlaybackElementForDuration();
  //         });
  //     } catch {
  //       usePlaybackElementForDuration();
  //     }
  //   } else {
  //     // Para URLs do servidor, usar elemento de reprodução diretamente
  //     usePlaybackElementForDuration();
  //   }

  //   function usePlaybackElementForDuration() {

  //     // CRIAR ELEMENTO SEPARADO PARA NÃO INTERFERIR NA REPRODUÇÃO
  //     const tempAudio = document.createElement('audio');

  //     const timestampedUrl = timeStampAppendedURL(url);

  //     const onLoadedMetadata = () => {
  //       const duration = tempAudio.duration;

  //       // SE DURAÇÃO É VÁLIDA, USAR DIRETO
  //       if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
  //         setDurations(prev => ({ ...prev, [url]: duration }));

  //         if (attachmentId) {
  //           globalDurationsRef.current[attachmentId] = duration;
  //         }

  //         cleanup();
  //         return;
  //       }

  //       // SE DURAÇÃO É INFINITY/NaN, APLICAR FIX DO STACKOVERFLOW
  //       if (duration === Infinity || isNaN(duration)) {

  //         // FORÇAR CURRENTTIME PARA VALOR ALTO PARA "QUEBRAR" O INFINITY
  //         tempAudio.currentTime = 1e101; // Número gigante como no StackOverflow

  //         const onTimeUpdate = () => {
  //           const realDuration = tempAudio.duration;

  //           if (
  //             realDuration &&
  //             !isNaN(realDuration) &&
  //             isFinite(realDuration) &&
  //             realDuration > 0
  //           ) {

  //             // NÃO PRECISA RESETAR PORQUE É ELEMENTO TEMPORÁRIO

  //             setDurations(prev => ({ ...prev, [url]: realDuration }));

  //             if (attachmentId) {
  //               globalDurationsRef.current[attachmentId] = realDuration;
  //             }

  //             // Remover listener específico do timeupdate
  //             tempAudio.removeEventListener('timeupdate', onTimeUpdate);
  //             cleanup();
  //           }
  //         };

  //         // Adicionar listener para timeupdate
  //         tempAudio.addEventListener('timeupdate', onTimeUpdate);

  //         // Timeout de segurança para evitar loop infinito
  //         setTimeout(() => {
  //           tempAudio.removeEventListener('timeupdate', onTimeUpdate);
  //           cleanup();
  //         }, 5000);
  //       } else {
  //         cleanup();
  //       }
  //     };

  //     const onError = (error: any) => {
  //       cleanup();
  //     };

  //     const cleanup = () => {
  //       tempAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
  //       tempAudio.removeEventListener('error', onError);
  //       tempAudio.remove(); // Remover elemento temporário
  //     };

  //     // Configurar elemento temporário
  //     tempAudio.addEventListener('loadedmetadata', onLoadedMetadata);
  //     tempAudio.addEventListener('error', onError);
  //     tempAudio.preload = 'metadata';
  //     tempAudio.volume = 0; // Silencioso
  //     tempAudio.style.display = 'none';
  //     tempAudio.src = timestampedUrl;

  //     // Adicionar ao DOM temporariamente
  //     document.body.appendChild(tempAudio);

  //   }
  // };

  const togglePlayback = (attachment: Attachment) => {
    if (!attachment.data_url) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (currentPlaying === attachment.data_url && isPlaying) {
      // Pausar
      audio.pause();
      setIsPlaying(false);
    } else {
      // Reproduzir
      if (currentPlaying !== attachment.data_url) {
        audio.src = attachment.data_url;
        setCurrentPlaying(attachment.data_url);
      }

      audio.play().catch(error => {
        console.error('Erro ao reproduzir áudio:', error);
        toast.error(t('messages.messageAudio.playbackError'), {
          description: t('messages.messageAudio.playbackErrorDescription'),
        });
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      // Verificar se a duração é válida
      if (duration && !isNaN(duration) && isFinite(duration)) {
        setDuration(duration);
        // Armazenar duração para o áudio atual
        if (audio.src) {
          setDurations(prev => ({ ...prev, [audio.src]: duration }));
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setCurrentPlaying(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Aplicar velocidade ao elemento de áudio sempre que mudar
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Carregar durações usando o próprio elemento de reprodução
  useEffect(() => {
    // AGUARDAR UM POUCO PARA O DOM ESTAR PRONTO
    setTimeout(() => {
      attachments.forEach((attachment, _index) => {
        if (attachment.data_url) {
          // PRIMEIRO: Verificar cache global por ID do attachment
          if (attachment.id) {
            const cachedDuration = globalDurationsRef.current[attachment.id];
            if (cachedDuration) {
              setDurations(prev => ({ ...prev, [attachment.data_url!]: cachedDuration }));
              return;
            }
          }

          loadDurationSimple(attachment.data_url, attachment.id);
        }
      });
    }, 100); // 100ms de delay para garantir que o DOM está pronto
  }, [attachments]);

  return (
    <>
      <audio ref={audioRef} preload="metadata" />

      <div className="space-y-2">
        {attachments
          .filter(attachment => {
            // 🔒 FILTRAR: Apenas attachments com data_url válido e não vazio
            return attachment && attachment.data_url && attachment.data_url.trim() !== '';
          })
          .map((attachment, index) => {
            const isCurrentlyPlaying = currentPlaying === attachment.data_url && isPlaying;
            const progressValue =
              currentPlaying === attachment.data_url ? (currentTime / duration) * 100 : 0;

            const transcribedText =
              attachment.transcribed_text || attachment.meta?.transcribed_text;

            return (
              <div key={attachment.id || index} className="space-y-2">
                {/* Audio Player */}
                <div
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  style={{
                    minWidth: '200px',
                    maxWidth: 'min(280px, calc(100vw - 100px))',
                  }}
                >
                  {/* Botão Play/Pause estilo WhatsApp */}
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => togglePlayback(attachment)}
                    className="h-9 w-9 rounded-full bg-primary hover:bg-primary/85 text-primary-foreground flex-shrink-0 border-0 shadow-sm"
                  >
                    {isCurrentlyPlaying ? (
                      <PauseFilled className="h-4 w-4" />
                    ) : (
                      <PlayFilled className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>

                  {/* Waveform visual e tempo */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Barras de onda estilo WhatsApp */}
                    <div className="flex items-center gap-0.5 h-5">
                      {Array.from({ length: 25 }).map((_, i) => {
                        const barHeight = Math.max(3, Math.random() * 16 + 3);
                        const isActive = i < (progressValue / 100) * 25;
                        return (
                          <div
                            key={i}
                            className={`w-0.5 rounded-full transition-all duration-150 ${
                              isActive
                                ? 'bg-primary'
                                : 'bg-muted-foreground/30 dark:bg-muted-foreground/20'
                            }`}
                            style={{
                              height: `${barHeight}px`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Tempo */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">
                        {currentPlaying === attachment.data_url
                          ? formatDuration(currentTime)
                          : '0:00'}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {(() => {
                          const url = attachment.data_url;
                          const duration = url ? durations[url] : null;
                          return duration ? formatDuration(duration) : '0:00';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Botão de velocidade */}
                  <button
                    onClick={cycleSpeed}
                    className={`
                      h-7 px-1.5 rounded text-xs font-bold flex-shrink-0 transition-all duration-150
                      text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted
                      ${playbackRate !== 1 ? 'ring-1 ring-primary text-primary' : ''}
                    `}
                    title="Velocidade de reprodução"
                  >
                    {speedLabel}
                  </button>

                  {/* Menu/Download */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadFile(attachment)}
                    className="h-7 w-7 rounded-full hover:bg-muted-foreground/20 text-muted-foreground flex-shrink-0 p-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Transcription Text */}
                {transcribedText && (
                  <div className="px-2 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
                      {t('messages.messageAudio.transcription')}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {transcribedText}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
};

export default MessageAudio;
