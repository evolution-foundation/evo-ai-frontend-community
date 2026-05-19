import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/** Maximum recording length before UI auto-stop warning (5 min). */
const MAX_RECORDING_SECONDS = 300;

export interface AudioRecordingData {
  blob: Blob;
  url: string;
  duration: number;
  file: File;
}

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  hasRecording: boolean;
  recordingData: AudioRecordingData | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  deleteRecording: () => void;
  isSupported: boolean;
}

interface UseAudioRecorderOptions {
  preferWhatsAppCloudFormat?: boolean;
  /** Called when the recording is auto-stopped due to the 5-min cap (C3). */
  onMaxDurationReached?: () => void;
}

export const useAudioRecorder = (options?: UseAudioRecorderOptions): UseAudioRecorderReturn => {
  const preferWhatsAppCloudFormat = options?.preferWhatsAppCloudFormat === true;
  const onMaxDurationReached = options?.onMaxDurationReached;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingData, setRecordingData] = useState<AudioRecordingData | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0); // Tempo acumulado em pausas
  const pauseStartRef = useRef<number>(0); // Quando pausou
  const isPausedRef = useRef<boolean>(false); // Ref para estado de pausa
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const selectedMimeTypeRef = useRef<string>('audio/webm;codecs=opus');
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TRAVA GLOBAL ANTI-DUPLICAÇÃO
  const isInitializingRef = useRef<boolean>(false);

  // Verificar se navegador suporta MediaRecorder
  const isSupported =
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';

  // Gerar ID único para arquivo
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getSupportedRecordingMimeType = () => {
    const preferredMimeTypes = preferWhatsAppCloudFormat
      ? ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

    const supported = preferredMimeTypes.find(mimeType => MediaRecorder.isTypeSupported(mimeType));
    return supported || '';
  };

  const normalizeMimeType = (mimeType: string) => mimeType.split(';')[0] || 'audio/webm';

  const getFileExtensionFromMimeType = (mimeType: string) => {
    if (mimeType.includes('audio/ogg')) return 'ogg';
    if (mimeType.includes('audio/mp4')) return 'm4a';
    return 'webm';
  };

  // Monitorar nível de áudio
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calcular nível médio
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = average / 255; // Normalizar para 0-1

      setAudioLevel(normalizedLevel);

      if (isRecording && !isPaused) {
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      }
    };

    checkLevel();
  }, [isRecording, isPaused]);

  // Iniciar gravação
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      toast.error('Seu navegador não suporta gravação de áudio');
      return;
    }

    // PROTEÇÃO ROBUSTA CONTRA MÚLTIPLAS GRAVAÇÕES
    if (isRecording || mediaRecorderRef.current || isInitializingRef.current) {
      return;
    }

    // MARCAR COMO INICIALIZANDO
    isInitializingRef.current = true;

    try {
      // Solicitar permissão de microfone (MONO para reduzir tamanho)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // FORÇAR MONO
          sampleRate: preferWhatsAppCloudFormat ? 48000 : undefined, // alvo WhatsApp Cloud
        },
      });

      streamRef.current = stream;

      // Configurar analisador de áudio
      const AudioContextConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Configurar MediaRecorder com prioridade para formatos mais compatíveis com WhatsApp Cloud
      const selectedMimeType = getSupportedRecordingMimeType();
      selectedMimeTypeRef.current = selectedMimeType || 'audio/webm;codecs=opus';
      const mediaRecorderOptions = {
        audioBitsPerSecond: preferWhatsAppCloudFormat ? 128000 : 64000,
      } as MediaRecorderOptions;
      if (selectedMimeType) {
        mediaRecorderOptions.mimeType = selectedMimeType;
      }
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // USAR A DURAÇÃO ARMAZENADA NO MEDIARECORDER
          const storedDuration = (mediaRecorderRef.current as any)?.__finalDuration;
          const finalDuration = storedDuration || duration;

          const mimeType = normalizeMimeType(selectedMimeTypeRef.current);
          const extension = getFileExtensionFromMimeType(mimeType);

          // Criar blob original no formato efetivamente gravado
          const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
          // HACK: Adicionar duração como metadado no blob para MessageAudio
          const finalBlob = new File([recordedBlob], `audio_${generateId()}.${extension}`, {
            type: mimeType,
            lastModified: Date.now(),
          });

          // Anexar duração como propriedade customizada
          (finalBlob as any).__duration = finalDuration;

          const url = URL.createObjectURL(finalBlob);

          // Criar arquivo para upload (sem duração customizada)
          const fileName = `audio_${generateId()}.${extension}`;
          const file = new File([recordedBlob], fileName, { type: mimeType });

          const audioData: AudioRecordingData = {
            blob: finalBlob,
            url,
            duration: finalDuration,
            file,
          };

          // HACK: Salvar duração no blob para áudios gravados localmente
          if (finalDuration > 0) {
            (finalBlob as any).__duration = finalDuration;
          }

          setRecordingData(audioData);
          setHasRecording(true);
        } catch {
          toast.error('Erro ao processar gravação de áudio');

          // Fallback: usar blob original
          const finalDuration = duration; // DECLARAR AQUI TAMBÉM
          const mimeType = normalizeMimeType(selectedMimeTypeRef.current);
          const extension = getFileExtensionFromMimeType(mimeType);
          const recordedBlob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(recordedBlob);
          const fileName = `audio_${generateId()}.${extension}`;
          const file = new File([recordedBlob], fileName, { type: mimeType });

          const audioData: AudioRecordingData = {
            blob: recordedBlob,
            url,
            duration: finalDuration,
            file,
          };

          setRecordingData(audioData);
          setHasRecording(true);
        }

        // Limpar recursos
        setIsRecording(false);
        setIsPaused(false);
        setAudioLevel(0);

        // LIMPAR MEDIARECORDER
        mediaRecorderRef.current = null;

        // Limpar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Limpar contexto de áudio
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Limpar intervalos
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      mediaRecorder.onerror = event => {
        console.error('Erro na gravação:', event);
        toast.error('Erro durante a gravação de áudio');
        stopRecording();
      };

      // Iniciar gravação
      mediaRecorder.start(1000); // Coletar dados a cada 1 segundo
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0; // Reset tempo pausado
      pauseStartRef.current = 0; // Reset início da pausa
      isPausedRef.current = false; // Reset ref de pausa

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setHasRecording(false);

      // LIBERAR TRAVA - GRAVAÇÃO INICIADA COM SUCESSO
      isInitializingRef.current = false;

      // Iniciar timer
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current && !isPausedRef.current) {
          const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000;
          setDuration(elapsed);
        }
      }, 100); // Atualizar a cada 100ms para suavidade
      setRecordingData(null);

      // Cap de duração máxima (5 min) — evita UI freeze em transcodificação longa (C3).
      // Acessa refs diretamente para evitar stale closure no isRecording do useCallback.
      maxDurationTimerRef.current = setTimeout(() => {
        onMaxDurationReached?.();
        if (mediaRecorderRef.current) {
          isPausedRef.current = true; // Para o timer imediatamente
          (mediaRecorderRef.current as any).__finalDuration = startTimeRef.current
            ? (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
            : 0;
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);

      // Iniciar monitoramento
      monitorAudioLevel();
    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Erro ao acessar o microfone. Verifique as permissões.');

      // LIBERAR TRAVA EM CASO DE ERRO
      isInitializingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, preferWhatsAppCloudFormat]);

  // Parar gravação
  const stopRecording = useCallback(() => {
    // CAPTURAR DURAÇÃO ATUAL ANTES DE PARAR TUDO
    const currentDuration = startTimeRef.current
      ? (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
      : duration;

    if (mediaRecorderRef.current && isRecording) {
      // Armazenar duração final ANTES de parar o MediaRecorder
      (mediaRecorderRef.current as any).__finalDuration = currentDuration;
      mediaRecorderRef.current.stop();
    }

    // Resetar estados
    isPausedRef.current = true; // Para o timer imediatamente

    // Limpar timers quando parar
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [isRecording, duration]);

  // Pausar gravação
  const pauseRecording = useCallback(() => {
    if (isRecording && !isPaused) {
      setIsPaused(true);
      isPausedRef.current = true;

      // Registrar quando pausou
      pauseStartRef.current = Date.now();
    }
  }, [isRecording, isPaused, duration]);

  // Retomar gravação
  const resumeRecording = useCallback(() => {
    if (isRecording && isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;

      // Acumular tempo pausado
      if (pauseStartRef.current > 0) {
        const pauseDuration = Date.now() - pauseStartRef.current;
        pausedTimeRef.current += pauseDuration;
        pauseStartRef.current = 0;
      }
    }
  }, [isRecording, isPaused]);

  // Deletar gravação
  const deleteRecording = useCallback(() => {
    if (recordingData) {
      URL.revokeObjectURL(recordingData.url);
    }

    setRecordingData(null);
    setHasRecording(false);
    setDuration(0);
    setAudioLevel(0);
  }, [recordingData]);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    hasRecording,
    recordingData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    deleteRecording,
    isSupported,
  };
};
