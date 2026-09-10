import { useCallback, useEffect, useRef } from 'react';
import { contactsService } from '@/services/contacts/contactsService';
import type { Contact as RestContact } from '@/types/contacts';
import type { Contact, Conversation } from '@/types/chat/api';

const RECONCILE_DEBOUNCE_MS = 250;

interface ContactUpdatedReconcilerParams {
  conversations: Conversation[];
  selectedConversationData: Conversation | null;
  /** Account masks PII and this session is not one of the masked audiences. */
  refetchEnabled: boolean;
  apply: (contact: Contact) => void;
}

const sameId = (a: string | number | null | undefined, b: string): boolean =>
  a !== null && a !== undefined && String(a) === b;

function toStoreContact(id: string, rest: Partial<RestContact> | null | undefined): Contact {
  if (!rest) {
    throw new Error(`Empty contact payload for ${id}`);
  }

  return {
    id: String(rest.id ?? id),
    name: rest.name ?? '',
    email: rest.email ?? null,
    phone_number: rest.phone_number ?? null,
    // The contact serializer emits the avatar as `thumbnail`.
    avatar_url: rest.thumbnail ?? rest.avatar_url ?? null,
    custom_attributes: (rest.custom_attributes ?? {}) as Record<string, unknown>,
    additional_attributes: rest.additional_attributes ?? {},
  };
}

// The fields the reducer patches. Anything else moving on the contact row —
// `last_activity_at`, bumped by every inbound message — repeats them.
const renderedSignature = (contact: Contact): string =>
  [contact.name, contact.email, contact.phone_number, contact.avatar_url]
    .map(value => value ?? '')
    .join('\u0000');

/**
 * Turns a `contact.updated` frame into the contact this session is entitled to
 * see: the broadcast is masked by the account flag alone, REST masks per
 * request. The refetch replaces the frame rather than following it, so the
 * masked value never reaches the store even for one paint.
 */
export function useContactUpdatedReconciler({
  conversations,
  selectedConversationData,
  refetchEnabled,
  apply,
}: ContactUpdatedReconcilerParams): (frameContact: Contact) => void {
  const paramsRef = useRef({ conversations, selectedConversationData, refetchEnabled, apply });
  useEffect(() => {
    paramsRef.current = { conversations, selectedConversationData, refetchEnabled, apply };
  }, [conversations, selectedConversationData, refetchEnabled, apply]);

  const timersRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Record<string, Contact>>({});
  const signaturesRef = useRef<Record<string, string>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const pending = pendingRef.current;
    const signatures = signaturesRef.current;
    const inFlight = inFlightRef.current;

    return () => {
      mountedRef.current = false;
      Object.values(timers).forEach(timerId => window.clearTimeout(timerId));
      Object.keys(timers).forEach(key => delete timers[key]);
      Object.keys(pending).forEach(key => delete pending[key]);
      Object.keys(signatures).forEach(key => delete signatures[key]);
      inFlight.clear();
    };
  }, []);

  const isInStore = useCallback((contactId: string): boolean => {
    const { conversations: list, selectedConversationData: selected } = paramsRef.current;
    const belongs = (conv: Conversation | null): boolean =>
      !!conv && (sameId(conv.contact?.id, contactId) || sameId(conv.meta?.sender?.id, contactId));

    return list.some(belongs) || belongs(selected);
  }, []);

  const scheduleRef = useRef<(contactId: string) => void>(() => {});

  const runRefetch = useCallback((contactId: string) => {
    const frameContact = pendingRef.current[contactId];
    if (!frameContact) {
      return;
    }

    delete pendingRef.current[contactId];
    inFlightRef.current.add(contactId);

    contactsService
      .getContact(contactId, false)
      .then(rest => {
        if (!mountedRef.current) return;
        paramsRef.current.apply(toStoreContact(contactId, rest));
      })
      .catch(err => {
        console.error('[contact.updated] Failed to reconcile contact via REST:', err);
        if (!mountedRef.current) return;
        // Masked but current beats leaving a stale name on screen. A frame that
        // landed mid-flight is newer than the one this request carried.
        paramsRef.current.apply(pendingRef.current[contactId] ?? frameContact);
      })
      .finally(() => {
        inFlightRef.current.delete(contactId);
        if (mountedRef.current && pendingRef.current[contactId]) {
          scheduleRef.current(contactId);
        }
      });
  }, []);

  const schedule = useCallback(
    (contactId: string) => {
      const existing = timersRef.current[contactId];
      if (existing) {
        window.clearTimeout(existing);
      }

      timersRef.current[contactId] = window.setTimeout(() => {
        delete timersRef.current[contactId];
        if (inFlightRef.current.has(contactId)) {
          return;
        }
        runRefetch(contactId);
      }, RECONCILE_DEBOUNCE_MS);
    },
    [runRefetch],
  );

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  return useCallback(
    (frameContact: Contact) => {
      if (!frameContact?.id) {
        return;
      }

      const contactId = String(frameContact.id);

      // Applied rather than dropped: the reducer ignores what it cannot match.
      // The snapshot lags a render, so a contact just added takes this path too.
      if (!paramsRef.current.refetchEnabled || !isInStore(contactId)) {
        paramsRef.current.apply(frameContact);
        return;
      }

      // Nothing the store renders moved, so it already holds the reconciled
      // value and the refetch would answer with what is on screen.
      const signature = renderedSignature(frameContact);
      if (signature === signaturesRef.current[contactId]) {
        return;
      }
      signaturesRef.current[contactId] = signature;

      pendingRef.current[contactId] = frameContact;
      schedule(contactId);
    },
    [isInStore, schedule],
  );
}
