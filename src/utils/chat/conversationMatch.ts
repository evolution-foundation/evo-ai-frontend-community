import type { Conversation, ConversationFilter } from '@/types/chat/api';

/**
 * Single source of truth for "does this conversation still belong to the
 * currently active view (filters)?". Used by BOTH the realtime (WebSocket) path
 * and the mutation-reconcile path so a status/assignee change can drop a
 * conversation from the current view locally — without refetching the list.
 *
 * Empty filters = match-all. A 'all' value short-circuits to match.
 */
export function doesConversationMatchFilters(
  conversation: Conversation,
  activeFilters: ConversationFilter[],
  currentUserId?: string,
): boolean {
  if (!activeFilters || activeFilters.length === 0) return true;

  return activeFilters.every(filter => {
    const { attribute_key, filter_operator, values } = filter;
    if (!values || values.length === 0) return true;
    const stringValues = values.map(v => String(v));
    if (stringValues.some(v => v.toLowerCase() === 'all')) return true;

    let conversationValue: string | null | undefined;

    switch (attribute_key) {
      case 'status':
        conversationValue = conversation.status;
        break;
      case 'inbox_id':
        conversationValue = conversation.inbox_id ? String(conversation.inbox_id) : undefined;
        break;
      case 'assignee_id':
      case 'assignee_type': {
        // assignee_type (do modal) e assignee_id compartilham os valores
        // me/unassigned/assigned — mesma lógica de match no realtime.
        const val = String(values[0]);
        if (val === 'me') {
          const meMatches = currentUserId
            ? conversation.assignee_id != null && String(conversation.assignee_id) === String(currentUserId)
            : false;
          return filter_operator === 'not_equal_to' ? !meMatches : meMatches;
        }
        if (val === 'unassigned') {
          const isUnassigned = !conversation.assignee_id;
          return filter_operator === 'not_equal_to' ? !isUnassigned : isUnassigned;
        }
        if (val === 'assigned') {
          const isAssigned = !!conversation.assignee_id;
          return filter_operator === 'not_equal_to' ? !isAssigned : isAssigned;
        }
        conversationValue = conversation.assignee_id ? String(conversation.assignee_id) : null;
        break;
      }
      case 'team_id':
        conversationValue = conversation.team_id ? String(conversation.team_id) : null;
        break;
      case 'channel_type':
        conversationValue = conversation.channel || undefined;
        break;
      case 'priority':
        // Filtro avançado de prioridade (POST /filter). Sem este case o matcher
        // caía no default=true e não expulsava a conversa cuja prioridade mudou
        // pra fora do filtro ativo (ex.: High -> Low numa view "Prioridade=Alta").
        conversationValue = conversation.priority ?? null;
        break;
      case 'unread': {
        // Chip "Não lidas" (value 'true'): mantém/insere só conversas com
        // unread_count > 0; ao ler (unread_count -> 0) o WS remove da view.
        const isUnread = (conversation.unread_count ?? 0) > 0;
        return filter_operator === 'not_equal_to' ? !isUnread : isUnread;
      }
      case 'is_group': {
        // Chip "Grupos" (value 'true'): só conversas de grupo (is_group do
        // serializer). Sem isso o matcher caía no default=true e injetava
        // conversas não-grupo (ex.: a pinned) na aba Grupos via realtime.
        const isGroup = conversation.is_group === true;
        return filter_operator === 'not_equal_to' ? !isGroup : isGroup;
      }
      case 'labels': {
        // Filtro avançado de etiquetas (POST /filter). O valor é o TÍTULO da
        // etiqueta (useFilterOptions.ts:110); conversation.labels é Label[] (ou
        // string[] em alguns payloads de realtime) — normaliza pra título.
        // equal_to = "contém". Sem este case caía no default=true e não expulsava
        // a conversa cujas etiquetas saíram do filtro.
        const convLabels = ((conversation.labels ?? []) as Array<{ title?: string } | string>)
          .map(l => (typeof l === 'string' ? l : l.title))
          .filter((t): t is string => Boolean(t));
        if (filter_operator === 'is_present') return convLabels.length > 0;
        if (filter_operator === 'is_not_present') return convLabels.length === 0;
        const hasAny = stringValues.some(v => convLabels.includes(v));
        return filter_operator === 'not_equal_to' ? !hasAny : hasAny;
      }
      default:
        return true;
    }

    if (filter_operator === 'equal_to') {
      return conversationValue != null && stringValues.includes(String(conversationValue));
    }
    if (filter_operator === 'not_equal_to') {
      return conversationValue == null || !stringValues.includes(String(conversationValue));
    }
    if (filter_operator === 'contains') {
      return conversationValue != null && stringValues.some(v => String(conversationValue).includes(v));
    }
    if (filter_operator === 'does_not_contain') {
      return conversationValue == null || !stringValues.some(v => String(conversationValue).includes(v));
    }

    return true;
  });
}
