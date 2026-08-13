/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { Button } from '@evoapi/design-system/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system/tooltip';
import {
  Send,
  Mic,
  Loader2,
  Smile,
  X,
  Reply,
  PenLine,
} from 'lucide-react';
import { toast } from 'sonner';

import { AudioRecordingData } from '@/hooks/chat/useAudioRecorder';
import { useCannedResponses } from '@/hooks/chat/useCannedResponses';
import { useMessageSignature } from '@/hooks/useMessageSignature';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuth } from '@/contexts/AuthContext';

import FileUpload from './FileUpload';
import FilePreview from './FilePreview';
import EmojiPicker from './EmojiPicker';
import ComposerPlusMenu from './ComposerPlusMenu';
import MacrosButton from './MacrosButton';
import ScheduleMessageModal from './ScheduleMessageModal';
import NoteComposer from './NoteComposer';
import AudioRecorder from '../audio';

import { AIAssistanceButton } from '../ai-assistance';
import { CannedResponsesList } from '../canned-responses';
import { buildCannedResponseMessage } from './buildCannedResponseMessage';
import { RichTextEditor, RichTextEditorRef } from '../rich-text-editor';

import { Message } from '@/types/chat/api';
import type { CannedResponse } from '@/types/knowledge';

import { MessageTemplateModal } from '../message-template';
import '../rich-text-editor/RichTextEditor.css';
import { getModifierSymbol } from '@/utils/platform';

interface SendMessageOptions {
  content: string;
  files?: File[];
  isPrivate?: boolean;
  templateParams?: any;
  cannedResponseId?: string | null;
  /**
   * Marks attachments as recorded audio (PTT) for the backend.
   * - `true`: every attachment in this message is recorded audio (e.g. recorder UI).
   * - `string[]`: list of filenames within the attachments that are recorded audio
   *   (used when audio + non-audio files are sent in the same message).
   */
  isRecordedAudio?: boolean | string[];
}

