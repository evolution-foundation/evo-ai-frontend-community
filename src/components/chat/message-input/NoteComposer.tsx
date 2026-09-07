import React, { useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';

interface NoteComposerProps {
  onSave: (content: string) => void;
  onExit: () => void;
  isSaving?: boolean;
}

/**
 * Substitui a barra normal do composer quando o atendente escolhe "Notas da
 * Conversa" (menu +) — não é um modal (Melhorias CRM Chat §3.4). Salvar
 * envia a nota como mensagem privada (ver ConversationNoteBanner/MessageInput);
 * paleta ÂMBAR/laranja — a MESMA da mensagem/badge de Nota Privada na timeline
 * (orange-500 border, orange-50 bg), não o verde de marca.
 */
const NoteComposer: React.FC<NoteComposerProps> = ({ onSave, onExit, isSaving = false }) => {
  const { t } = useLanguage('chat');
  const [content, setContent] = useState('');

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setContent('');
  };

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        padding: '16px 20px 18px',
        borderTop: '3px solid #f97316',
        background: '#fff7ed',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ fontSize: 13.5, color: '#9a3412', lineHeight: 1.4 }}>
          {t(
            'messageInput.noteComposer.helper',
          )}
        </span>
        <div onClick={onExit} style={{ cursor: 'pointer', color: '#c2410c', flex: '0 0 auto', display: 'flex', marginTop: 1 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </div>
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={t('messageInput.noteComposer.placeholder')}
        disabled={isSaving}
        autoFocus
        style={{
          marginTop: 14,
          width: '100%',
          minHeight: 72,
          resize: 'none',
          border: '1px solid #fdba74',
          borderRadius: 12,
          background: '#FFFFFF',
          padding: '12px 14px',
          fontSize: 14,
          color: '#2b3240',
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
        <div
          onClick={onExit}
          style={{
            cursor: 'pointer',
            color: '#9a3412',
            fontSize: 14,
            fontWeight: 500,
            padding: '8px 16px',
            borderRadius: 9,
          }}
        >
          {t('messageInput.noteComposer.cancel')}
        </div>
        <div
          onClick={() => !isSaving && handleSave()}
          style={{
            cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
            opacity: content.trim() && !isSaving ? 1 : 0.6,
            background: '#f97316',
            border: '1px solid #f97316',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            padding: '8px 22px',
            borderRadius: 9,
            userSelect: 'none',
          }}
        >
          {isSaving ? t('messageInput.noteComposer.saving') : t('messageInput.noteComposer.save')}
        </div>
      </div>
    </div>
  );
};

export default NoteComposer;
