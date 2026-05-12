import React, { useState, useEffect, useCallback } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

import { Button } from '@evoapi/design-system/button';
import { Card, CardHeader, CardContent } from '@evoapi/design-system/card';
import { Badge } from '@evoapi/design-system/badge';
import { X, User, FileText, MessageSquare, Clock, ChevronDown, Zap, GitBranch, Tag, Info } from 'lucide-react';

import ContactHeader from './ContactHeader';
import ContactDetails from './ContactDetails';
import MacrosList from './MacrosList';

import EditableContactCustomAttributes from './EditableContactCustomAttributes';
import EditableConversationCustomAttributes from './EditableConversationCustomAttributes';

import ConversationPipelineItem from '@/components/pipelines/ConversationPipelineItem';
import { pipelinesService } from '@/services/pipelines';
import type { Pipeline } from '@/types/analytics';

import { Contact, Conversation } from '@/types/chat/api';

interface ContactSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  conversation: Conversation | null;
  onFilterReload?: () => Promise<void>;
}

// Componente CollapsibleHeader igual ao usado em Agents.tsx
interface CollapsibleHeaderProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const CollapsibleHeader = ({
  title,
  description,
  icon,
  count,
  isOpen,
  onToggle,
}: CollapsibleHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {count}
            </Badge>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
    </div>
    <Button variant="ghost" size="sm" onClick={onToggle} className="h-6 w-6 p-0 flex-shrink-0">
      <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
        <ChevronDown className="h-3 w-3" />
      </div>
    </Button>
  </div>
);

