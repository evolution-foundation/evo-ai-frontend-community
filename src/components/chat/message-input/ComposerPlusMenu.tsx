import React, { useEffect, useRef, useState } from 'react';

import {
  MessageSquareText,
  FileText,
  Image,
  StickyNote,
  CalendarClock,
  LayoutTemplate,
  Smile,
  Zap,
  PenLine,
  Sparkles,
} from 'lucide-react';

import { useLanguage } from '@/hooks/useLanguage';

interface ComposerPlusMenuProps {
  disabled?: boolean;
  /**
   * Janela de 24h do WhatsApp Cloud expirada: o gatilho "+" continua clicável
   * (não usa `disabled`), mas só o item "templates" fica ativo — os demais
   * ficam visíveis e esmaecidos, já que enviá-los falharia do mesmo jeito no
   * backend. Sem isso o agente fica sem nenhuma rota pra reabrir a conversa.
   */
  restrictToTemplatesOnly?: boolean;
  onOpenQuickReplies: () => void;
  onPickDocuments: () => void;
  onPickMedia: () => void;
  onOpenConversationNote: () => void;
  onSchedule: () => void;
  /** WhatsApp Cloud templates — sem equivalente no protótipo, mantido como 6º item quando disponível. */
  onOpenTemplates?: () => void;
  /**
   * Emoji/Macros/Assinatura/IA dobram pra dentro deste menu só no mobile (tela
   * estreita não cabe 6 ícones + campo de texto sem espremer o campo — ver
   * MessageInput). O caller só passa isto quando `isMobile`; cada ação some
   * do objeto se a feature correspondente não estiver disponível.
   */
  mobileExtraActions?: {
    onOpenEmoji: () => void;
    onToggleSignature?: () => void;
    onOpenMacros?: () => void;
    onOpenAIAssistance?: () => void;
  };
}

const ITEM_ICON_BOX =
  'w-[34px] h-[34px] rounded-[9px] bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary';

/**
 * Menu "+" do composer — popover custom (não Dropdown genérico), estilo/cores
 * exatos do protótipo de referência (Melhorias CRM Chat §3.8): abre pra cima,
 * cada item com ícone em quadrado verde-claro 34x34. Ordem fixa: Mensagens
 * Rápidas, Documentos, Fotos e Vídeos, Notas da Conversa, Agendar.
 */
const ComposerPlusMenu: React.FC<ComposerPlusMenuProps> = ({
  disabled = false,
  restrictToTemplatesOnly = false,
  onOpenQuickReplies,
  onPickDocuments,
  onPickMedia,
  onOpenConversationNote,
  onSchedule,
  onOpenTemplates,
  mobileExtraActions,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const items = [
    {
      key: 'rapidas',
      label: t('messageInput.composerMenu.quickReplies'),
      icon: <MessageSquareText className="h-4 w-4" />,
      onClick: onOpenQuickReplies,
    },
    {
      key: 'docs',
      label: t('messageInput.composerMenu.documents'),
      icon: <FileText className="h-4 w-4" />,
      onClick: onPickDocuments,
    },
    {
      key: 'midia',
      label: t('messageInput.composerMenu.media'),
      icon: <Image className="h-4 w-4" />,
      onClick: onPickMedia,
    },
    {
      key: 'notas',
      label: t('messageInput.composerMenu.conversationNote'),
      icon: <StickyNote className="h-4 w-4" />,
      onClick: onOpenConversationNote,
    },
    {
      key: 'agendar',
      label: t('messageInput.composerMenu.schedule'),
      icon: <CalendarClock className="h-4 w-4" />,
      onClick: onSchedule,
    },
    ...(onOpenTemplates
      ? [
          {
            key: 'templates',
            label: t('messageTemplates.button.title'),
            icon: <LayoutTemplate className="h-4 w-4" />,
            onClick: onOpenTemplates,
          },
        ]
      : []),
    ...(mobileExtraActions
      ? [
          {
            key: 'emoji',
            label: t('messageInput.composerMenu.emoji'),
            icon: <Smile className="h-4 w-4" />,
            onClick: mobileExtraActions.onOpenEmoji,
          },
          ...(mobileExtraActions.onOpenMacros
            ? [
                {
                  key: 'macros',
                  label: t('messageInput.macros.tooltip'),
                  icon: <Zap className="h-4 w-4" />,
                  onClick: mobileExtraActions.onOpenMacros,
                },
              ]
            : []),
          ...(mobileExtraActions.onToggleSignature
            ? [
                {
                  key: 'signature',
                  label: t('messageInput.signature.menuLabel'),
                  icon: <PenLine className="h-4 w-4" />,
                  onClick: mobileExtraActions.onToggleSignature,
                },
              ]
            : []),
          ...(mobileExtraActions.onOpenAIAssistance
            ? [
                {
                  key: 'ai-assist',
                  label: t('aiAssistance.button.title'),
                  icon: <Sparkles className="h-4 w-4" />,
                  onClick: mobileExtraActions.onOpenAIAssistance,
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <div ref={rootRef} className="relative flex-shrink-0" style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
        title={t('messageInput.composerMenu.tooltip')}
        className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            left: -6,
            width: 248,
            background: '#FFFFFF',
            border: '1px solid #eceef2',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(20,30,45,.16)',
            padding: 7,
            zIndex: 100,
          }}
        >
          {items.map(item => {
            const itemDisabled = restrictToTemplatesOnly && item.key !== 'templates';
            return (
              <div
                key={item.key}
                onClick={() => {
                  if (itemDisabled) return;
                  setOpen(false);
                  item.onClick();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 10px',
                  borderRadius: 10,
                  cursor: itemDisabled ? 'not-allowed' : 'pointer',
                  opacity: itemDisabled ? 0.4 : 1,
                }}
                onMouseEnter={e => {
                  if (!itemDisabled) e.currentTarget.style.background = '#f4f6f9';
                }}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className={ITEM_ICON_BOX}>{item.icon}</span>
                <span style={{ fontSize: 14.5, color: '#2b3240', fontWeight: 500 }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComposerPlusMenu;
