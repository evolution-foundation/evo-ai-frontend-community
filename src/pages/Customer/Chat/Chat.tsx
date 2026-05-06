/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { useChatContext } from '@/contexts/chat/ChatContext';
import { usePermissions } from '@/contexts/PermissionsContext';

import { useLanguage } from '@/hooks/useLanguage';

// Hooks customizados
import { useConversationHandlers } from '@/hooks/chat/useConversationHandlers';
import { useAssignmentHandlers } from '@/hooks/chat/useAssignmentHandlers';
import { useFilterHandlers } from '@/hooks/chat/useFilterHandlers';

import { loadConversationFilters, getDefaultFilter } from '@/utils/storage/filtersStorage';

import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';

import ErrorBoundary from '../../../components/ErrorBoundary';
import { ChatTour } from '@/tours';

// Novos componentes refatorados
import ChatSidebar from '@/components/chat/chat-sidebar/ChatSidebar';
import ChatHeader from '@/components/chat/chat-header/ChatHeader';
import ChatArea from '@/components/chat/chat-area/ChatArea';
import ChatTabs from '@/components/chat/chat-tabs/ChatTabs';

import { AlertTriangle, Trash2 } from 'lucide-react';

import { Conversation } from '@/types/chat/api';
import { BaseFilter } from '@/types/core';
import type { DashboardApp } from '../../../types/integrations';
import type { AssignmentOption, AssignmentType } from '@/components/chat/assignment';
import { labelsService } from '@/services/contacts/labelsService';
import { useAppDataStore } from '@/store/appDataStore';
import type { Label } from '@/types/settings';

const ContactSidebar = React.lazy(() => import('@/components/chat/contact-sidebar/ContactSidebar'));

const AssignmentModal = React.lazy(() => import('@/components/chat/assignment/AssignmentModal'));

interface SendMessageOptions {
  content: string;
  files?: File[];
  isPrivate?: boolean;
  templateParams?: any;
  cannedResponseId?: string | null;
  isRecordedAudio?: boolean | string[];
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const Chat = () => {
  const { t } = useLanguage('chat');
  const { can, isReady: permissionsReady } = usePermissions();
  const fetchLabels = useAppDataStore(state => state.fetchLabels);
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const chatContext = useChatContext();
  // Explicitly type conversations to ensure TypeScript recognizes it has 'state'
  const conversations = chatContext.conversations;
  const { messages, selectedConversation, selectedMessages } = chatContext;

  // 🔒 RACE CONDITION FIX: Ref para rastrear última conversa carregada
  const lastLoadedConversationRef = useRef<string | null>(null);

  // 🔒 NAVEGAÇÃO MANUAL: Ref para evitar URL sync após ações manuais
  const isManualNavigationRef = useRef<boolean>(false);

  // 🔒 URL SYNC CONTROL: Ref para controlar execução de sincronização
  const urlSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlSyncRef = useRef<string | null>(null);

  // 🔄 CARREGAR MAIS MENSAGENS: Função simples via Context
  const handleLoadMore = useCallback(() => {
    if (!conversations.state.selectedConversationId) return;

    messages.loadMoreMessages(conversations.state.selectedConversationId);
  }, [conversations.state.selectedConversationId, messages]);

  // Estados locais simplificados
  const [searchInput, setSearchInput] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [isContactSidebarOpen, setIsContactSidebarOpen] = useState(false);

  // Modal states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('agent');
  const [conversationToAssign, setConversationToAssign] = useState<Conversation | null>(null);

  // Dashboard Apps state (lazy loaded, not auto-fetched)
  const [dashboardApps] = useState<DashboardApp[]>([]);
  const [activeTab, setActiveTab] = useState<string>('chat');

  // Hooks customizados para lógica de negócio
  const conversationHandlers = useConversationHandlers();
  const assignmentHandlers = useAssignmentHandlers();
  const filterHandlers = useFilterHandlers();

  // 🚀 MEMOIZAÇÃO: Computar valores derivados apenas quando necessário
  const conversationsCount = useMemo(
    () => conversations.state.conversations.length,
    [conversations.state.conversations.length],
  );
  const isConversationsLoaded = useMemo(
    () => !conversations.state.conversationsLoading,
    [conversations.state.conversationsLoading],
  );
  const selectedConversationIdStr = useMemo(
    () =>
      conversations.state.selectedConversationId
        ? String(conversations.state.selectedConversationId)
        : null,
    [conversations.state.selectedConversationId],
  );

  // 🎯 FILTROS: Usar handlers dos hooks customizados (DEFINIR ANTES DOS useEffect)
  const handleApplyFilters = useCallback(
    async (newFilters: BaseFilter[]) => {
      try {
        await filterHandlers.handleApplyFilters(newFilters);
      } catch (error) {
        // Se erro 403 ou 404, marcar como erro
        const axiosError = error as AxiosError;
        if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
          throw error; // Re-throw para que seja tratado no useEffect
        }
        throw error;
      }
    },
    [filterHandlers],
  );

