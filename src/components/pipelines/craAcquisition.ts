import { fieldText, formatDate } from '@/pages/Customer/Pipelines/cardConfiguration';

export const craTechnical = new Set(['cra_acquisition_id', 'cra_source', 'cra_inbox_id', 'cra_instance_id', 'cra_acquired_at', 'cra_source_id', 'cra_ad_id', 'cra_adset_id', 'cra_campaign_id']);
export const craPrivate = new Set(['cra_ctwa_clid', 'cra_visitor_id', 'cra_projection', 'cra_manual_fields', 'cra_first_touch', 'cra_last_touch', 'cra_consent']);
const sources: Record<string, string> = { website: 'Site', ctwa: 'Anúncio WhatsApp', chat: 'Chat', none: 'Não informado' };
export function craFieldText(fields: Record<string, unknown>, key: string): string {
  if (craPrivate.has(key)) return 'Restrito';
  if (key === 'cra_resolution_status') return ({resolved:'Resolvido', pending:'Pendente', stale:'Atualização pendente', not_found:'Não encontrado', forbidden:'Sem permissão', retry:'Nova tentativa pendente', conflict:'Revisão necessária'} as Record<string,string>)[String(fields[key])] || 'Não informado';
  if (key === 'cra_source') return sources[String(fields[key])] || 'Não informado';
  if (key === 'cra_acquired_at' || key === 'cra_resolution_at') return formatDate(fields[key]);
  const fallback: Record<string, string> = { cra_ad_name: 'cra_ad_id', cra_adset_name: 'cra_adset_id', cra_campaign_name: 'cra_campaign_id' };
  return fieldText(fields[key] || fields[fallback[key]]);
}
export function safeAdUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const allowed = ['fb.me', 'facebook.com', 'instagram.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return url.protocol === 'https:' && !url.username && !url.password && url.port === '' && allowed ? url.href : null;
  } catch { return null; }
}
