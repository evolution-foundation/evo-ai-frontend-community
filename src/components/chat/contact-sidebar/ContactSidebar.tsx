import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

import { Button } from '@evoapi/design-system/button';
import { Card, CardHeader, CardContent } from '@evoapi/design-system/card';
import { Badge } from '@evoapi/design-system/badge';
import { X, User, Clock, ChevronDown, Zap, GitBranch, Tag, Info } from 'lucide-react';

import ContactHeader from './ContactHeader';
import ContactDetails from './ContactDetails';
import MacrosList from './MacrosList';

import EditableContactCustomAttributes from './EditableContactCustomAttributes';
import EditableConversationCustomAttributes from './EditableConversationCustomAttributes';

import ConversationPipelineItem from '@/components/pipelines/ConversationPipelineItem';
import { pipelinesService } from '@/services/pipelines';
import type { Pipeline } from '@/types/analytics';

import { contactsService } from '@/services/contacts';
import { Contact, Conversation } from '@/types/chat/api';
import { mergeFullContact } from '@/utils/chat/contactTimestamp';
import { useChatContext } from '@/contexts/chat/ChatContext';
import chatService from '@/services/chat/chatService';

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
  const chatCtx = useChatContext();

  // Estados para controlar seções expandidas/colapsadas (padrão Agents.tsx)
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [showPipeline, setShowPipeline] = useState(true);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showConversationAttributes, setShowConversationAttributes] = useState(false);
  const [showContactAttributes, setShowContactAttributes] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [conversationPipelines, setConversationPipelines] = useState<Pipeline[]>([]);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(false);
  const [enrichedContact, setEnrichedContact] = useState<Contact | null>(null);

  const contactRef = useRef(contact);
  useEffect(() => {
    contactRef.current = contact;
  });

  // Detectar se é mobile para controlar renderização
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setEnrichedContact(null);
    if (!isOpen || !contact?.id) return;
    let cancelled = false;
    contactsService.getContact(contact.id, true).then(full => {
      if (cancelled) return;
      const base = contactRef.current ?? contact;
      setEnrichedContact(mergeFullContact(full as Contact, base));
    }).catch(err => {
      console.error('[ContactSidebar] Failed to fetch full contact data:', err);
    });
    return () => { cancelled = true; };
  // contactRef tracks the latest contact object; full `contact` excluded to avoid
  // re-fetching on every prop reference change — only re-fetch on id/open changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contact?.id]);

  // Propagate scalar field changes from the contact prop into enrichedContact while
  // the sidebar is open — handles store/WebSocket updates with the same contact id.
  useEffect(() => {
    if (!isOpen || !contact) return;
    setEnrichedContact(prev => {
      if (!prev || prev.id !== contact.id) return prev;
      return {
        ...prev,
        name: contact.name ?? prev.name,
        phone_number: contact.phone_number ?? prev.phone_number,
        email: contact.email ?? prev.email,
        blocked: contact.blocked ?? prev.blocked,
        avatar_url: contact.avatar_url ?? prev.avatar_url,
        avatar: contact.avatar ?? prev.avatar,
        thumbnail: contact.thumbnail ?? prev.thumbnail,
      };
    });
  // Scalar fields used as deps intentionally instead of the full `contact` object
  // to avoid re-running on every reference change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contact?.id, contact?.name, contact?.phone_number, contact?.email, contact?.blocked, contact?.avatar_url, contact?.avatar, contact?.thumbnail]);

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

  // #1 harmonia mesma-aba: recarrega o rich state quando OUTRA superfície (menu de
  // contexto / header) muta o pipeline. Toda mutação chama updateConversation, que
  // troca a REFERÊNCIA de conversation.pipelines (badge) — logo, keyar o effect
  // nela reflete a mudança aqui sem precisar de websocket. selectedConversation é
  // derivado da state compartilhada, então o prop chega fresco. (Cross-aba/agente
  // = websocket, camada separada.)
  useEffect(() => {
    loadConversationPipelines();
  }, [loadConversationPipelines, conversation?.pipelines]);

  // Handler para recarregar pipelines quando houver atualização
  const handlePipelineUpdated = useCallback(async () => {
    await loadConversationPipelines();
    // #2: em vez de refetchar a lista INTEIRA (onFilterReload = reloadCurrentFilters),
    // atualiza só o badge DESTA conversa via getConversation (rápido depois do fix do
    // include_messages) -> updateConversation. Fallback pro reload amplo se falhar.
    const id = conversation?.id;
    if (!id) return;
    try {
      const raw = await chatService.getConversation(id);
      const updated = (raw as { data?: Conversation })?.data ?? (raw as unknown as Conversation);
      if (updated?.id) chatCtx.conversations.updateConversation(updated);
    } catch {
      await onFilterReload?.();
    }
  }, [loadConversationPipelines, conversation?.id, chatCtx, onFilterReload]);

  const handleContactAttributeUpdate = useCallback(async () => {
    const id = contactRef.current?.id;
    if (id) {
      try {
        const full = await contactsService.getContact(id, true);
        setEnrichedContact(prev => {
          const base = prev ?? contactRef.current;
          return base ? mergeFullContact(full as Contact, base) : null;
        });
      } catch (err) {
        console.error('[ContactSidebar] Failed to refresh contact after attribute update:', err);
        toast.error(t('contactSidebar.customAttributes.refreshError'));
      }
    }
    await onFilterReload?.();
  // t is stable (pure translation fn); omitted from deps intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilterReload]);

  // No mobile, esconder completamente quando fechado
  // No desktop, manter no DOM para animação
  if (!isOpen && isMobile) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        border-l bg-background flex flex-col h-full
        fixed inset-0 md:static md:inset-auto z-40 md:z-auto
        transform transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen
            ? 'w-full md:w-96 translate-x-0 md:opacity-100'
            : 'w-full md:w-0 translate-x-full md:translate-x-0 md:opacity-0'
          }
      `}
      >
        {/* Header com Avatar e Info Básica + Close Button */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative">
          <ContactHeader contact={enrichedContact ?? contact} channelType={conversation?.inbox?.channel_type} />

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
                <ContactDetails contact={enrichedContact ?? contact} />
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
          {(enrichedContact ?? contact) !== null && (
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
                    contact={(enrichedContact ?? contact) as Contact}
                    onContactUpdate={handleContactAttributeUpdate}
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
