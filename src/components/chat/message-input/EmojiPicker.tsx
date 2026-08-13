import React, { useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsDarkClass } from '@/hooks/chat/useIsDarkClass';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose, isOpen }) => {
  const { t } = useLanguage('chat');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Verificar a classe dark diretamente no HTML
  const isDark = useIsDarkClass();

  // Converter tema do sistema para o tema do EmojiPicker
  const emojiTheme = isDark ? Theme.DARK : Theme.LIGHT;

  // Fechar o picker ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Adicionar evento após um pequeno delay para evitar fechar imediatamente
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    // Não fechar automaticamente para permitir múltiplas seleções
    // onClose();
  };

  return (
    <div
      ref={pickerRef}
      // Fixed 350px used to overflow off-screen on phones narrower than ~380px
      // (the picker is anchored to the emoji button near the left of the
      // composer, so capping the width — not repositioning — is enough to
      // keep it on-screen). Height is likewise capped against the viewport so
      // it doesn't get clipped under a shorter mobile browser window.
      className="absolute bottom-full left-0 mb-2 z-[9999] w-[min(350px,calc(100vw-2rem))]"
    >
      <div className="bg-background border-2 border-border rounded-lg shadow-2xl overflow-hidden">
        <EmojiPickerReact
          onEmojiClick={handleEmojiClick}
          theme={emojiTheme}
          searchPlaceHolder={t('messageInput.emojiPicker.searchPlaceholder')}
          width="100%"
          height="min(400px, 60vh)"
          previewConfig={{
            showPreview: false,
          }}
          skinTonesDisabled={false}
          searchDisabled={false}
          lazyLoadEmojis={true}
        />
      </div>
    </div>
  );
};

export default EmojiPicker;
