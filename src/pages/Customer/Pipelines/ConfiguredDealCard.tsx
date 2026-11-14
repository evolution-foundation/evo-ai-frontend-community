import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { CardConfiguration, CardFieldDefinition, PipelineItem } from '@/types/analytics/pipelines';
import { getDealCardPresentation } from './dealCardPresentation';
import { getContactInitials } from '@/utils/chat/avatarHelpers';
import { dateValue, fieldText, formatDate, money } from './cardConfiguration';

function CardContactAvatar({ url, name }: { url?: string; name?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return <span className="deal-contact-avatar" aria-hidden="true">
    {url && failedUrl !== url ? <img src={url} alt="" onError={() => setFailedUrl(url)} /> : getContactInitials(name) || '?'}
  </span>;
}

export default function ConfiguredDealCard({ item, configuration, definitions, preview = false }: { item: PipelineItem; configuration: CardConfiguration; definitions: CardFieldDefinition[]; preview?: boolean }) {
  const location = useLocation();
  const card = getDealCardPresentation(item);
  const definitionMap = useMemo(() => new Map(definitions.map(field => [field.id, field])), [definitions]);
  const enabled = configuration.fields.filter(field => field.visible && definitionMap.has(field.id));
  const href = `/pipelines/${item.pipeline_id}/deals/${item.id}`;
  const date = dateValue(item.entered_at);
  const age = date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)) : null;
  const renderField = (id: string) => {
    switch (id) {
      case 'title': return preview ? <span className="deal-title">{card.title}</span> : <Link className="deal-title" to={href} state={{ returnTo: location.pathname + location.search }} onClick={event => { const board = event.currentTarget.closest<HTMLElement>('.kanban-scroll'); if (board) sessionStorage.setItem(`pipeline-scroll:${item.pipeline_id}`, String(board.scrollLeft)); }}>{card.title}</Link>;
      case 'value': return <span className="deal-value">{item.value == null ? 'Não informado' : money(item.value, card.currency)}</span>;
      case 'contact': return card.contact ? <span className="deal-contact-line"><CardContactAvatar key={card.contact.id} url={card.avatarUrl} name={card.contact.name} />{preview ? <span>{card.contact.name}</span> : <Link to={`/contacts/${card.contact.id}`}>{card.contact.name}{card.additionalContacts > 0 ? ` +${card.additionalContacts}` : ''}</Link>}</span> : (preview ? 'Vincular contato' : <Link className="deal-contact-action" to={`${href}?tab=contacts`}>Vincular contato</Link>);
      case 'company': return item.company?.name || 'Não informado';
      case 'labels': return card.labels.length ? <span className="deal-labels">{card.labels.slice(0, 2).map(label => <span className="deal-label" key={label.name}><i style={{ background: label.color || '#55768A' }} />{label.name}</span>)}{card.labels.length > 2 ? <details><summary>+{card.labels.length - 2}</summary>{card.labels.slice(2).map(label => <div key={label.name}>{label.name}</div>)}</details> : null}</span> : 'Sem etiquetas';
      case 'owner': return <span className="deal-owner">{card.owner?.avatar_url ? <img src={card.owner.avatar_url} alt="" /> : card.owner ? <span className="deal-owner-avatar">{card.owner.name.slice(0, 1)}</span> : null}<span>{card.owner?.name || 'Sem responsável'}</span></span>;
      case 'stage_age': return <span title={date?.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} className={age != null && age >= 14 ? 'deal-age-danger' : age != null && age >= 7 ? 'deal-age-warning' : ''}>{age == null ? 'Não informado' : age === 0 ? 'Hoje' : `Há ${age} ${age === 1 ? 'dia' : 'dias'}`}</span>;
      case 'created_at': return formatDate(item.created_at);
      case 'last_message': return card.message?.content || 'Sem mensagem';
      case 'last_activity': return item.last_activity ? `${formatDate(item.last_activity.occurred_at)} · ${item.last_activity.summary}` : 'Não informado';
      case 'next_task': {
        const due = dateValue(item.next_task?.due_at);
        return item.next_task ? <span>{due && due.getTime() < Date.now() ? <span className="deal-age-danger">⚠ Atrasada · </span> : null}{item.next_task.title} · {formatDate(item.next_task.due_at)}</span> : 'Sem tarefa';
      }
      case 'channel_origin': return [item.channel_origin?.channel, item.channel_origin?.origin].filter(Boolean).join(' · ') || 'Não informado';
      case 'utm': return <details><summary>{['utm_source', 'utm_medium', 'utm_campaign'].map(key => fieldText(item.custom_fields?.[key])).join(' / ')}</summary>{['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].map(key => <div key={key}>{key}: {fieldText(item.custom_fields?.[key])}</div>)}</details>;
      default: {
        const definition = definitionMap.get(id);
        const [source, ...parts] = id.split(':');
        const key = parts.join(':');
        return <span><span className="deal-field-label">{definition?.label}: </span>{fieldText(source === 'contact_attribute' ? item.primary_contact?.custom_attributes?.[key] : item.custom_fields?.[key], definition?.type)}</span>;
      }
    }
  };
  return <div className={`configured-deal-card ${configuration.density}`}>
    {enabled.filter(field => !['owner', 'stage_age'].includes(field.id)).map(field => <div className={`deal-field deal-field-${field.id.split(':')[0]}`} title={field.id === 'last_message' ? `Conversa: ${card.message?.conversation_id || 'não informada'}` : field.id === 'channel_origin' ? `Conversa: ${item.channel_origin?.conversation_id || 'não informada'}` : undefined} key={field.id}>{renderField(field.id)}</div>)}
    {enabled.some(field => ['owner', 'stage_age'].includes(field.id)) ? <div className="deal-footer">{['owner', 'stage_age'].filter(id => enabled.some(field => field.id === id)).map(id => <div key={id}>{renderField(id)}</div>)}</div> : null}
  </div>;
}
