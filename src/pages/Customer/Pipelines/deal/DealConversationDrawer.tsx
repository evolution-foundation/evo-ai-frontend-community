import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import EmbeddedConversation from './EmbeddedConversation';

/**
 * Painel lateral com a conversa do negócio: o usuário continua no kanban
 * (filtros, scroll e cartões intactos). Esc ou o botão fecham e devolvem o foco.
 */
export default function DealConversationDrawer({ conversationId, title, onClose }: { conversationId: string; title: string; onClose: () => void }) {
  const { t } = useLanguage('pipelines');
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="deal-conversation-drawer" aria-describedby="deal-conversation-drawer-description">
        <header className="deal-drawer-header">
          <DialogTitle>{title}</DialogTitle>
          <button type="button" className="deal-modal-close is-inline" aria-label={t('dealConversation.close')} onClick={onClose}><X className="h-5 w-5" /></button>
        </header>
        <DialogDescription id="deal-conversation-drawer-description" className="sr-only">{t('dealConversation.drawerDescription')}</DialogDescription>
        <EmbeddedConversation conversationId={conversationId} />
      </DialogContent>
    </Dialog>
  );
}
