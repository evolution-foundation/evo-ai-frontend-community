import api from '@/services/core/api';
import type { ContactEventsQuery, ContactEventsResponse } from '@/types/contacts';

interface MaybeEnveloped {
  data?: ContactEventsResponse;
  events?: unknown;
  next_cursor?: unknown;
  degraded?: unknown;
}

// The 7.7 controller currently does `render json: body`, so the wire shape is
// `{ events, next_cursor?, degraded? }` directly. Other endpoints under
// /api/v1/contacts/* are enveloped (`{ data: ..., meta: ... }`). Because the
// envelope contract diverges by endpoint and there was no live backend in
// scope to smoke-test (AC26), the unwrap below accepts both shapes:
//   - If the body already has `events`, return it as-is.
//   - If the body looks enveloped (has `data.events`), unwrap one level.
// We do NOT chain envelope detection beyond one level — anything deeper is a
// backend bug that should not be papered over.
function unwrap(body: MaybeEnveloped): ContactEventsResponse {
  if (Array.isArray(body.events)) return body as unknown as ContactEventsResponse;
  if (body.data && Array.isArray(body.data.events)) return body.data;
  // Neither shape — return as-is so the caller's typing surfaces the problem
  // instead of a silent empty list.
  return body as unknown as ContactEventsResponse;
}

class ContactEventsService {
  // GET /api/v1/contacts/:contactId/events
  async list(
    contactId: string,
    params: ContactEventsQuery = {},
    options?: { signal?: AbortSignal },
  ): Promise<ContactEventsResponse> {
    const { data } = await api.get<MaybeEnveloped>(`/contacts/${contactId}/events`, {
      params,
      signal: options?.signal,
    });
    return unwrap(data);
  }
}

export const contactEventsService = new ContactEventsService();
