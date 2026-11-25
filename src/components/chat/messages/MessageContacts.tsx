import React from 'react';
import { Copy, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { isMaskedPhone } from '@/components/chat/messages/utils/sharedContacts';
import type { SharedContact } from '@/types/chat/api';

const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(word => /^\p{L}/u.test(word));
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return picked.map(word => word[0]).join('').toUpperCase();
};

/** Cartões de contato recebidos pelo WhatsApp, um por contato do vCard. */
const MessageContacts: React.FC<{ contacts: SharedContact[] }> = ({ contacts }) => {
  const { t } = useLanguage('chat');

  const copy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(t('messages.messageBubble.sharedContact.copied'));
    } catch {
      toast.error(t('messages.messageBubble.sharedContact.copyError'));
    }
  };

  return (
    <div className="flex w-64 max-w-full cursor-default flex-col gap-2">
      {contacts.map((contact, index) => (
        <div
          key={index}
          data-testid="shared-contact"
          className="rounded-md border border-border bg-background p-2 text-foreground"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {initials(contact.name || '') || <User className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold">
                {contact.name || t('messages.messageBubble.sharedContact.noName')}
              </div>
              {contact.organization && (
                <div className="break-words text-xs text-muted-foreground">{contact.organization}</div>
              )}
            </div>
          </div>
          {contact.phones?.map(phone => (
            <div key={phone} className="mt-2 flex flex-wrap items-center justify-between gap-x-1 border-t border-border pt-2">
              <span className="min-w-0 max-w-full break-words text-sm">{phone}</span>
              {!isMaskedPhone(phone) && (
                <button
                  type="button"
                  className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                  aria-label={`${t('messages.messageBubble.sharedContact.copy')} ${phone}`}
                  title={t('messages.messageBubble.sharedContact.copy')}
                  onClick={() => void copy(phone)}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MessageContacts;
