import type { DealContact, DealHistoryEvent } from '@/types/analytics';

export const formatMoney = (value = 0, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

export const formatDateTime = (date?: string | number | null) => {
  if (!date) return '—';
  const parsed = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const formatDay = (date: Date) =>
  date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export function relativeTime(date?: string | number | null, now = Date.now()) {
  if (!date) return '';
  const parsed = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  const diff = Math.max(0, now - parsed.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

export const contactAvatarUrl = (contact?: Pick<DealContact, 'avatar_url' | 'thumbnail'> | null) =>
  contact?.avatar_url || contact?.thumbnail || undefined;

export const dayKey = (value: string | number) => {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'sem-data' : date.toISOString().slice(0, 10);
};

/** Rótulos legíveis para as ações do histórico; desconhecidas viram "texto com espaços". */
const ACTION_LABELS: Record<string, string> = {
  deal_created: 'Negócio criado',
  deal_updated: 'Negócio atualizado',
  stage_changed: 'Mudou de etapa',
  contact_linked: 'Contato associado',
  contact_unlinked: 'Contato removido',
  conversation_linked: 'Conversa associada',
  conversation_unlinked: 'Conversa removida',
  files_attached: 'Arquivos anexados',
  file_removed: 'Arquivo removido',
  owner_changed: 'Responsável alterado',
  label_added: 'Tag adicionada',
  label_removed: 'Tag removida',
};

export const actionLabel = (action: string) =>
  ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/^./, char => char.toUpperCase());

export type HistoryGroup = 'stage' | 'contact' | 'conversation' | 'file' | 'deal';

export function historyGroup(event: Pick<DealHistoryEvent, 'action'>): HistoryGroup {
  const action = event.action;
  if (action.includes('stage')) return 'stage';
  if (action.includes('contact')) return 'contact';
  if (action.includes('conversation')) return 'conversation';
  if (action.includes('file')) return 'file';
  return 'deal';
}

export const HISTORY_GROUP_LABELS: Record<HistoryGroup, string> = {
  deal: 'Negócio',
  stage: 'Etapas',
  contact: 'Contatos',
  conversation: 'Conversas',
  file: 'Arquivos',
};

/** DDI → bandeira para o campo de telefone (cobre os países mais comuns; demais sem bandeira). */
const FLAGS: Array<[string, string]> = [
  ['+351', '🇵🇹'], ['+54', '🇦🇷'], ['+55', '🇧🇷'], ['+56', '🇨🇱'], ['+57', '🇨🇴'],
  ['+58', '🇻🇪'], ['+52', '🇲🇽'], ['+34', '🇪🇸'], ['+44', '🇬🇧'], ['+49', '🇩🇪'],
  ['+33', '🇫🇷'], ['+39', '🇮🇹'], ['+598', '🇺🇾'], ['+595', '🇵🇾'], ['+591', '🇧🇴'],
  ['+51', '🇵🇪'], ['+593', '🇪🇨'], ['+1', '🇺🇸'],
];

export function phoneFlag(phone?: string | null) {
  const value = (phone || '').replace(/[^\d+]/g, '');
  return FLAGS.find(([code]) => value.startsWith(code))?.[1] ?? '';
}

export function phoneDisplay(phone?: string | null) {
  const value = (phone || '').trim();
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+55') && (digits.length === 13 || digits.length === 12)) {
    const rest = digits.slice(2);
    return `+55 ${rest.slice(0, 2)} ${rest.slice(2, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return value;
}
