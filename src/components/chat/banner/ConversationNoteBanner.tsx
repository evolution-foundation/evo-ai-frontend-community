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
      style={{
        alignSelf: 'stretch',
        background: '#FDF9EF',
        borderBottom: '1px solid #f0e4c8',
        borderTop: '3px solid #f3c34a',
        padding: '12px 26px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c99a1e"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginTop: 1, flex: '0 0 17px' }}
        >
          <path d="M4 4h16v11H9l-5 5z" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a97e10', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              {t('chatArea.noteBanner.title')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
              <span style={{ fontSize: 11.5, color: '#b39a55' }}>{note.sender?.name}</span>
              <div
                onClick={onHide}
                title={t('chatArea.noteBanner.hide')}
                style={{ cursor: 'pointer', color: '#bda75c', display: 'flex' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#5c4f2e', lineHeight: 1.45, marginTop: 4 }}>{note.content}</div>
        </div>
      </div>
    </div>
  );
};

export default ConversationNoteBanner;