const ContactSidebar: React.FC<ContactSidebarProps> = ({
  isOpen,
  onClose,
  contact,
  conversation,
  onFilterReload,
}) => {
  const { t } = useLanguage('chat');

  // Estados para controlar seções expandidas/colapsadas (padrão Agents.tsx)
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showContactNotes, setShowContactNotes] = useState(false);
  const [showPreviousConversations, setShowPreviousConversations] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showConversationAttributes, setShowConversationAttributes] = useState(false);
  const [showContactAttributes, setShowContactAttributes] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationPipelines, setConversationPipelines] = useState<Pipeline[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);

  // Detectar se é mobile para controlar renderização
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carregar pipelines da conversation uma única vez
  const loadConversationPipelines = useCallback(async () => {
    if (!conversation?.id) {
      setConversationPipelines([]);
      return;
    }

    setIsLoadingPipelines(true);
    try {
      const pipelines = await pipelinesService.getPipelinesByConversation(conversation.id);
      setConversationPipelines(pipelines);
    } catch (error) {
      console.error('Error loading conversation pipelines:', error);
      setConversationPipelines([]);
    } finally {
      setIsLoadingPipelines(false);
    }
  }, [conversation?.id]);

  useEffect(() => {
    loadConversationPipelines();
  }, [loadConversationPipelines]);

  // Handler para recarregar pipelines quando houver atualização
  const handlePipelineUpdated = useCallback(async () => {
    await loadConversationPipelines();
    onFilterReload?.();
  }, [loadConversationPipelines, onFilterReload]);

  // Calcular altura real do header dinamicamente
  useEffect(() => {
    const calculateHeaderHeight = () => {
      // Procurar o AppBar do MainLayout
      const appBar = document.querySelector(
        '[class*="flex-shrink-0"][class*="bg-sidebar"][class*="border-b"]',
      );
      if (appBar) {
        const height = appBar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    calculateHeaderHeight();
    window.addEventListener('resize', calculateHeaderHeight);
    return () => window.removeEventListener('resize', calculateHeaderHeight);
  }, []);

  // No mobile, esconder completamente quando fechado
  // No desktop, manter no DOM para animação
  if (!isOpen && isMobile) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && isMobile && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/50 z-30"
          style={{ top: 'var(--header-height, 60px)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        border-l bg-background flex flex-col
        fixed md:static left-0 md:left-auto right-0 md:right-auto bottom-0 md:bottom-auto z-40 md:z-auto
        transform transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen
            ? 'w-full md:w-96 translate-x-0 md:translate-x-0 md:opacity-100'
            : 'w-full md:w-0 translate-x-full md:translate-x-0 md:opacity-0'
          }
      `}
        style={{
          top: isMobile ? 'var(--header-height, 60px)' : 'auto',
          height: isMobile ? 'calc(100vh - var(--header-height, 60px))' : '100%',
        }}
      >
        {/* Header com Avatar e Info Básica + Close Button */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
          <ContactHeader contact={contact} />

          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Cards Colapsáveis - Estrutura Agents.tsx */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 scrollbar-thin">
          {/* 1. Contact Details - Informações do contato */}
          <Card>
            <CardHeader className="pb-2">
              <CollapsibleHeader
                title={t('contactSidebar.sections.contactDetails.title')}
                description={t('contactSidebar.sections.contactDetails.description')}
                icon={<User className="h-4 w-4 text-green-500" />}
                isOpen={showContactDetails}
                onToggle={() => setShowContactDetails(!showContactDetails)}
              />
            </CardHeader>

            {showContactDetails && (
              <CardContent className="pt-0 px-3 pb-3">
                <ContactDetails contact={contact} />
              </CardContent>
            )}
          </Card>

          {/* 2. Pipeline - Gerenciar funil */}
          {(conversation || contact) && (
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleHeader
                  title={t('contactSidebar.sections.pipeline.title')}
                  description={t('contactSidebar.sections.pipeline.description')}
                  icon={<GitBranch className="h-4 w-4 text-blue-500" />}
                  isOpen={showPipeline}
                  onToggle={() => setShowPipeline(!showPipeline)}
                />
              </CardHeader>

              {showPipeline && (
                <CardContent className="pt-0 px-3 pb-3">
                  {conversation && (
                    <div className="max-h-60 overflow-y-auto scrollbar-thin pr-1">
                      <ConversationPipelineItem
                        conversationId={conversation.id}
                        pipelines={conversationPipelines}
                        isLoadingPipelines={isLoadingPipelines}
                        onPipelineUpdated={handlePipelineUpdated}
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* 3. Macros - Executar automações */}
          {conversation && (
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleHeader
                  title={t('contactSidebar.sections.macros.title')}
                  description={t('contactSidebar.sections.macros.description')}
                  icon={<Zap className="h-4 w-4 text-yellow-500" />}
                  isOpen={showMacros}
                  onToggle={() => setShowMacros(!showMacros)}
                />
              </CardHeader>

              {showMacros && (
                <CardContent className="pt-0 px-3 pb-3">
                  <MacrosList
                    conversationId={String(conversation.id)}
                    onMacroExecuted={onFilterReload}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* 4. Contact Notes - Notas do contato */}
          <Card>
            <CardHeader className="pb-2">
              <CollapsibleHeader
                title={t('contactSidebar.sections.contactNotes.title')}
                description={t('contactSidebar.sections.contactNotes.description')}
                icon={<FileText className="h-4 w-4 text-orange-500" />}
                count={0}
                isOpen={showContactNotes}
                onToggle={() => setShowContactNotes(!showContactNotes)}
              />
            </CardHeader>

            {showContactNotes && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="text-sm text-muted-foreground p-2 rounded bg-muted/30">
                  {/* TODO: Implementar ContactNotes real */}
                  {t('contactSidebar.sections.contactNotes.noNotes')}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 4. Previous Conversations - Conversas anteriores */}
          <Card>
            <CardHeader className="pb-2">
              <CollapsibleHeader
                title={t('contactSidebar.sections.previousConversations.title')}
                description={t('contactSidebar.sections.previousConversations.description')}
                icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
                count={0}
                isOpen={showPreviousConversations}
                onToggle={() => setShowPreviousConversations(!showPreviousConversations)}
              />
            </CardHeader>

            {showPreviousConversations && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="text-sm text-muted-foreground p-2 rounded bg-muted/30">
                  {/* TODO: Implementar ContactConversations real */}
                  {t('contactSidebar.sections.previousConversations.loading')}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 5. Conversation Info - Informações da conversa */}
          <Card>
            <CardHeader className="pb-2">
              <CollapsibleHeader
                title={t('contactSidebar.sections.conversationInfo.title')}
                description={t('contactSidebar.sections.conversationInfo.description')}
                icon={<Clock className="h-4 w-4 text-slate-500" />}
                isOpen={showConversationInfo}
                onToggle={() => setShowConversationInfo(!showConversationInfo)}
              />
            </CardHeader>

            {showConversationInfo && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="space-y-2">
                  {conversation && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t('contactSidebar.sections.conversationInfo.status')}
                        </span>
                        <span className="font-medium capitalize">{conversation.status}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {t('contactSidebar.sections.conversationInfo.channel')}
                        </span>
                        <span className="font-medium">{conversation.inbox_name}</span>
                      </div>
                      {conversation.assignee_id && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t('contactSidebar.sections.conversationInfo.assigned')}
                          </span>
                          <span className="font-medium">
                            {t('contactSidebar.sections.conversationInfo.assignedTo', {
                              id: conversation.assignee_id,
                            })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 6. Conversation Custom Attributes - Atributos personalizados da conversa */}
          {conversation && (
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleHeader
                  title={t('contactSidebar.sections.conversationAttributes.title')}
                  description={t('contactSidebar.sections.conversationAttributes.description')}
                  icon={<Info className="h-4 w-4 text-cyan-500" />}
                  isOpen={showConversationAttributes}
                  onToggle={() => setShowConversationAttributes(!showConversationAttributes)}
                />
              </CardHeader>

              {showConversationAttributes && (
                <CardContent className="pt-0 px-3 pb-3">
                  <EditableConversationCustomAttributes
                    conversation={conversation}
                    onConversationUpdate={onFilterReload}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* 7. Contact Custom Attributes - Atributos personalizados do contato */}
          {contact && (
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleHeader
                  title={t('contactSidebar.sections.contactAttributes.title')}
                  description={t('contactSidebar.sections.contactAttributes.description')}
                  icon={<Tag className="h-4 w-4 text-pink-500" />}
                  isOpen={showContactAttributes}
                  onToggle={() => setShowContactAttributes(!showContactAttributes)}
                />
              </CardHeader>

              {showContactAttributes && (
                <CardContent className="pt-0 px-3 pb-3">
                  <EditableContactCustomAttributes
                    contact={contact}
                    onContactUpdate={onFilterReload}
                  />
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactSidebar;
