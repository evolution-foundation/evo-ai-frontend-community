import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@evoapi/design-system';
import './deal-modal.css';
import DealDetailContent, { type DealDetailContentProps } from './DealDetailContent';

export interface DealModalProps extends Omit<DealDetailContentProps, 'onClose'> {
  onClose: () => void;
}

/**
 * Detalhe do negócio sobre o kanban. Radix prende o foco, fecha com Esc e devolve
 * o foco ao elemento que abriu. Em telas estreitas vira tela cheia (CSS .deal-modal).
 */
export default function DealModal({ onClose, ...content }: DealModalProps) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="deal-modal"
        aria-describedby="deal-modal-description"
        onEscapeKeyDown={event => {
          // Esc fecha primeiro o menu de tags aberto; o modal fecha no Esc seguinte
          if (document.querySelector('.deal-tag-menu')) event.preventDefault();
        }}
        onOpenAutoFocus={event => {
          // foco no próprio painel (não no primeiro botão) para não "pular" a leitura do cabeçalho
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus({ preventScroll: true });
        }}
      >
        <DialogTitle className="sr-only">Detalhe do negócio</DialogTitle>
        <DialogDescription id="deal-modal-description" className="sr-only">
          Abas de atividades, contato, empresa, negócio, conversas, arquivos e histórico. Pressione Esc para voltar ao quadro.
        </DialogDescription>
        <button type="button" className="deal-modal-close" aria-label="Fechar negócio" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
        <DealDetailContent {...content} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
