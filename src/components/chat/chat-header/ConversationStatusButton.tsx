import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { STATUS_META } from './statusMeta';

interface ConversationStatusButtonProps {
  status: string;
  onMarkAsOpen: () => void;
  onMarkAsResolved: () => void;
  onMarkAsPending: () => void;
  onMarkAsSnoozed: () => void;
}

/**
 * Botão de status = 2 segmentos colados (não 1 botão único): segmento
 * principal (label = próxima ação, bg = cor do status ATUAL) + segmento
 * chevron (bg = tom escuro do mesmo status) que abre um dropdown com as 4
 * opções fixas. Espelha o protótipo pixel a pixel — ver spec-extraida.md.
 */
const ConversationStatusButton = ({
  status,
  onMarkAsOpen,
  onMarkAsResolved,
  onMarkAsPending,
  onMarkAsSnoozed,
}: ConversationStatusButtonProps) => {
  const { t } = useLanguage('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // mousedown (não click): fecha ANTES do próximo click "abrir de novo" ter
    // chance de competir, e não depende de bubbling terminar no mesmo tick em
    // que o menu abriu. capture:true garante que rodamos antes de qualquer
    // stopPropagation() de um filho.
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const meta = STATUS_META[status] || STATUS_META.snoozed;
  const mainLabel =
    status === 'open'
      ? t('chatHeader.statusButton.complete')
      : t('chatHeader.statusButton.open');
  const mainAction = status === 'open' ? onMarkAsResolved : onMarkAsOpen;

  const options = [
    { key: 'open', label: t('chatHeader.statusButton.openFull'), onClick: onMarkAsOpen },
    { key: 'pending', label: t('contexts.conversations.statusNames.pending'), onClick: onMarkAsPending },
    { key: 'snoozed', label: t('chatHeader.statusButton.pause'), onClick: onMarkAsSnoozed },
    { key: 'resolved', label: t('chatHeader.statusButton.complete'), onClick: onMarkAsResolved },
  ];

  return (
    <div ref={rootRef} className="relative">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'stretch',
          borderRadius: 9,
          overflow: 'hidden',
          userSelect: 'none',
          boxShadow: '0 1px 3px rgba(20,30,45,.18)',
        }}
      >
        <button
          type="button"
          onClick={mainAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '9px 18px',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: meta.color,
            cursor: 'pointer',
          }}
        >
          {mainLabel}
        </button>
        <button
          type="button"
          aria-label={t('chatHeader.statusButton.changeStatus')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(prev => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 9px',
            color: '#FFFFFF',
            backgroundColor: meta.dark,
            cursor: 'pointer',
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 206,
            background: '#FFFFFF',
            border: '1px solid #eceef2',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(20,30,45,.16)',
            padding: 7,
            zIndex: 100,
          }}
        >
          {options.map(o => {
            const optMeta = STATUS_META[o.key];
            const selected = o.key === status;
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={o.key}
                onClick={() => {
                  setMenuOpen(false);
                  o.onClick();
                }}
                style={{
                  display: 'flex',
                  width: '100%',
                  textAlign: 'left',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: selected ? `${optMeta.color}14` : 'transparent',
                  border: selected ? `1px solid ${optMeta.color}` : '1px solid transparent',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: optMeta.color,
                    flex: '0 0 8px',
                  }}
                />
                <span style={{ fontSize: 14, color: '#2b3240', fontWeight: 600 }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationStatusButton;