  // 🔒 FECHAR SIDEBAR: Quando navega para /conversations (sem ID específico)
  useEffect(() => {
    if (!conversationId && isContactSidebarOpen) {
      setIsContactSidebarOpen(false);
    }
  }, [conversationId, isContactSidebarOpen]);

  // Load conversations on mount
  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    if (!can('conversations', 'read')) {
      toast.error(t('messages.noPermissionView'));
      return;
    }

    // 💾 PERSISTÊNCIA: Carregar filtros salvos ou usar padrão
    const savedFilters = loadConversationFilters();
    const filtersToApply = savedFilters || getDefaultFilter();

    // Aplicar filtros (erros serão tratados no filterHandlers)
    handleApplyFilters(filtersToApply).catch(error => {
      // Se erro 403 ou 404, marcar como erro e não tentar novamente
      const axiosError = error as AxiosError;
      if (axiosError?.response?.status === 403 || axiosError?.response?.status === 404) {
        console.error(`Sem permissão. Parando tentativas.`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  const handleClearFilters = useCallback(async () => {
    await filterHandlers.handleClearFilters();
  }, [filterHandlers]);

  const reloadCurrentFilters = useCallback(async () => {
    await filterHandlers.reloadCurrentFilters();
  }, [filterHandlers]);

  // 🔄 CARREGAMENTO SIMPLES: Apenas carregar mensagens quando conversa muda
  useEffect(() => {
    if (conversations.state.selectedConversationId) {
      // 🔒 PROTEÇÃO: Verificar se já carregamos esta conversa
      if (lastLoadedConversationRef.current === conversations.state.selectedConversationId) {
        return;
      }

      // Atualizar ref ANTES de chamar loadMessages
      lastLoadedConversationRef.current = conversations.state.selectedConversationId;

      // Carregar mensagens diretamente via Context
      messages.loadMessages(conversations.state.selectedConversationId);
    } else {
      // Reset ref quando não há conversa selecionada
      lastLoadedConversationRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.state.selectedConversationId]); // Removido 'messages' para evitar loop

  // Sincronizar conversa selecionada com URL com debounce
  useEffect(() => {
    // 🔒 PROTEÇÃO: Ignorar URL sync durante navegação manual
    if (isManualNavigationRef.current) {
      return;
    }

    // 🚀 DEBOUNCE: Limpar timeout anterior se existir
    if (urlSyncTimeoutRef.current) {
      clearTimeout(urlSyncTimeoutRef.current);
    }

    // Criar key única para esta execução
    const syncKey = `${conversationId || 'null'}-${
      conversations.state.selectedConversationId || 'null'
    }`;

    // 🔒 PROTEÇÃO: Evitar múltiplas execuções para a mesma configuração
    // MAS permitir nova tentativa quando conversas são carregadas pela primeira vez
    const shouldSkip = lastUrlSyncRef.current === syncKey && conversationsCount === 0;
    if (shouldSkip) {
      return;
    }

    lastUrlSyncRef.current = syncKey;

    urlSyncTimeoutRef.current = setTimeout(async () => {
      const syncUrlWithConversation = async () => {
        if (conversationId) {
          // 🔧 FIX: Normalizar conversationId da URL para string
          const conversationIdStr = String(conversationId);

          // Aceitar apenas UUID canônico na URL.
          if (!UUID_V4_REGEX.test(conversationIdStr)) {
            navigate('/conversations', { replace: true });
            return;
          }

          // ⏳ AGUARDAR: Só sincronizar após conversas serem carregadas
          if (conversations.state.conversationsLoading) {
            return;
          }

          // 🔒 AGUARDAR: Aguardar carregamento inicial das conversas (pelo menos uma tentativa)
          if (conversationsCount === 0 && !conversations.state.conversationsError) {
            return;
          }

          // 🔍 VERIFICAR: Se conversa UUID existe na lista carregada
          let targetConversation = conversations.getConversation(conversationIdStr);

          if (!targetConversation) {
            try {
              // 🔄 FALLBACK: Tentar carregar conversa específica da API
              targetConversation = await conversations.loadSpecificConversation(conversationIdStr);

              if (!targetConversation) {
                return;
              }
            } catch (error) {
              console.error('❌ Erro ao carregar conversa específica:', error);
              return;
            }
          }

          const canonicalConversationId = String(targetConversation.uuid || targetConversation.id);
          const currentSelectedStr = String(conversations.state.selectedConversationId);

          // ✅ PROTEÇÃO: Se já está selecionada corretamente, não fazer nada
          if (canonicalConversationId === currentSelectedStr) {
            return;
          }

          // ✅ SELECIONAR: Conversa existe e não está selecionada
          conversations.selectConversation(canonicalConversationId);
          setMobileView('chat');
        } else if (!conversationId && conversations.state.selectedConversationId) {
          // Se não há conversationId na URL mas há uma selecionada, limpar seleção
          conversations.selectConversation(null);
          setMobileView('list');
        }
      };

      await syncUrlWithConversation();
    }, 100); // Debounce de 100ms

    // Cleanup no unmount
    return () => {
      if (urlSyncTimeoutRef.current) {
        clearTimeout(urlSyncTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationId,
    selectedConversationIdStr, // 🚀 OTIMIZADO: Usar valor memoizado
    isConversationsLoaded, // 🚀 OTIMIZADO: Usar valor memoizado
    conversationsCount, // 🚀 OTIMIZADO: Usar valor memoizado
  ]);

  const handleSendMessage = async ({
    content,
    files,
    isPrivate,
    cannedResponseId,
    templateParams,
    isRecordedAudio,
  }: SendMessageOptions) => {
    if (!can('conversations', 'update')) {
      toast.error(t('messages.noPermissionSend'));
      return;
    }
    if (!conversations.state.selectedConversationId) return;

    // Se não há templateParams, validar conteúdo normal
    if (!templateParams && !content.trim() && (!files || files.length === 0)) return;

    try {
      // Use _sendMessageBase directly when templateParams is present
      if (templateParams) {
        await messages._sendMessageBase(conversations.state.selectedConversationId, {
          content: content || '', // Empty for templates, backend will populate
          files: files || [],
          isPrivate: isPrivate || false,
          cannedResponseId: cannedResponseId || null,
          templateParams,
        });
      } else if (files && files.length > 0) {
        await messages.sendMessageWithFiles(
          conversations.state.selectedConversationId,
          content,
          files,
          isPrivate,
          cannedResponseId,
          undefined,
          isRecordedAudio,
        );
      } else {
        await messages.sendMessage(
          conversations.state.selectedConversationId,
          content,
          isPrivate,
          cannedResponseId,
        );
      }

      // A mensagem é automaticamente adicionada ao Context via ADD_MESSAGE
    } catch (error) {
      console.error('Error sending message:', error);
      // O toast já é mostrado no CrmChatContext
      throw error; // Re-throw para que o MessageInput possa tratar
    }
  };

  const handleRetryMessage = (messageId: string) => {
    // TODO: Implementar retry específico para uma mensagem via Context
    console.log('Retry message:', messageId);
  };

  // 🎯 CONVERSATION HANDLERS: Usar handlers dos hooks customizados
  const handleMarkAsRead = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleMarkAsRead(conversation);
    },
    [conversationHandlers],
  );

  const handleMarkAsUnread = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleMarkAsUnread(conversation);
    },
    [conversationHandlers],
  );

  const handleMarkAsResolved = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleMarkAsResolved(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handlePostpone = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handlePostpone(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleMarkAsOpen = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleMarkAsOpen(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleMarkAsSnoozed = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleMarkAsSnoozed(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleSetPriority = useCallback(
    async (conversation: Conversation, priority: 'low' | 'medium' | 'high' | 'urgent' | null) => {
      await conversationHandlers.handleSetPriority(conversation, priority, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handlePinConversation = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handlePinConversation(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleUnpinConversation = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleUnpinConversation(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleArchiveConversation = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleArchiveConversation(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  const handleUnarchiveConversation = useCallback(
    async (conversation: Conversation) => {
      await conversationHandlers.handleUnarchiveConversation(conversation, reloadCurrentFilters);
    },
    [conversationHandlers, reloadCurrentFilters],
  );

  // 🎯 ASSIGNMENT HANDLERS: Usar handlers dos hooks customizados
  const handleAssignAgent = useCallback(
    async (conversation: Conversation) => {
      const result = await assignmentHandlers.handleAssignAgent(conversation);
      if (result) {
        setConversationToAssign(result.conversation);
        setAssignmentType(result.type);
        setShowAssignmentModal(true);
      }
    },
    [assignmentHandlers],
  );

  const handleAssignTeam = useCallback(
    async (conversation: Conversation) => {
      const result = await assignmentHandlers.handleAssignTeam(conversation);
      if (result) {
        setConversationToAssign(result.conversation);
        setAssignmentType(result.type);
        setShowAssignmentModal(true);
      }
    },
    [assignmentHandlers],
  );

  const handleAssignTag = useCallback(
    async (conversation: Conversation) => {
      const result = await assignmentHandlers.handleAssignTag(conversation);
      if (result) {
        setConversationToAssign(result.conversation);
        setAssignmentType(result.type);
        setShowAssignmentModal(true);
      }
    },
    [assignmentHandlers],
  );

  const handleDeleteConversation = useCallback(
    (conversation: Conversation) => {
      const result = conversationHandlers.handleDeleteConversation(conversation);
      if (result) {
        setConversationToDelete(result);
        setShowDeleteDialog(true);
      }
    },
    [conversationHandlers],
  );


  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      await conversations.deleteConversation(String(conversationToDelete.id));
      setShowDeleteDialog(false);
      setConversationToDelete(null);
      setMobileView('list');
      setIsContactSidebarOpen(false);
      isManualNavigationRef.current = true;
      navigate('/conversations', { replace: true });
      setTimeout(() => {
        isManualNavigationRef.current = false;
      }, 100);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // Error is already handled in the context with toast
    }
  };

  const handleCreateLabelInline = async (data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }): Promise<AssignmentOption> => {
    try {
      // labelsService.createLabel returns the unwrapped Label (extractData unwraps response.data.data)
      // despite the declared LabelResponse type — service typing is inconsistent across the codebase.
      const label = (await labelsService.createLabel(data)) as unknown as Label;
      if (!label?.id || !label?.title) {
        throw new Error('Invalid label payload returned from API');
      }
      void fetchLabels(true);
      return { id: label.id, name: label.title, color: label.color };
    } catch (error) {
      console.error('Error creating label inline:', error);
      const message =
        error instanceof AxiosError
          ? error.response?.data?.error?.message || error.response?.data?.message
          : undefined;
      toast.error(message || t('assignmentModal.createLabelError'));
      throw error;
    }
  };

  // Assignment modal handlers
  const handleAssignmentConfirm = async (selectedIds: string[]) => {
    if (!conversationToAssign) return;

    try {
      await assignmentHandlers.handleAssignmentConfirm(
        conversationToAssign,
        assignmentType,
        selectedIds,
      );
    } catch (error) {
      console.error('Error in assignment:', error);
      throw error; // Re-throw to let modal handle it
    }
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setConversationToAssign(null);
  };

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Reset active tab when conversation changes
  useEffect(() => {
    if (conversations.state.selectedConversationId) {
      setActiveTab('chat');
    }
  }, [conversations.state.selectedConversationId]);

  // Prepare assignment modal data
  const getAssignmentModalData = () => {
    if (!conversationToAssign) return null;

    switch (assignmentType) {
      case 'agent':
        return {
          title: t('assignment.agent.title'),
          description: t('assignment.agent.description', {
            name: conversationToAssign.assignee?.name || t('assignment.agent.contactFallback'),
          }),
          options: assignmentHandlers.users.map(
            (user): AssignmentOption => ({
              id: user.id,
              name: user.name,
              description: user.email,
              avatar: user.avatar_url || user.thumbnail,
            }),
          ),
          currentSelection: conversationToAssign.assignee_id
            ? [conversationToAssign.assignee_id]
            : [],
          multiSelect: false,
          searchPlaceholder: t('assignment.agent.searchPlaceholder'),
        };

      case 'team':
        return {
          title: t('assignment.team.title'),
          description: t('assignment.team.description', {
            name: conversationToAssign?.team?.name || t('assignment.team.contactFallback'),
          }),
          options: assignmentHandlers.teams.map(
            (team): AssignmentOption => ({
              id: team.id,
              name: team.name,
              description: team.description,
            }),
          ),
          currentSelection: conversationToAssign.team_id ? [conversationToAssign.team_id] : [],
          multiSelect: false,
          searchPlaceholder: t('assignment.team.searchPlaceholder'),
        };

      case 'label':
        return {
          title: t('assignment.label.title'),
          description: t('assignment.label.description', {
            name:
              conversationToAssign?.labels?.map(label => label.title).join(', ') ||
              t('assignment.label.contactFallback'),
          }),
          options: assignmentHandlers.labels.map(
            (label): AssignmentOption => ({
              id: label.id,
              name: label.title,
              description: label.description,
              color: label.color,
            }),
          ),
          currentSelection: (conversationToAssign.labels || []).map(label => label.id),
          multiSelect: true,
          searchPlaceholder: t('assignment.label.searchPlaceholder'),
        };

      default:
        return null;
    }
  };

  const assignmentModalData = getAssignmentModalData();

  // 🎯 HANDLERS SIMPLIFICADOS: Usar handlers dos hooks customizados
  const handleConversationSelect = (conversation: Conversation) => {
    // 🔧 FIX CRÍTICO: Normalizar IDs para string SEMPRE
    const conversationIdStr = String(conversation.uuid || conversation.id);
    const currentSelectedStr = String(conversations.state.selectedConversationId);

    // 🔒 PROTEÇÃO: Evitar seleção dupla (comparação normalizada)
    if (currentSelectedStr === conversationIdStr) {
      return;
    }

    // 🔒 MARCAR NAVEGAÇÃO MANUAL para evitar URL sync
    isManualNavigationRef.current = true;

    // 🔧 SEMPRE PASSAR STRING para evitar type mismatch
    conversations.selectConversation(conversationIdStr);
    // Switch to chat view on mobile when conversation is selected
    setMobileView('chat');
    // Atualizar URL para incluir o ID da conversa
    navigate(`/conversations/${conversationIdStr}`, { replace: true });

    // 🔒 RESET flag após navegação
    setTimeout(() => {
      isManualNavigationRef.current = false;
    }, 100);
  };

  const handleCloseConversation = () => {
    // 🔒 MARCAR NAVEGAÇÃO MANUAL para evitar URL sync
    isManualNavigationRef.current = true;

    conversations.selectConversation(null);
    setMobileView('list');
    setIsContactSidebarOpen(false); // Fechar sidebar se estiver aberto
    // Voltar para a lista geral de conversas
    navigate('/conversations', { replace: true });

    // 🔒 RESET flag após navegação
    setTimeout(() => {
      isManualNavigationRef.current = false;
    }, 100);
  };

  return (
    <ErrorBoundary>
      <ChatTour />
      <div className="h-full w-full flex flex-col md:flex-row overflow-hidden">
        {/* Chat List Sidebar */}
        <ChatSidebar
          mobileView={mobileView}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          onConversationSelect={handleConversationSelect}
          onFilterApply={handleApplyFilters}
          onFilterClear={handleClearFilters}
          onMarkAsRead={handleMarkAsRead}
          onMarkAsUnread={handleMarkAsUnread}
          onMarkAsOpen={handleMarkAsOpen}
          onMarkAsResolved={handleMarkAsResolved}
          onPostpone={handlePostpone}
          onMarkAsSnoozed={handleMarkAsSnoozed}
          onSetPriority={handleSetPriority}
          onPinConversation={handlePinConversation}
          onUnpinConversation={handleUnpinConversation}
          onArchiveConversation={handleArchiveConversation}
          onUnarchiveConversation={handleUnarchiveConversation}
          onAssignAgent={handleAssignAgent}
          onAssignTeam={handleAssignTeam}
          onAssignTag={handleAssignTag}
          onDeleteConversation={handleDeleteConversation}
        />

        {/* Chat Area */}
        <div
          data-tour="chat-main-area"
          className={`
          ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex
          flex-1 flex-col h-full min-h-0 max-h-full overflow-hidden
        `}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <ChatHeader
                conversation={selectedConversation}
                onBackClick={() => setMobileView('list')}
                onCloseConversation={handleCloseConversation}
                onContactSidebarOpen={() => setIsContactSidebarOpen(true)}
                onMarkAsRead={handleMarkAsRead}
                onMarkAsUnread={handleMarkAsUnread}
                onMarkAsOpen={handleMarkAsOpen}
                onMarkAsResolved={handleMarkAsResolved}
                onPostpone={handlePostpone}
                onMarkAsSnoozed={handleMarkAsSnoozed}
                onSetPriority={handleSetPriority}
                onPinConversation={handlePinConversation}
                onUnpinConversation={handleUnpinConversation}
                onArchiveConversation={handleArchiveConversation}
                onUnarchiveConversation={handleUnarchiveConversation}
                onAssignAgent={handleAssignAgent}
                onAssignTeam={handleAssignTeam}
                onAssignTag={handleAssignTag}
                onDeleteConversation={handleDeleteConversation}
                unreadCount={conversations.getUnreadCount(selectedConversation.id) || 0}
              />

              {/* Chat Tabs - Show tabs for conversation type dashboard apps */}
              <ChatTabs
                dashboardApps={dashboardApps}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                conversationSelected={!!selectedConversation}
              />

              {/* Conditional rendering: Chat Area or Dashboard App iframe */}
              {activeTab === 'chat' ? (
                // Show Chat Area when Chat tab is active
                <ChatArea
                  selectedConversationId={conversations.state.selectedConversationId}
                  selectedConversation={selectedConversation}
                  selectedMessages={selectedMessages}
                  onSendMessage={handleSendMessage}
                  onLoadMore={handleLoadMore}
                  onRetryMessage={handleRetryMessage}
                  isPendingConversation={selectedConversation?.status === 'pending'}
                />
              ) : (
                // Show Dashboard App iframe when an app tab is active
                <div className="flex-1 w-full h-full overflow-hidden">
                  {(() => {
                    const activeApp = dashboardApps.find(app => app.id === activeTab);
                    if (!activeApp || !activeApp.content || activeApp.content.length === 0) {
                      return (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">{t('dashboardApp.notFound')}</p>
                        </div>
                      );
                    }
                    const appUrl = activeApp.content[0]?.url;
                    if (!appUrl) {
                      return (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">
                            {t('dashboardApp.urlNotConfigured')}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <iframe
                        src={appUrl}
                        className="w-full h-full border-0"
                        title={activeApp.title}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                      />
                    );
                  })()}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('empty.title')}</h3>
                <p className="text-muted-foreground">{t('empty.description')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Sidebar - Integrado no layout */}
        <Suspense fallback={null}>
          <ContactSidebar
            isOpen={isContactSidebarOpen}
            onClose={() => setIsContactSidebarOpen(false)}
            contact={selectedConversation?.contact || null}
            conversation={selectedConversation}
            onFilterReload={reloadCurrentFilters}
          />
        </Suspense>

        {/* Assignment Modal */}
        <Suspense fallback={null}>
          {assignmentModalData && (
            <AssignmentModal
              isOpen={showAssignmentModal}
              onClose={closeAssignmentModal}
              onConfirm={handleAssignmentConfirm}
              type={assignmentType}
              title={assignmentModalData.title}
              description={assignmentModalData.description}
              options={assignmentModalData.options}
              currentSelection={assignmentModalData.currentSelection as string[]}
              multiSelect={assignmentModalData.multiSelect}
              searchPlaceholder={assignmentModalData.searchPlaceholder}
              isLoading={assignmentHandlers.isLoadingAssignmentData}
              canCreateInline={assignmentType === 'label' && can('labels', 'create')}
              onCreateInline={
                assignmentType === 'label' && can('labels', 'create')
                  ? handleCreateLabelInline
                  : undefined
              }
            />
          )}
        </Suspense>

        {/* Delete Conversation Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader className="text-left space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div className="flex-1 space-y-2">
                  <AlertDialogTitle className="text-lg font-semibold">
                    {t('deleteDialog.title')}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                    {(() => {
                      const contactName =
                        conversationToDelete?.assignee?.name || t('deleteDialog.contactFallback');
                      const description = t('deleteDialog.description', { name: contactName });
                      const parts = description.split(contactName);
                      return (
                        <>
                          {parts[0]}
                          <strong>{contactName}</strong>
                          {parts[1]}
                        </>
                      );
                    })()}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>

            <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-3">
              <AlertDialogCancel className="w-full sm:w-auto">
                {t('deleteDialog.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteConversation}
                className="w-full sm:w-auto bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteDialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
};

export default Chat;
