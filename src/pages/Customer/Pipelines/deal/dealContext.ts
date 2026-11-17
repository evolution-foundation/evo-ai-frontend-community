import type { Deal, DealContact, Pipeline, UpdateDealData } from '@/types/analytics';

export const DEAL_TABS = [
  { id: 'activities', label: 'Atividades' },
  { id: 'contacts', label: 'Contato' },
  { id: 'company', label: 'Empresa' },
  { id: 'deal', label: 'Negócio' },
  { id: 'conversations', label: 'Conversas' },
  { id: 'files', label: 'Arquivos' },
  { id: 'history', label: 'Histórico' },
] as const;

export type DealTabId = (typeof DEAL_TABS)[number]['id'];

export const isDealTab = (value?: string | null): value is DealTabId => DEAL_TABS.some(tab => tab.id === value);

export interface DealTabProps {
  deal: Deal;
  pipeline: Pipeline | null;
  pipelineId: string;
  /** Salva alterações parciais no negócio (otimista, com reversão em caso de erro). */
  patchDeal: (changes: UpdateDealData, optimistic?: Partial<Deal>) => Promise<boolean>;
  /** Substitui o negócio pelo retorno de uma operação de associação. */
  replaceDeal: (next: Deal) => void;
  reload: () => Promise<void>;
  setTab: (tab: DealTabId) => void;
  primary?: DealContact | null;
}
