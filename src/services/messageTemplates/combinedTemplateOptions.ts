import globalMessageTemplatesService, { inferTemplateProvider } from './globalMessageTemplatesService';
import inboxesService from '@/services/channels/inboxesService';
import messageTemplatesService from '@/services/channels/messageTemplatesService';
import type { MessageTemplate } from '@/types/channels/inbox';
import type { Inbox } from '@/types/channels/inbox';

const WHATSAPP_CLOUD_CHANNEL_TYPE = 'Channel::WhatsappCloud';

/**
 * A template option for the stage-automation "send_template" picker, merged
 * from two sources: channel-less (generic/email) templates and, per-inbox,
 * WhatsApp Cloud (Meta-approved) templates. `source`/`inboxName` let the UI
 * label each option unambiguously (e.g. "WhatsApp · Support Line: tpl_name")
 * and `placeholders` carries the keys a variable-mapping UI needs to render
 * one field per template variable ("1", "2"... for WhatsApp Cloud; named
 * keys for a generic template).
 */
export interface MessageTemplateOption {
  id: string;
  name: string;
  language?: string;
  /** Provider approval status (WhatsApp Cloud): 'PENDING' renders disabled with a
   *  "waiting for Meta approval" note instead of vanishing into "no templates". */
  status?: string;
  source?: 'generic' | 'email' | 'whatsapp_cloud';
  inboxId?: string;
  inboxName?: string;
  placeholders?: string[];
}

const toGenericOption = (tpl: MessageTemplate): MessageTemplateOption => ({
  id: String(tpl.id),
  name: tpl.name,
  language: tpl.language,
  status: tpl.status,
  source: inferTemplateProvider(tpl),
  placeholders: (tpl.variables ?? []).map(v => v.name),
});

const toWhatsappOption = (tpl: MessageTemplate, inbox: Inbox): MessageTemplateOption => ({
  id: String(tpl.id),
  name: tpl.name,
  language: tpl.language,
  status: tpl.status,
  source: 'whatsapp_cloud',
  inboxId: inbox.id,
  inboxName: inbox.name,
  placeholders: (tpl.variables ?? []).map(v => v.name),
});

/**
 * Walk every page of `/inboxes` and return the full list. A single-page
 * fetch used to silently miss any WhatsApp Cloud inbox living on page 2+ of
 * an account with more inboxes than fit on one page.
 */
async function fetchAllInboxes(): Promise<Inbox[]> {
  const collected: Inbox[] = [];
  let page = 1;
  for (;;) {
    const res = await inboxesService.list({ page });
    collected.push(...(res.data ?? []));
    const totalPages = res.meta?.pagination?.total_pages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return collected;
}

/**
 * Fetch the combined template list for the stage-automation "send_template"
 * picker: channel-less templates (generic/email) plus every WhatsApp Cloud
 * inbox's approved/pending templates. Individual fetch failures are
 * swallowed (best-effort merge) rather than failing the whole picker.
 */
export async function fetchCombinedTemplateOptions(): Promise<MessageTemplateOption[]> {
  const [genericResult, inboxesResult] = await Promise.allSettled([
    globalMessageTemplatesService.getTemplates(),
    fetchAllInboxes(),
  ]);

  const genericOptions: MessageTemplateOption[] =
    genericResult.status === 'fulfilled' ? (genericResult.value.data ?? []).map(toGenericOption) : [];

  const whatsappInboxes: Inbox[] =
    inboxesResult.status === 'fulfilled'
      ? inboxesResult.value.filter(inbox => inbox.channel_type === WHATSAPP_CLOUD_CHANNEL_TYPE)
      : [];

  const templatesPerInbox = await Promise.allSettled(
    whatsappInboxes.map(inbox => messageTemplatesService.getTemplates(inbox.id)),
  );

  const whatsappOptions: MessageTemplateOption[] = templatesPerInbox.flatMap((res, idx) => {
    if (res.status !== 'fulfilled') return [];
    const inbox = whatsappInboxes[idx];
    return (res.value.data ?? []).map(tpl => toWhatsappOption(tpl, inbox));
  });

  return [...genericOptions, ...whatsappOptions];
}
