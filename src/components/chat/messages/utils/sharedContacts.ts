import type { Message } from '@/types/chat/api';

/** Telefone mascarado pelo backend (`mask_contact_pii`): não serve para copiar. */
export const isMaskedPhone = (phone: string) => phone.includes('*');

const hasMaskedPhone = (message: Message) =>
  Boolean(message.content_attributes?.shared_contacts?.some(contact => contact.phones?.some(isMaskedPhone)));

/** O tempo real vem sempre mascarado: não troca os telefones completos já carregados. */
export const keepUnmaskedContacts = (current: Message | undefined, incoming: Message): Message => {
  const loaded = current?.content_attributes?.shared_contacts;
  if (!loaded || hasMaskedPhone(current) || !hasMaskedPhone(incoming)) return incoming;
  return { ...incoming, content_attributes: { ...incoming.content_attributes, shared_contacts: loaded } };
};
