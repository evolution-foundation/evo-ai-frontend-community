import React, { useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsDarkClass } from '@/hooks/chat/useIsDarkClass';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
  /**
   * Where the panel opens relative to its trigger. Defaults to `top` (the chat
   * composer, which sits at the bottom of the screen). Use `bottom` when the
   * trigger is near the top of a scroll container (e.g. the template form modal)
   * so the 400px panel does not get clipped above (EVO-1971).
   */
  placement?: 'top' | 'bottom';
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  onClose,
  isOpen,
  placement = 'top',
}) => {
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
      className={`absolute left-0 z-[9999] ${
        placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
      }`}
      style={{
        minWidth: '350px',
        maxWidth: '350px',
      }}
    >
      <div className="bg-background border-2 border-border rounded-lg shadow-2xl overflow-hidden">
        <EmojiPickerReact
          onEmojiClick={handleEmojiClick}
          theme={emojiTheme}
          searchPlaceHolder={t('messageInput.emojiPicker.searchPlaceholder')}
          width="350px"
          height="400px"
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
