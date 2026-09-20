import type { ConversationEventLabel } from '@/services/chat/websocket/ChatActionCableConnector';
import type { Label } from '@/types/settings/labels';

/**
 * Builds the labels of a conversation event.
 *
 * `labels_data` is the preferred source. `labels` stays a list of titles (the
 * external webhook contract) and is the fallback for a backend older than
 * CRM-155 — colourless, so the ChatContext merge keeps what is already on
 * screen instead of wiping it.
 *
 * Timestamps arrive as epoch numbers (`push_timestamps`), not ISO strings.
 */
export function mapEventLabels(
  labelsData: ConversationEventLabel[] | undefined,
  labels: unknown,
  createdAt: string | number,
  updatedAt: string | number
): Label[] {
  if (labelsData) {
    return labelsData.map((label) => ({
      id: String(label.id),
      title: String(label.title ?? ''),
      description: '',
      color: String(label.color ?? ''),
      show_on_sidebar: false,
      created_at: String(createdAt),
      updated_at: String(updatedAt),
    }));
  }

  if (!Array.isArray(labels)) return [];

  return labels.map((label: string | Record<string, unknown>) => {
    if (typeof label === 'string') {
      return {
        id: label,
        title: label,
        description: '',
        color: '',
        show_on_sidebar: false,
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      };
    }
    return {
      id: String(label.id),
      title: String(label.title || ''),
      description: String(label.description || ''),
      color: String(label.color || ''),
      show_on_sidebar: Boolean(label.show_on_sidebar),
      created_at: String(label.created_at || createdAt),
      updated_at: String(label.updated_at || updatedAt),
    };
  });
}
