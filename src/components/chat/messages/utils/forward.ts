import { MESSAGE_TYPE, type Message } from '@/types/chat/api';
import { isMaskedPhone } from './sharedContacts';

export const MAX_FORWARD_TARGETS = 5;

const SENDABLE_ATTACHMENTS = ['image', 'audio', 'video', 'file'];

const isUsablePhone = (phone: string) => !isMaskedPhone(phone) && phone.replace(/\D/g, '').length >= 10;

/** Mesmas recusas do backend (`Messages::ForwardService`): o que ele recusaria não é oferecido. */
export const canForward = (message: Message) => {
  const attributes = message.content_attributes ?? {};
  if (
    message.private ||
    message.message_type === MESSAGE_TYPE.ACTIVITY ||
    message.status === 'failed' ||
    message.status === 'progress' ||
    attributes.deleted ||
    attributes.revoked_by_contact ||
    attributes.is_reaction ||
    attributes.is_unsupported ||
    attributes.media_unavailable
  ) {
    return false;
  }
  const attachments = message.attachments ?? [];
  if (!attachments.every(file => SENDABLE_ATTACHMENTS.includes(file.file_type) && file.data_url)) return false;
  const contacts = attributes.shared_contacts ?? [];
  if (!contacts.every(contact => contact.phones?.some(isUsablePhone))) return false;
  return Boolean(message.content?.trim()) || attachments.length > 0 || contacts.length > 0;
};
