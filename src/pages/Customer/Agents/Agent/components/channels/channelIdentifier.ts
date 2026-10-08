import type { Inbox } from '@/types/channels/inbox';

/** What tells two channels of the same type apart: number, address or site. */
export const getInboxIdentifier = (inbox: Inbox): string | undefined => {
  const instanceName =
    inbox.provider_config?.instance_name || inbox.provider_config?.instanceName;

  return (
    inbox.phone_number ||
    inbox.email ||
    inbox.website_url ||
    (typeof instanceName === 'string' ? instanceName : undefined) ||
    undefined
  );
};
