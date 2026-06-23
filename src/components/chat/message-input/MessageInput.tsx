/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { Button } from '@evoapi/design-system/button';
import { Card, CardContent } from '@evoapi/design-system/card';
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
  FileText,
  X,
  Reply,
  PenLine,
  MessageSquareText,
} from 'lucide-react';
import { toast } from 'sonner';

import { AudioRecordingData } from '@/hooks/chat/useAudioRecorder';
import { useCannedResponses } from '@/hooks/chat/useCannedResponses';
import { useMessageSignature } from '@/hooks/useMessageSignature';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/contexts/AuthContext';

import FileUpload from './FileUpload';
import FilePreview from './FilePreview';
import EmojiPicker from './EmojiPicker';
import ReplyModeToggle from '../ReplyModeToggle';
import AudioRecorder from '../audio';

import { AIAssistanceButton } from '../ai-assistance';
import { CannedResponsesList } from '../canned-responses';
import { buildCannedResponseMessage } from './buildCannedResponseMessage';
import { RichTextEditor, RichTextEditorRef } from '../rich-text-editor';

import { ReplyMode, Message } from '@/types/chat/api';
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

  // Detectar se é Instagram (também precisa de conversão de áudio WebM para WAV)
  const isInstagram = React.useMemo(() => {
    return channelType === 'Channel::Instagram';
  }, [channelType]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [replyMode, setReplyMode] = useState<ReplyMode>(ReplyMode.REPLY);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const richEditorRef = useRef<RichTextEditorRef>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      setSelectedCannedResponse(cannedResponse);
      setSelectedCannedResponseId(cannedResponse.id);

      setShowCannedResponses(false);
      setCannedResponseQuery('');
      setSelectedCannedIndex(0);

      setTimeout(() => {
        richEditorRef.current?.focus();
      }, 0);
    },
    [],
  );

  // 🎯 CANNED RESPONSES: Filtrar respostas com base na query
  const filteredCannedResponses = React.useMemo(() => {
    if (!showCannedResponses) return [];
    return searchCannedResponses(cannedResponseQuery);
  }, [showCannedResponses, cannedResponseQuery, searchCannedResponses]);

  // Forçar modo de nota privada quando a conversa está pendente
  useEffect(() => {
    if (isPendingConversation && replyMode !== ReplyMode.NOTE) {
      setReplyMode(ReplyMode.NOTE);
    }
  }, [isPendingConversation, replyMode]);

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
        const isPrivate = replyMode === ReplyMode.NOTE;

        // Gravador (opus-recorder) já entrega OGG/Opus direto — sem conversão extra.
        const audioFile = data.file;

        // Enviar arquivo de áudio (isRecordedAudio sinaliza ao backend para setar PTT/voice)
        await onSendMessage({
          content: '',
          files: [audioFile],
          isPrivate,
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
    [onSendMessage, replyMode, t, isWhatsApp, isInstagram],
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
    const isPrivate = replyMode === ReplyMode.NOTE;
    let currentMessage = richEditorRef.current?.getContent() || '';

    if ((!currentMessage && selectedFiles.length === 0) || isDisabled || isSending) {
      return;
    }

    if (!isPrivate && hasSignature) {
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
        isPrivate,
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

        if (e.key === 'Enter') {
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

  const handleFilesSelected = useCallback((files: File[]) => {
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
  }, [t]);

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
    const isPrivate = replyMode === ReplyMode.NOTE;
    const currentMessage = richEditorRef.current?.getContent() || '';

    // Se a conversa está pendente, só permitir notas privadas
    if (isPendingConversation && !isPrivate) {
      return false;
    }

    // Para conversas pendentes, não permitir arquivos (apenas notas privadas de texto)
    if (isPendingConversation && selectedFiles.length > 0) {
      return false;
    }

    return currentMessage.length > 0 && !isDisabled && !isSending;
  })();

  // Texto do tooltip do botão de enviar
  const sendButtonTooltip = React.useMemo(() => {
    const messageKey = user?.ui_settings?.editor_message_key || 'enter';

    if (messageKey === 'cmd_enter') {
      const modifier = getModifierSymbol();
      return `Enviar (${modifier} + Enter)`;
    }

    return 'Enviar (Enter)';
  }, [user?.ui_settings?.editor_message_key]);

  const cardClassNames = `
    w-full border-t border-x-0 border-b-0 rounded-none shadow-lg py-0 gap-0 transition-all duration-200 bg-background
  `;

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
            {replyMode === ReplyMode.NOTE && (
              <span className="ml-1 text-xs text-orange-600 font-normal">
                {t('messageInput.replyPreview.asPrivateNote')}
              </span>
            )}
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

      <Card className={cardClassNames}>
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
                Esta resposta rápida inclui {selectedCannedResponse!.attachments!.length} arquivo(s)
                de mídia. Eles serão enviados junto com a mensagem.
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
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

        {/* Input Area */}
        <CardContent className="p-3 md:p-4 relative">
          {/* 🎯 CANNED RESPONSES: Dropdown de sugestões */}
          {showCannedResponses && (
            <CannedResponsesList
              cannedResponses={filteredCannedResponses}
              selectedIndex={selectedCannedIndex}
              searchQuery={cannedResponseQuery}
              isLoading={isCannedResponsesLoading}
              onSelect={handleSelectCannedResponse}
            />
          )}

          {/* Primeira linha: Reply Mode Toggle + Botões de ação rápida */}
          <div className="flex items-center justify-between mb-3 gap-3">
            {/* Reply Mode Toggle */}
            <ReplyModeToggle
              currentMode={isPendingConversation ? ReplyMode.NOTE : replyMode}
              onModeChange={isPendingConversation ? () => {} : setReplyMode}
              disabled={isDisabled || isSending || isPendingConversation}
              forcedMode={isPendingConversation ? ReplyMode.NOTE : undefined}
            />

            {/* Botões de ação rápida - à direita */}
            <div className="flex-shrink-0 flex items-center gap-1.5">
              {/* Message Signature Button */}
              {hasSignature && replyMode === ReplyMode.REPLY && !isPendingConversation && (
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isDisabled || isSending}
                    className={`h-9 w-9 flex-shrink-0 border-input hover:bg-accent hover:border-accent-foreground/20 disabled:opacity-50 transition-colors ${
                      isSignatureEnabled
                        ? 'bg-green-50 border-green-500 dark:bg-green-950/30 dark:border-green-500'
                        : ''
                    }`}
                    onClick={toggleSignature}
                  >
                    <PenLine
                      className={`h-4 w-4 ${
                        isSignatureEnabled ? 'text-green-600 dark:text-green-400' : ''
                      }`}
                    />
                  </Button>
                  <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {isSignatureEnabled
                      ? t('messageInput.signature.disable')
                      : t('messageInput.signature.enable')}
                    <div className="absolute top-full right-3 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Assistance Button */}
              <AIAssistanceButton
                currentMessage={currentEditorMessage}
                onApplyText={text => {
                  richEditorRef.current?.setContent(text);
                  setCurrentEditorMessage(text);
                }}
                disabled={isDisabled || isSending || isPendingConversation}
                conversationId={conversationId?.toString()}
              />
            </div>
          </div>

          {/* Input full-width, action buttons in a row below */}
          <div className="w-full overflow-visible">
            {/* Text Input Container */}
            <div className="w-full min-w-0 overflow-hidden">
              <RichTextEditor
                ref={richEditorRef}
                placeholder={
                  isPendingConversation
                    ? t('messageInput.placeholders.pendingNote')
                    : replyMode === ReplyMode.NOTE
                      ? t('messageInput.placeholders.privateNote')
                      : t('messageInput.placeholders.default')
                }
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

                  if (event.altKey) {
                    if (event.key === 'p' || event.key === 'P') {
                      event.preventDefault();
                      setReplyMode(ReplyMode.NOTE);
                      return true;
                    }
                    if (event.key === 'l' || event.key === 'L') {
                      event.preventDefault();
                      setReplyMode(ReplyMode.REPLY);
                      return true;
                    }
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
                disabled={isDisabled || isSending || (isPendingConversation && replyMode !== ReplyMode.NOTE)}
                className="min-h-[56px] md:min-h-[100px]"
                showToolbar={!isPendingConversation}
              />
            </div>

            {/* Action row: file / emoji / canned / template (left) + mic / send (right) */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5">
                {/* File Upload Button */}
                <FileUpload
                  onFilesSelected={handleFilesSelected}
                  maxFileSize={100}
                  multiple={true}
                  disabled={isDisabled || isSending || isPendingConversation || hasCannedMedia}
                />

                {/* Emoji Button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isDisabled || isSending || isPendingConversation}
                    className="h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
                    onClick={handleEmojiClick}
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    onEmojiSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>

                {/* Canned Responses Button */}
                <Button
                  variant={showCannedResponses ? 'default' : 'ghost'}
                  size="icon"
                  disabled={isDisabled || isSending || isPendingConversation}
                  className="h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
                  onClick={handleCannedResponsesClick}
                  title={t('messageInput.cannedResponses.tooltip')}
                >
                  <MessageSquareText className="h-4 w-4" />
                </Button>

                {/* Template Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isSending || isPendingConversation}
                  className="h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
                  onClick={handleTemplateClick}
                  title={t('messageTemplates.button.title')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {replyMode === ReplyMode.REPLY && !isPendingConversation && (
                  <Button
                    variant={isRecordingAudio ? 'default' : 'ghost'}
                    size="icon"
                    disabled={isDisabled || isSending}
                    className={
                      isRecordingAudio
                        ? 'bg-primary hover:bg-primary/85 text-primary-foreground h-9 w-9 flex-shrink-0 shadow-md transition-all duration-200'
                        : 'h-9 w-9 flex-shrink-0 hover:bg-accent transition-all duration-200'
                    }
                    onClick={startAudioRecording}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="bg-primary hover:bg-primary/85 text-primary-foreground h-9 w-9 flex-shrink-0 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{sendButtonTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isRecordingAudio && (
        <div className="mt-4">
          <AudioRecorder
            onRecordingComplete={handleAudioRecordingComplete}
            onRecordingCancel={handleAudioRecordingCancel}
            disabled={isDisabled || isSending}
            autoStart={true}
            preferWhatsAppCloudFormat={isWhatsApp}
            shouldPreloadConverter={isWhatsApp}
          />
        </div>
      )}

      {/* Message Templates Modal */}
      <MessageTemplateModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        inboxId={inboxId}
        channelType={channelType}
        isWhatsAppCloud={isWhatsAppCloud}
        onSend={handleSendTemplate}
      />
    </>
  );
};

export default React.memo(MessageInput);
