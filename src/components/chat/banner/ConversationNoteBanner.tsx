import React from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import type { Message } from '@/types/chat/api';

interface ConversationNoteBannerProps {
  note: Message;
  onHide: () => void;
}

/**
 * Faixa fixa acima do composer com a nota mais recente do atendimento —
 * estilo/cores exatos do protótipo de referência (Melhorias CRM Chat §3.4):
 * fundo bege, borda superior grossa âmbar. A "nota" é a última mensagem
 * privada da conversa (ver spec-extraida.md) — sem entidade própria.
 */
const ConversationNoteBanner: React.FC<ConversationNoteBannerProps> = ({ note, onHide }) => {
  const { t } = useLanguage('chat');

  return (
    <div
      className="border-t-[3px] border-b border-t-[#f3c34a] border-b-[#f0e4c8] bg-[#FDF9EF] dark:border-t-amber-500 dark:border-b-amber-900 dark:bg-amber-950/40"
      style={{
        alignSelf: 'stretch',
        padding: '12px 26px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#c99a1e] dark:text-amber-400"
          style={{ marginTop: 1, flex: '0 0 17px' }}
        >
          <path d="M4 4h16v11H9l-5 5z" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span
              className="text-[#a97e10] dark:text-amber-300"
              style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}
            >
              {t('chatArea.noteBanner.title', 'Nota do atendimento')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <span className="text-[#b39a55] dark:text-amber-200/70" style={{ fontSize: 11.5 }}>
                {note.sender?.name}
              </span>
              <div
                onClick={onHide}
                title={t('chatArea.noteBanner.hide', 'Ocultar')}
                className="text-[#bda75c] dark:text-amber-200/70"
                style={{ cursor: 'pointer', display: 'flex' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </div>
            </div>
          </div>
          <div className="text-[#5c4f2e] dark:text-amber-100" style={{ fontSize: 14, lineHeight: 1.45, marginTop: 4 }}>
            {note.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationNoteBanner;
