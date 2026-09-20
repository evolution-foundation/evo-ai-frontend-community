import React, { useEffect, useRef, useState } from 'react';

import {
  MessageSquareText,
  FileText,
  Image,
  StickyNote,
  CalendarClock,
  LayoutTemplate,
} from 'lucide-react';

import { useLanguage } from '@/hooks/useLanguage';

interface ComposerPlusMenuProps {
  disabled?: boolean;
  onOpenQuickReplies: () => void;
  onPickDocuments: () => void;
  onPickMedia: () => void;
  onOpenConversationNote: () => void;
  onSchedule: () => void;
  /** Agendar exige mensagem já digitada no composer (o modal só lê o conteúdo, não tem campo próprio). */
  scheduleDisabled?: boolean;
  /** WhatsApp Cloud templates — sem equivalente no protótipo, mantido como 6º item quando disponível. */
  onOpenTemplates?: () => void;
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
  onOpenQuickReplies,
  onPickDocuments,
  onPickMedia,
  onOpenConversationNote,
  onSchedule,
  scheduleDisabled = false,
  onOpenTemplates,
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

  type MenuItem = {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    disabledTitle?: string;
  };

  const items: MenuItem[] = [
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
      disabled: scheduleDisabled,
      disabledTitle: t('messageInput.composerMenu.scheduleDisabledHint'),
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
          {items.map(item => (
            <div
              key={item.key}
              title={item.disabled ? item.disabledTitle : undefined}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 10px',
                borderRadius: 10,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!item.disabled) e.currentTarget.style.background = '#f4f6f9';
              }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span className={ITEM_ICON_BOX}>{item.icon}</span>
              <span style={{ fontSize: 14.5, color: '#2b3240', fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComposerPlusMenu;
