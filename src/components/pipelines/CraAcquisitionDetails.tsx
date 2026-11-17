import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import { fieldText } from '@/pages/Customer/Pipelines/cardConfiguration';

import { craFieldText, safeAdUrl } from './craAcquisition';
const labels: Record<string, string> = { cra_source: 'Origem', cra_campaign_name: 'Campanha', cra_campaign_id: 'ID da campanha', cra_adset_name: 'Conjunto', cra_adset_id: 'ID do conjunto', cra_ad_name: 'Anúncio', cra_ad_id: 'ID do anúncio', cra_placement: 'Posicionamento', cra_acquired_at: 'Data da aquisição', cra_resolution_status: 'Resolução do anúncio', cra_page_url: 'Página', cra_referrer: 'Referência', cra_utm_source: 'UTM origem', cra_utm_medium: 'UTM mídia', cra_utm_campaign: 'UTM campanha', cra_utm_content: 'UTM conjunto', cra_utm_term: 'UTM anúncio', cra_utm_posicionamento: 'UTM posicionamento' };
function Touch({ title, value }: { title: string; value: unknown }) {
  const touch = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const keys = title === 'Consentimento' ? ['basis', 'version', 'at', 'analytics', 'ads'] : ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_posicionamento', 'page_url', 'referrer', 'captured_at'];
  return <details><summary className="cursor-pointer font-medium">{title}</summary><dl className="grid gap-2 mt-2">{keys.filter(key => touch[key] != null).map(key => <div key={key}><dt className="text-muted-foreground">{key}</dt><dd className="break-words">{fieldText(touch[key])}</dd></div>)}</dl></details>;
}
export default function CraAcquisitionDetails({ fields, pipelineId, itemId }: { fields: Record<string, unknown>; pipelineId?: string; itemId?: string }) {
  if (!fields.cra_source) return null;
  const adUrl = safeAdUrl(fields.cra_source_url);
  return <section aria-label="Aquisição" className="mt-5 rounded-xl border border-border p-4 space-y-4 text-sm">
    <h3 className="font-semibold">Aquisição</h3>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(labels).map(([key, label]) => <div key={key}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{craFieldText(fields, key)}</dd></div>)}</dl>
    {fields.cra_headline ? <p className="break-words">{fieldText(fields.cra_headline)}</p> : null}
    {fields.cra_source_url ? adUrl ? <a className="underline break-all" href={adUrl} target="_blank" rel="noopener noreferrer">Ver anúncio</a> : <p className="break-all">{fieldText(fields.cra_source_url)}</p> : null}
    <Touch title="Primeiro toque" value={fields.cra_first_touch} />
    <Touch title="Último toque" value={fields.cra_last_touch} />
    <Touch title="Consentimento" value={fields.cra_consent} />
    {pipelineId && itemId ? <CraIdentifiers key={itemId} pipelineId={pipelineId} itemId={itemId} /> : null}
  </section>;
}

function CraIdentifiers({ pipelineId, itemId }: { pipelineId: string; itemId: string }) {
  const role = useAuthStore(state => state.currentUser?.role?.key);
  const [data, setData] = useState<{ visitor_id?: string; ctwa_clid?: string } | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => { setData(null); setStatus(''); }, [pipelineId, itemId]);
  if (!['super_admin', 'account_owner', 'administrator', 'admin'].includes(role || '')) return null;
  async function load() {
    setStatus('Carregando…');
    try {
      const response = await api.get(`/pipelines/${pipelineId}/pipeline_items/${itemId}/acquisition`);
      setData(extractData(response)); setStatus('');
    } catch { setStatus('Identificadores indisponíveis'); }
  }
  return <div><button type="button" className="underline" onClick={load}>Identificadores técnicos</button>{status ? <p role="status">{status}</p> : null}{data ? <dl><dt>CTWA</dt><dd>{data.ctwa_clid || 'Não informado'}</dd><dt>Visitante</dt><dd>{data.visitor_id || 'Não informado'}</dd></dl> : null}</div>;
}