interface MessageInputProps {
  onSendMessage: (options: SendMessageOptions) => Promise<void>;
  isDisabled?: boolean;
  isPendingConversation?: boolean;
  placeholder?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  conversationId?: string | number;
  inboxId: string;
  channelType?: string;
  channelProvider?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isDisabled = false,
  isPendingConversation = false,
  onTypingStart,
  onTypingStop,
  replyToMessage,
  onCancelReply,
  conversationId,
  inboxId,
  channelType,
  channelProvider,
}) => {
  const { t } = useLanguage('chat');
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Detectar se é WhatsApp Cloud (apenas Cloud, não baileys/evolution/evolution_go)
  // Usado para features específicas da Cloud API (templates, etc.)
  const isWhatsAppCloud = React.useMemo(() => {
    if (channelType !== 'Channel::Whatsapp') return false;
    const provider = channelProvider?.toLowerCase();
    return provider === 'whatsapp_cloud' || provider === 'default' || !provider || provider === '';
  }, [channelType, channelProvider]);

  // Qualquer canal WhatsApp (Cloud, Baileys, Evolution, EvoGo) — usado para conversão de áudio PTT
  const isWhatsApp = React.useMemo(() => {
    return channelType === 'Channel::Whatsapp';
  }, [channelType]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const richEditorRef = useRef<RichTextEditorRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const composerRootRef = useRef<HTMLDivElement>(null);

  // 🎯 EMOJI PICKER: Estado
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 🎯 MESSAGE SIGNATURE: Hook para gerenciar assinatura
  const { isSignatureEnabled, toggleSignature, hasSignature, appendSignatureIfEnabled } =
    useMessageSignature();

  // 🎯 CANNED RESPONSES: Estado e hook
  const [selectedCannedResponse, setSelectedCannedResponse] = useState<CannedResponse | null>(null);
  const [selectedCannedResponseId, setSelectedCannedResponseId] = useState<string | null>(null);

  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [cannedResponseQuery, setCannedResponseQuery] = useState('');
  const [selectedCannedIndex, setSelectedCannedIndex] = useState(0);
  const [currentEditorMessage, setCurrentEditorMessage] = useState('');
  const { searchCannedResponses, isLoading: isCannedResponsesLoading } = useCannedResponses({
    enabled: !!inboxId,
  });

  const hasCannedMedia =
    !!selectedCannedResponse &&
    !!selectedCannedResponse.attachments &&
    selectedCannedResponse.attachments.length > 0;

  // 🎯 CANNED RESPONSES: Detectar "/" no input e filtrar
  const detectCannedResponseTrigger = useCallback(
    (text: string) => {
      // Detectar se digitou "/" no início ou após espaço
      const match = text.match(/(?:^|\s)\/([\w-]*)$/);

      if (match) {
        const query = match[1] || ''; // Texto após "/"
        setCannedResponseQuery(query);
        setShowCannedResponses(true);
        setSelectedCannedIndex(0); // Reset seleção ao abrir
        return true;
      }

      // Se não tem "/", fecha o dropdown
      if (showCannedResponses) {
        setShowCannedResponses(false);
        setCannedResponseQuery('');
      }

      return false;
    },
    [showCannedResponses],
  );

  const handleSelectCannedResponse = useCallback(
    async (cannedResponse: CannedResponse) => {
      const newMessage = buildCannedResponseMessage(
        richEditorRef.current?.getContent() || '',
        cannedResponse.content,
      );

      richEditorRef.current?.setContent(newMessage);
      setCurrentEditorMessage(newMessage);

      // A canned response with media owns the attachment slot (channels send a single
      // attachment); drop any manually-added files so both are never sent together.
      if ((cannedResponse.attachments?.length ?? 0) > 0) {
        if (selectedFiles.length > 0) {
          toast.info(t('messageInput.cannedResponse.manualAttachmentsRemoved'));
          setSelectedFiles([]);
        }
      }

      setSelectedCannedResponse(cannedResponse);
      setSelectedCannedResponseId(cannedResponse.id);

      setShowCannedResponses(false);
      setCannedResponseQuery('');
      setSelectedCannedIndex(0);

      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 0);
    },
    [selectedFiles, t],
  );

  // 🎯 CANNED RESPONSES: Filtrar respostas com base na query
  const filteredCannedResponses = React.useMemo(() => {
    if (!showCannedResponses) return [];
    return searchCannedResponses(cannedResponseQuery);
  }, [showCannedResponses, cannedResponseQuery, searchCannedResponses]);

  useEffect(() => {
    if (replyToMessage) {
      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 100);
    }
  }, [replyToMessage]);

  useEffect(() => {
    if (conversationId) {
      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 200);
    }
  }, [conversationId]);

  // Gerenciar indicador de digitação
  const handleTypingStart = useCallback(() => {
    if (!isTyping && onTypingStart) {
      setIsTyping(true);
      onTypingStart();
    }

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Definir novo timeout para parar de digitar após 3 segundos de inatividade
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && onTypingStop) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 3000);
  }, [isTyping, onTypingStart, onTypingStop]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTyping && onTypingStop) {
      setIsTyping(false);
      onTypingStop();
    }
  }, [isTyping, onTypingStop]);

  // Cleanup do timeout na desmontagem
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Lidar com gravação de áudio
  const handleAudioRecordingComplete = useCallback(
    async (data: AudioRecordingData) => {
      try {
        setIsSending(true);

        // Gravador (opus-recorder) já entrega OGG/Opus direto — sem conversão extra.
        const audioFile = data.file;

        // Enviar arquivo de áudio (isRecordedAudio sinaliza ao backend para setar PTT/voice)
        await onSendMessage({
          content: '',
          files: [audioFile],
          isPrivate: false,
          templateParams: undefined,
          cannedResponseId: null,
          isRecordedAudio: true,
        });

        setIsRecordingAudio(false);
        toast.success(t('messageInput.audio.sentSuccess'));
      } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        toast.error(t('messageInput.audio.sendError'));
      } finally {
        setIsSending(false);
      }
    },
    [onSendMessage, t],
  );

  const handleAudioRecordingCancel = useCallback(() => {
    setIsRecordingAudio(false);
  }, []);

  const startAudioRecording = useCallback(() => {
    setIsRecordingAudio(true);
  }, []);

  // 🎯 EMOJI PICKER: Handler para toggle do emoji picker
  const handleEmojiClick = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      richEditorRef.current?.insertText(emoji);
    },
    [],
  );

  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Notas da Conversa (§3.4) — a faixa SUBSTITUI a barra normal do composer
  // (não é modal); salvar envia como mensagem privada (mesmo pipeline de
  // onSendMessage), sem endpoint/entidade própria.
  const [notesMode, setNotesMode] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveNote = useCallback(
    async (content: string) => {
      setIsSavingNote(true);
      try {
        await onSendMessage({ content, isPrivate: true });
        setNotesMode(false);
      } catch (error) {
        console.error('Error saving note:', error);
      } finally {
        setIsSavingNote(false);
      }
    },
    [onSendMessage],
  );

  const handleTemplateClick = useCallback(() => {
    setShowTemplatesModal(true);
  }, []);

  const handleSendTemplate = useCallback(
    async (payload: { message: string; templateParams?: any }) => {
      try {
        setIsSending(true);
        await onSendMessage({
          content: payload.message,
          files: undefined,
          isPrivate: false,
          templateParams: payload.templateParams,
          cannedResponseId: null,
        });
        setShowTemplatesModal(false);
        toast.success(t('messageTemplates.success.sent'));
      } catch (error) {
        console.error('Error sending WhatsApp template:', error);
        toast.error(t('messageTemplates.errors.sendError'));
      } finally {
        setIsSending(false);
      }
    },
    [onSendMessage, t],
  );

  // 🎯 CANNED RESPONSES: Abrir/fechar dropdown via botão
  const handleCannedResponsesClick = useCallback(() => {
    if (showCannedResponses) {
      // Se já está aberto, fechar
      setShowCannedResponses(false);
      setCannedResponseQuery('');
      setSelectedCannedIndex(0);
    } else {
      // Abrir com todas as respostas (sem filtro)
      setCannedResponseQuery('');
      setShowCannedResponses(true);
      setSelectedCannedIndex(0);

      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 0);
    }
  }, [showCannedResponses]);

  const handleSend = async () => {
    let currentMessage = richEditorRef.current?.getContent() || '';

    if ((!currentMessage && selectedFiles.length === 0) || isDisabled || isSending) {
      return;
    }

    if (hasSignature) {
      currentMessage = appendSignatureIfEnabled(currentMessage);
    }

    setIsSending(true);

    try {
      // Uploaded audio files are sent as-is. For WhatsApp, Baileys/EvoGo will mark
      // them as PTT (Cloud already hardcodes voice:true). The browser recorder path
      // delivers OGG/Opus directly via opus-recorder, so this fallback only matters
      // when a user manually attaches a file (mp3/m4a/wav/etc.).
      const filesToSend = selectedFiles;
      const recordedAudioFilenames: string[] =
        isWhatsApp ? selectedFiles.filter(f => f.type.startsWith('audio/')).map(f => f.name) : [];

      await onSendMessage({
        content: currentMessage,
        files: filesToSend.length > 0 ? filesToSend : undefined,
        isPrivate: false,
        templateParams: undefined,
        cannedResponseId: selectedCannedResponseId,
        isRecordedAudio: recordedAudioFilenames.length > 0 ? recordedAudioFilenames : undefined,
      });

      richEditorRef.current?.clear();
      setCurrentEditorMessage('');
      setSelectedFiles([]);
      setUploadProgress({});

      setSelectedCannedResponse(null);
      setSelectedCannedResponseId(null);

      if (replyToMessage && onCancelReply) {
        onCancelReply();
      }

      handleTypingStop();

      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setUploadProgress({});
    }
  };

  // 🎯 CANNED RESPONSES: Navegação por teclado
  const handleCannedResponseKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Se o dropdown de canned responses está aberto
      if (showCannedResponses && filteredCannedResponses.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCannedIndex(prev =>
            prev < filteredCannedResponses.length - 1 ? prev + 1 : prev,
          );
          return true;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCannedIndex(prev => (prev > 0 ? prev - 1 : prev));
          return true;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const selectedCanned = filteredCannedResponses[selectedCannedIndex];
          if (selectedCanned) {
            handleSelectCannedResponse(selectedCanned);
          }
          return true;
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCannedResponses(false);
          setCannedResponseQuery('');
          setSelectedCannedIndex(0);
          return true;
        }
      }

      return false;
    },
    [showCannedResponses, filteredCannedResponses, selectedCannedIndex, handleSelectCannedResponse],
  );

  // Fecha o dropdown de respostas prontas ao clicar fora ou Escape, INDEPENDENTE
  // de foco no editor — handleCannedResponseKeyDown só roda via handleKeyDown do
  // ProseMirror (exige foco no contenteditable) e nem cobre lista vazia (guard
  // `filteredCannedResponses.length > 0`), então sem isto o dropdown ficava preso
  // aberto sempre que o Escape chegava sem o editor focado ou a busca não achava nada.
  useEffect(() => {
    if (!showCannedResponses) return;
    const onPointerDown = (e: MouseEvent) => {
      if (composerRootRef.current && !composerRootRef.current.contains(e.target as Node)) {
        setShowCannedResponses(false);
        setCannedResponseQuery('');
        setSelectedCannedIndex(0);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCannedResponses(false);
        setCannedResponseQuery('');
        setSelectedCannedIndex(0);
      }
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showCannedResponses]);

  const handleFilesSelected = useCallback((files: File[]) => {
    if (hasCannedMedia) {
      toast.info(t('messageInput.cannedResponse.mediaBlocksManualUpload'));
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
    const count = files.length;
    toast.success(
      count === 1
        ? t('messageInput.fileUpload.success.fileAdded')
        : t('messageInput.fileUpload.success.filesAdded', { count }),
      {
        duration: 2000,
      },
    );
  }, [t, hasCannedMedia]);

  // Handle media paste from clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isDisabled || isSending) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        handleFilesSelected(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isDisabled, isSending, handleFilesSelected]);

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendFiles = async () => {
    await handleSend();
  };

  const canSend = (() => {
    // Conversa pendente: composer fica bloqueado por completo (overlay "Abrir
    // para responder"), nada pode ser enviado até reabrir.
    if (isPendingConversation) {
      return false;
    }

    const currentMessage = richEditorRef.current?.getContent() || '';
    return currentMessage.length > 0 && !isDisabled && !isSending;
  })();

  // Morph do botão mic/enviar (§3.8, estilo do protótipo): vazio → mic,
  // qualquer conteúdo digitado → enviar. Gravação em andamento tem prioridade.
  const hasTypedContent = currentEditorMessage.trim().length > 0;
  const showSendIcon = isRecordingAudio ? false : hasTypedContent || isPendingConversation;

  // Texto do tooltip do botão de enviar
  const sendButtonTooltip = React.useMemo(() => {
    const messageKey = user?.ui_settings?.editor_message_key || 'enter';

    if (messageKey === 'cmd_enter') {
      const modifier = getModifierSymbol();
      return `Enviar (${modifier} + Enter)`;
    }

    return 'Enviar (Enter)';
  }, [user?.ui_settings?.editor_message_key]);

  // Componente de preview da resposta
  const ReplyPreview = ({ message, onCancel }: { message: Message; onCancel: () => void }) => (
    <div className="w-full border-t-0 border-x-0 border-b border-border bg-muted/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Reply className="h-4 w-4" />
          <span className="font-medium">
            {t('messageInput.replyPreview.replyingTo', {
              name: message.sender?.name || t('messageInput.replyPreview.userFallback'),
            })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto hover:bg-destructive/20 hover:text-destructive"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="mt-2 pl-6">
        <div className="text-sm text-muted-foreground bg-background border-l-2 border-primary/30 pl-3 py-1 rounded-r max-w-md">
          {message.content ? (
            <span className="line-clamp-2">{message.content}</span>
          ) : message.attachments && message.attachments.length > 0 ? (
            <span className="italic">
              {t('messageInput.replyPreview.fileAttachment', {
                fileType:
                  message.attachments[0].file_type || t('messageInput.replyPreview.fileFallback'),
              })}
            </span>
          ) : (
            <span className="italic">{t('messageInput.replyPreview.noContent')}</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Preview de resposta */}
      {replyToMessage && (
        <ReplyPreview message={replyToMessage} onCancel={() => onCancelReply?.()} />
      )}

      <div ref={composerRootRef} className="w-full border-t border-border bg-background relative">
        {/* File Preview – só quando NÃO tiver mídia da canned */}
        {selectedFiles.length > 0 && !hasCannedMedia && (
          <div className="border-b border-border bg-muted/30">
            <FilePreview
              files={selectedFiles}
              onRemove={handleRemoveFile}
              onSend={handleSendFiles}
              isSending={isSending}
              uploadProgress={uploadProgress}
            />
          </div>
        )}

        {/* Banner da mídia da resposta rápida selecionada */}
        {hasCannedMedia && (
          <div className="border-b border-border bg-muted/20 px-4 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('messageInput.cannedResponse.mediaBanner', {
                  count: selectedCannedResponse!.attachments!.length,
                })}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              aria-label={t('messageInput.cannedResponse.removeMediaAriaLabel')}
              onClick={() => {
                setSelectedCannedResponse(null);
                setSelectedCannedResponseId(null);
              }}
              disabled={isSending}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* 🎯 CANNED RESPONSES: Dropdown de sugestões */}
        {showCannedResponses && (
          <div className="px-4 pt-2">
            <CannedResponsesList
              cannedResponses={filteredCannedResponses}
              selectedIndex={selectedCannedIndex}
              searchQuery={cannedResponseQuery}
              isLoading={isCannedResponsesLoading}
              onSelect={handleSelectCannedResponse}
            />
          </div>
        )}

        {notesMode ? (
          <NoteComposer onSave={handleSaveNote} onExit={() => setNotesMode(false)} isSaving={isSavingNote} />
        ) : isRecordingAudio ? (
          <AudioRecorder
            onRecordingComplete={handleAudioRecordingComplete}
            onRecordingCancel={handleAudioRecordingCancel}
            disabled={isDisabled || isSending}
            autoStart={true}
            preferWhatsAppCloudFormat={isWhatsApp}
          />
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 relative">
            {/* Overlay de bloqueio (status ≠ aberto) — cobre a barra inteira; SÓ
                cadeado + texto, sem duplicar o botão "Abrir" (fica no header). */}
            {isPendingConversation && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/95 backdrop-blur-[1px] px-4 text-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <p className="text-sm text-muted-foreground font-medium">
                  {t('messageInput.placeholders.pendingNote')}
                </p>
              </div>
            )}

            {/* + menu */}
            {/* isDisabled em canal WhatsApp Cloud só acontece pela janela de 24h (a
                desconexão Z-API/Evolution é exclusiva de outros providers) — nesse caso
                a única saída é enviar um template, então o "+" precisa continuar
                clicável até lá em vez de travar o agente sem nenhuma rota de resposta. */}
            <ComposerPlusMenu
              disabled={
                (isDisabled && !isWhatsAppCloud) || isSending || isPendingConversation
              }
              restrictToTemplatesOnly={isDisabled && isWhatsAppCloud && !isSending && !isPendingConversation}
              onOpenQuickReplies={handleCannedResponsesClick}
              onPickDocuments={() =>
                document.getElementById('composer-file-input-document')?.click()
              }
              onPickMedia={() => document.getElementById('composer-file-input-media')?.click()}
              onOpenConversationNote={() => setNotesMode(true)}
              onSchedule={() => setShowScheduleModal(true)}
              onOpenTemplates={isWhatsAppCloud ? handleTemplateClick : undefined}
              // Below md, Emoji/Macros/Assinatura/IA fold into this menu instead of
              // their own always-visible icons — six icon buttons plus the text
              // field otherwise squeeze the composer pill down to near-nothing on
              // phone-width screens (see useIsMobile below).
              mobileExtraActions={
                isMobile
                  ? {
                      onOpenEmoji: handleEmojiClick,
                      onOpenMacros: conversationId
                        ? () => document.getElementById('composer-macros-trigger')?.click()
                        : undefined,
                      onToggleSignature:
                        hasSignature && !isPendingConversation ? toggleSignature : undefined,
                      onOpenAIAssistance: () =>
                        document.getElementById('composer-ai-trigger')?.click(),
                    }
                  : undefined
              }
            />

            {/* Emoji — hidden below md, folded into the "+" menu instead (see mobileExtraActions above) */}
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                disabled={isDisabled || isSending || isPendingConversation}
                className="hidden md:inline-flex h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
                onClick={handleEmojiClick}
              >
                <Smile className="h-[22px] w-[22px] text-primary" strokeWidth={2.2} />
              </Button>
              <EmojiPicker
                isOpen={showEmojiPicker}
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>

            {/* Macros — hidden below md, folded into the "+" menu instead */}
            {conversationId && (
              <MacrosButton
                conversationId={String(conversationId)}
                disabled={isDisabled || isSending || isPendingConversation}
                triggerId="composer-macros-trigger"
              />
            )}

            {/* Message Signature (extra do CRM, sem equivalente no protótipo — mantido).
                Hidden below md, folded into the "+" menu instead. */}
            {hasSignature && !isPendingConversation && (
              <div className="relative group flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled || isSending}
                  className={`hidden md:inline-flex h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50 transition-colors ${
                    isSignatureEnabled ? 'text-green-600 dark:text-green-400' : ''
                  }`}
                  onClick={toggleSignature}
                >
                  <PenLine className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {isSignatureEnabled
                    ? t('messageInput.signature.disable')
                    : t('messageInput.signature.enable')}
                </div>
              </div>
            )}

            {/* Pill input — 1 linha, sem card ao redor, igual ao protótipo */}
            <div className="flex-1 min-w-0 relative">
              <RichTextEditor
                ref={richEditorRef}
                placeholder={t('messageInput.placeholders.default')}
                onChange={content => {
                  setCurrentEditorMessage(content);
                  detectCannedResponseTrigger(content);
                  if (content.trim()) {
                    handleTypingStart();
                  } else {
                    handleTypingStop();
                  }
                }}
                onKeyDown={event => {
                  if (handleCannedResponseKeyDown(event as unknown as React.KeyboardEvent)) {
                    return true;
                  }

                  const messageKey = user?.ui_settings?.editor_message_key || 'enter';

                  if (messageKey === 'enter') {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                      return true;
                    }
                  } else if (messageKey === 'cmd_enter') {
                    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      handleSend();
                      return true;
                    }
                  }

                  return false;
                }}
                disabled={isDisabled || isSending || isPendingConversation}
                singleLine
                className="flex items-center min-h-[46px] w-full rounded-[23px] border border-border bg-background px-[22px] py-[10px]"
              />
            </div>

            {/* Hidden pickers driven by ComposerPlusMenu — one owns the global
                drag&drop overlay (category "all") so drop UX stays unchanged;
                the other two are click-only (menu-triggered) pickers. */}
            <FileUpload
              inputId="composer-file-input-all"
              onFilesSelected={handleFilesSelected}
              maxFileSize={100}
              multiple={true}
              category="all"
              disabled={isDisabled || isSending || isPendingConversation || hasCannedMedia}
            >
              <></>
            </FileUpload>
            <FileUpload
              inputId="composer-file-input-document"
              onFilesSelected={handleFilesSelected}
              maxFileSize={100}
              multiple={true}
              category="document"
              enableGlobalDropZone={false}
              disabled={isDisabled || isSending || isPendingConversation || hasCannedMedia}
            >
              <></>
            </FileUpload>
            <FileUpload
              inputId="composer-file-input-media"
              onFilesSelected={handleFilesSelected}
              maxFileSize={100}
              multiple={true}
              category="media"
              enableGlobalDropZone={false}
              disabled={isDisabled || isSending || isPendingConversation || hasCannedMedia}
            >
              <></>
            </FileUpload>

            {/* AI Assistance (sparkles) */}
            <AIAssistanceButton
              currentMessage={currentEditorMessage}
              onApplyText={text => {
                richEditorRef.current?.setContent(text);
                setCurrentEditorMessage(text);
              }}
              disabled={isDisabled || isSending || isPendingConversation}
              conversationId={conversationId?.toString()}
              triggerId="composer-ai-trigger"
            />

            {/* Mic / Send — troca conforme conteúdo digitado */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {showSendIcon ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSend}
                      disabled={!canSend}
                      className="h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50 text-primary"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDisabled || isSending}
                      className={`h-9 w-9 flex-shrink-0 hover:bg-accent transition-all duration-200 ${
                        isRecordingAudio ? 'text-destructive' : 'text-primary'
                      }`}
                      onClick={startAudioRecording}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showSendIcon ? sendButtonTooltip : t('messageInput.audio.recordTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Message Templates Modal */}
      <MessageTemplateModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        inboxId={inboxId}
        channelType={channelType}
        isWhatsAppCloud={isWhatsAppCloud}
        onSend={handleSendTemplate}
      />

      {/* Schedule Message Modal */}
      {conversationId && (
        <ScheduleMessageModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          conversationId={conversationId}
          channelType={channelType}
          messageContent={currentEditorMessage}
        />
      )}
    </>
  );
};

export default React.memo(MessageInput);
