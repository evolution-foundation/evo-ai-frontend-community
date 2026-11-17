import { craFieldText } from '@/components/pipelines/craAcquisition';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CardConfiguration, CardFieldDefinition, PipelineItem } from '@/types/analytics/pipelines';
import { getDealCardPresentation } from './dealCardPresentation';
import { getContactAvatarStyle, getContactDisplayName, getContactInitials } from '@/utils/chat/avatarHelpers';
import { dateValue, fieldText, formatDate, money } from './cardConfiguration';
import type { DealTabId } from './deal/dealContext';
import DealConversationButton from './deal/DealConversationButton';
import type { DealConversationSummary } from '@/types/analytics/pipelines';

function CardContactAvatar({ url, name }: { url?: string; name?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const hueStyle = url?.trim() && failedUrl !== url ? undefined : getContactAvatarStyle(name);
  return <span className={`deal-contact-avatar${hueStyle ? ' av-hue' : ''}`} aria-hidden="true" style={hueStyle}>
    {url?.trim() && failedUrl !== url ? <img src={url} alt="" onError={() => setFailedUrl(url)} /> : getContactInitials(name) || '?'}
  </span>;
}

export default function ConfiguredDealCard({ item, configuration, definitions, preview = false, onOpen, onOpenConversation, onConversationChanged, canConfigureNumbers = false, onConfigureNumbers, onFilterLabel, activeLabel }: { item: PipelineItem; configuration: CardConfiguration; definitions: CardFieldDefinition[]; preview?: boolean; onOpen?: (item: PipelineItem, tab?: DealTabId) => void; onOpenConversation?: (item: PipelineItem, conversationId: string, displayId?: number | string | null) => void; onConversationChanged?: (item: PipelineItem, summary: DealConversationSummary) => void; canConfigureNumbers?: boolean; onConfigureNumbers?: (item: PipelineItem) => void; onFilterLabel?: (name: string) => void; activeLabel?: string }) {
  const card = getDealCardPresentation(item);
  const definitionMap = useMemo(() => new Map(definitions.map(field => [field.id, field])), [definitions]);
  const enabled = configuration.fields.filter(field => field.visible && definitionMap.has(field.id));
  const date = dateValue(item.entered_at);
  const age = date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)) : null;
  const renderField = (id: string) => {
    switch (id) {
      case 'title': return preview ? <span className="deal-title">{card.title}</span> : <button type="button" className="deal-title" onClick={() => onOpen?.(item)}>{card.title}</button>;
      case 'value': return <span className="deal-value">{item.value == null ? 'Não informado' : money(item.value, card.currency)}</span>;
      case 'contact': return card.contact ? <span className="deal-contact-line">{preview ? <span>{getContactDisplayName(card.contact.name)}</span> : <Link to={`/contacts/${card.contact.id}`}>{getContactDisplayName(card.contact.name)}{card.additionalContacts > 0 ? ` +${card.additionalContacts}` : ''}</Link>}</span> : (preview ? 'Vincular contato' : <button type="button" className="deal-contact-action" onClick={() => onOpen?.(item, 'contacts')}>Vincular contato</button>);
      case 'company': return item.company?.name || 'Não informado';
      case 'labels': return card.labels.length ? <span className="deal-labels">{card.labels.slice(0, 2).map(label => (onFilterLabel && !preview ? <button type="button" className={`deal-label is-filter${activeLabel === label.name ? ' is-active' : ''}`} key={label.name} aria-pressed={activeLabel === label.name} title={activeLabel === label.name ? `Remover filtro ${label.name}` : `Filtrar por ${label.name}`} onClick={event => { event.stopPropagation(); onFilterLabel(label.name); }}><i style={{ background: label.color || '#55768A' }} />{label.name}</button> : <span className="deal-label" key={label.name}><i style={{ background: label.color || '#55768A' }} />{label.name}</span>))}{card.labels.length > 2 ? <details><summary>+{card.labels.length - 2}</summary>{card.labels.slice(2).map(label => <div key={label.name}>{label.name}</div>)}</details> : null}</span> : 'Sem etiquetas';
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
        return <span><span className="deal-field-label">{definition?.label}: </span>{key.startsWith('cra_') && source === 'deal_attribute' ? craFieldText(item.custom_fields || {}, key) : fieldText(source === 'contact_attribute' ? item.primary_contact?.custom_attributes?.[key] : item.custom_fields?.[key], definition?.type)}</span>;
      }
    }
  };
  return <div className={`configured-deal-card ${configuration.density}`}>
    <div className="deal-card-heading"><CardContactAvatar key={card.contact?.id || 'none'} url={card.avatarUrl} name={card.contact?.name} /><div className="deal-heading-title">{renderField('title')}</div></div>
    {enabled.filter(field => !['title', 'owner', 'stage_age'].includes(field.id)).map(field => <div className={`deal-field deal-field-${field.id.split(':')[0]}`} title={field.id === 'last_message' ? `Conversa: ${card.message?.conversation_id || 'não informada'}` : field.id === 'channel_origin' ? `Conversa: ${item.channel_origin?.conversation_id || 'não informada'}` : undefined} key={field.id}>{renderField(field.id)}</div>)}
    {enabled.some(field => ['owner', 'stage_age'].includes(field.id)) ? <div className="deal-footer">{['owner', 'stage_age'].filter(id => enabled.some(field => field.id === id)).map(id => <div key={id}>{renderField(id)}</div>)}</div> : null}
    {!preview && (item.tasks_info?.total_count || 0) > 0 ? <div className="deal-tasks-chip" title={`${item.tasks_info.completed_count} de ${item.tasks_info.total_count} tarefas concluídas${item.tasks_info.overdue_count ? ` · ${item.tasks_info.overdue_count} atrasada(s)` : ''}`}><span aria-hidden="true">✓</span> {item.tasks_info.completed_count}/{item.tasks_info.total_count}{item.tasks_info.overdue_count > 0 ? <span className="deal-age-danger">{item.tasks_info.overdue_count} atrasada{item.tasks_info.overdue_count > 1 ? 's' : ''}</span> : null}</div> : null}
    {!preview && onOpenConversation ? <div className="deal-card-actions"><DealConversationButton dealId={item.deal_id || item.id} summary={item.conversation_summary} variant="card" canConfigure={canConfigureNumbers} onOpenConversation={(id, displayId) => onOpenConversation(item, id, displayId)} onConfigureNumbers={() => onConfigureNumbers?.(item)} onChanged={summary => onConversationChanged?.(item, summary)} /></div> : null}
  </div>;
}
