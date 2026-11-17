import type { PipelineItem } from '@/types/analytics';
import { getContactDisplayName } from '@/utils/chat/avatarHelpers';

export function getDealCardPresentation(item: PipelineItem) {
  const contact = item.primary_contact || item.contact;
  const labels = item.labels || [];
  const legacyMessage = item.conversation?.last_non_activity_message;
  const message =
    item.latest_message ||
    (legacyMessage
      ? {
          id: legacyMessage.id,
          content: legacyMessage.content,
          message_type: String(legacyMessage.message_type),
          created_at: String(legacyMessage.created_at),
          conversation_id: item.conversation?.id || '',
        }
      : null);

  return {
    contact,
    labels,
    message,
    avatarUrl: contact?.avatar_url || contact?.thumbnail,
    title: item.title || `Negócio - ${getContactDisplayName(contact?.name) || 'Contato desconhecido'}`,
    secondary:
      [item.company?.name, getContactDisplayName(contact?.name)].filter(Boolean).join(' · ') || 'Sem contato associado',
    additionalContacts: Math.max((item.contact_count || 1) - 1, 0),
    value: item.value || 0,
    currency: item.currency || 'BRL',
    owner: item.owner,
  };
}
