import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { PipelineItem } from '@/types/analytics/pipelines';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@evoapi/design-system';
import './deal-modal.css';
import DealDetailContent, { type DealDetailContentProps } from './DealDetailContent';

export interface DealModalProps extends Omit<DealDetailContentProps, 'onClose'> {
  onClose: () => void;
  neighbors?: { prev?: PipelineItem; next?: PipelineItem; position: string; stageName?: string };
  onNavigate?: (item: PipelineItem) => void;
}

/**
 * Detalhe do negócio sobre o kanban. Radix prende o foco, fecha com Esc e devolve
 * o foco ao elemento que abriu. Em telas estreitas vira tela cheia (CSS .deal-modal).
 */
export default function DealModal({ onClose, neighbors, onNavigate, ...content }: DealModalProps) {
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
        onKeyDown={event => {
          // Alt+←/→: negócio anterior/próximo da etapa (não interfere na digitação)
          if (!event.altKey || !neighbors || !onNavigate) return;
          const target = event.key === 'ArrowLeft' ? neighbors.prev : event.key === 'ArrowRight' ? neighbors.next : undefined;
          if (target) { event.preventDefault(); onNavigate(target); }
        }}
        onOpenAutoFocus={event => {
          // foco no próprio painel (não no primeiro botão) para não "pular" a leitura do cabeçalho
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus({ preventScroll: true });
        }}
      >
        <DialogTitle className="sr-only">Detalhe do negócio</DialogTitle>
        <DialogDescription id="deal-modal-description" className="sr-only">
          Abas de atividades, contatos, negócio, conversas, arquivos e histórico. Pressione Esc para voltar ao quadro.
        </DialogDescription>
        {neighbors && onNavigate && (
          <div className="deal-modal-pager" role="group" aria-label="Navegar entre negócios da etapa">
            <button type="button" aria-label="Negócio anterior" title="Anterior (Alt+←)" disabled={!neighbors.prev} onClick={() => neighbors.prev && onNavigate(neighbors.prev)}><ChevronLeft className="h-4 w-4" /></button>
            <span aria-live="polite">{neighbors.position}</span>
            <button type="button" aria-label="Próximo negócio" title="Próximo (Alt+→)" disabled={!neighbors.next} onClick={() => neighbors.next && onNavigate(neighbors.next)}><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
        <button type="button" className="deal-modal-close" aria-label="Fechar negócio" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
        <DealDetailContent {...content} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
