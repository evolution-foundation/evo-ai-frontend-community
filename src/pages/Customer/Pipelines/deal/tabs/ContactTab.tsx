import { useEffect, useMemo, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { contactsService } from '@/services/contacts';
import { pipelinesService } from '@/services/pipelines';
import CustomAttributes from '@/components/contacts/CustomAttributes';
import type { DealContact } from '@/types/analytics';
import { getContactDisplayName } from '@/utils/chat/avatarHelpers';
import type { DealTabProps } from '../dealContext';
import FieldList, { type FieldGroup } from '../FieldList';
import { HeaderAvatar } from '../HeaderAvatar';
import { phoneDisplay, phoneFlag } from '../dealFormat';

const text = (value: unknown) => (value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value));

export default function ContactTab({ deal, pipelineId, replaceDeal, reload, primary }: DealTabProps) {
  const people = useMemo(() => deal.contacts || [], [deal.contacts]);
  const [selectedId, setSelectedId] = useState<string | undefined>(primary?.id || people[0]?.id);
  const [available, setAvailable] = useState<DealContact[]>([]);
  const [pick, setPick] = useState('');
  const [attrs, setAttrs] = useState<Record<string, unknown> | null>(null);
  const contact = people.find(item => item.id === selectedId) || people[0];

  useEffect(() => {
    void pipelinesService.getAvailableContacts(pipelineId).then(list => setAvailable(list as DealContact[])).catch(() => undefined);
  }, [pipelineId]);
  useEffect(() => setAttrs(null), [contact?.id]);

  const save = async (changes: Partial<DealContact>) => {
    if (!contact) return;
    try {
      await contactsService.updateContact(contact.id, {
        name: changes.name ?? contact.name,
        email: changes.email ?? contact.email,
        phone_number: changes.phone_number ?? contact.phone_number,
        custom_attributes: changes.custom_attributes ?? contact.custom_attributes,
      });
      await reload();
      toast.success('Contato atualizado.');
    } catch {
      toast.error('Não foi possível atualizar o contato.');
    }
  };
  const associate = async (asPrimary: boolean) => {
    if (!pick) return;
    try {
      replaceDeal(await pipelinesService.addDealContact(deal.id, pick, asPrimary));
      setPick('');
      toast.success('Contato associado.');
    } catch {
      toast.error('Não foi possível associar o contato.');
    }
  };
  const makePrimary = async (target: DealContact) => {
    try {
      replaceDeal(await pipelinesService.addDealContact(deal.id, target.id, true));
      toast.success('Contato principal atualizado.');
    } catch {
      toast.error('Não foi possível alterar o contato principal.');
    }
  };
  const remove = async (target: DealContact) => {
    try {
      replaceDeal(await pipelinesService.removeDealContact(deal.id, target.id));
      toast.success('Contato removido do negócio.');
    } catch {
      toast.error('Não foi possível remover o contato.');
    }
  };

  const options = available.filter(item => !deal.contacts?.some(linked => linked.id === item.id));
  const custom = contact?.custom_attributes || {};
  const groups: FieldGroup[] = contact
    ? [
        {
          id: 'general',
          label: 'Informações gerais',
          fields: [
            { key: 'name', label: 'Nome', value: contact.name || '', onCommit: value => save({ name: value }) },
            { key: 'email', label: 'E-mail', type: 'email', value: contact.email || '', onCommit: value => save({ email: value }) },
            { key: 'phone', label: 'Telefone', type: 'phone', value: contact.phone_number || '', display: phoneDisplay(contact.phone_number), prefix: phoneFlag(contact.phone_number), onCommit: value => save({ phone_number: value }) },
          ],
        },
        ...(Object.keys(custom).length
          ? [{
              id: 'custom',
              label: 'Atributos personalizados',
              fields: Object.keys(custom).map(key => ({ key: `attr-${key}`, label: key, value: text(custom[key]), onCommit: (value: string) => save({ custom_attributes: { ...custom, [key]: value } }) })),
            }]
          : []),
      ]
    : [];

  return (
    <div className="deal-contact-tab">
      <section className="deal-contact-people" aria-label="Contatos do negócio">
        <div className="deal-associate">
          <select aria-label="Selecionar contato" value={pick} onChange={event => setPick(event.target.value)}>
            <option value="">Associar um contato…</option>
            {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => void associate(false)} disabled={!pick}><Plus className="mr-1 h-4 w-4" />Associar</Button>
          <Button size="sm" onClick={() => void associate(true)} disabled={!pick}>Associar como principal</Button>
        </div>
        {people.length > 0 && (
          <ul className="deal-people-chips">
            {people.map(item => {
              const isPrimary = primary?.id === item.id;
              return (
                <li key={item.id} className={item.id === contact?.id ? 'is-active' : ''}>
                  <button type="button" onClick={() => setSelectedId(item.id)} aria-pressed={item.id === contact?.id}>
                    <HeaderAvatar contact={item} />
                    <span>{getContactDisplayName(item.name)}</span>
                    {isPrimary && <><Star className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Contato principal</span></>}
                  </button>
                  {!isPrimary && <button type="button" className="deal-link-button" onClick={() => void makePrimary(item)}>Tornar principal</button>}
                  <button type="button" className="deal-icon-danger" aria-label={`Remover ${item.name}`} onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {contact ? (
        <>
          <FieldList key={contact.id} title="Campos de contato" groups={groups} />
          <details className="deal-attrs">
            <summary>Adicionar ou editar atributos personalizados</summary>
            <CustomAttributes attributeModel="contact_attribute" attributes={attrs ?? custom} onAttributesChange={setAttrs} />
            <Button size="sm" variant="outline" disabled={!attrs} onClick={() => attrs && void save({ custom_attributes: attrs })}>Salvar atributos</Button>
          </details>
        </>
      ) : (
        <p className="deal-empty-note">Nenhum contato associado a este negócio.</p>
      )}
    </div>
  );
}
