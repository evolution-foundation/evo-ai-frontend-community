import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Plus, Star } from 'lucide-react';
import { Button, Input } from '@evoapi/design-system';
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

export default function CompanyTab({ deal, pipelineId, replaceDeal, reload, primary }: DealTabProps) {
  const company = deal.company as DealContact | null | undefined;
  const [available, setAvailable] = useState<DealContact[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [attrs, setAttrs] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    void pipelinesService.getAvailableContacts(pipelineId).then(list => setAvailable(list as DealContact[])).catch(() => undefined);
  }, [pipelineId]);

  const save = async (changes: Partial<DealContact>) => {
    if (!company) return;
    try {
      await contactsService.updateContact(company.id, {
        name: changes.name ?? company.name,
        email: changes.email ?? company.email,
        phone_number: changes.phone_number ?? company.phone_number,
        custom_attributes: changes.custom_attributes ?? company.custom_attributes,
      });
      await reload();
      toast.success('Empresa atualizada.');
    } catch {
      toast.error('Não foi possível atualizar a empresa.');
    }
  };
  const associate = async () => {
    if (!selected) return;
    try {
      replaceDeal(await pipelinesService.updateDeal(deal.id, { company_id: selected }));
      setSelected('');
      toast.success('Empresa associada.');
    } catch {
      toast.error('Não foi possível associar a empresa.');
    }
  };
  const create = async () => {
    try {
      const created = await contactsService.createContact({ name: name.trim(), type: 'company' });
      replaceDeal(await pipelinesService.updateDeal(deal.id, { company_id: created.id }));
      setName('');
      toast.success('Empresa criada e associada.');
    } catch {
      toast.error('Não foi possível criar a empresa.');
    }
  };
  const makePrimary = async (target: DealContact) => {
    try {
      replaceDeal(await pipelinesService.addDealContact(deal.id, target.id, true));
    } catch {
      toast.error('Não foi possível alterar o contato principal.');
    }
  };

  const companies = available.filter(item => item.type === 'company');
  const others = (deal.contacts || []).filter(item => item.type !== 'company' && item.id !== primary?.id);
  const custom = company?.custom_attributes || {};
  const groups: FieldGroup[] = company
    ? [
        {
          id: 'general',
          label: 'Informações gerais',
          fields: [
            { key: 'company-name', label: 'Nome da empresa', value: company.name || '', onCommit: value => save({ name: value }) },
            { key: 'company-email', label: 'E-mail', type: 'email', value: company.email || '', onCommit: value => save({ email: value }) },
            { key: 'company-phone', label: 'Telefone', type: 'phone', value: company.phone_number || '', display: phoneDisplay(company.phone_number), prefix: phoneFlag(company.phone_number), onCommit: value => save({ phone_number: value }) },
          ],
        },
        ...(Object.keys(custom).length
          ? [{ id: 'custom', label: 'Atributos personalizados', fields: Object.keys(custom).map(key => ({ key: `cattr-${key}`, label: key, value: text(custom[key]), onCommit: (value: string) => save({ custom_attributes: { ...custom, [key]: value } }) })) }]
          : []),
      ]
    : [];

  return (
    <div className="deal-company-tab">
      <aside className="deal-company-side">
        <div className="deal-company-name">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <strong>{company?.name || 'Sem empresa'}</strong>
        </div>
        <div className="deal-company-primary">
          <HeaderAvatar contact={primary} name={primary?.name} />
          <div>
            <small>Contato deste negócio</small>
            <p>{primary ? getContactDisplayName(primary.name) : 'Sem contato'}{primary && <><Star className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">Contato principal</span></>}</p>
          </div>
        </div>
        <section className="deal-collapse">
          <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}><ChevronDown className={`h-4 w-4 ${open ? '' : '-rotate-90'}`} />Contatos<span>{others.length}</span></button>
          {open && (others.length ? (
            <ul>{others.map(item => <li key={item.id}><HeaderAvatar contact={item} /><span>{getContactDisplayName(item.name)}</span><button type="button" className="deal-link-button" onClick={() => void makePrimary(item)}>Tornar principal</button></li>)}</ul>
          ) : <p>Nenhum outro contato neste negócio.</p>)}
        </section>
        <div className="deal-associate is-stacked">
          <select aria-label="Selecionar empresa" value={selected} onChange={event => setSelected(event.target.value)}>
            <option value="">{company ? 'Trocar de empresa…' : 'Associar uma empresa…'}</option>
            {companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Button size="sm" onClick={() => void associate()} disabled={!selected}>Associar empresa</Button>
          <div className="deal-associate-new">
            <Input value={name} onChange={event => setName(event.target.value)} placeholder="Nome da nova empresa" aria-label="Nome da nova empresa" />
            <Button size="sm" variant="outline" disabled={!name.trim()} onClick={() => void create()}><Plus className="mr-1 h-4 w-4" />Criar empresa</Button>
          </div>
        </div>
      </aside>
      <div className="deal-company-main">
        {company ? (
          <>
            <FieldList key={company.id} title="Campos de empresa" groups={groups} icon={<Building2 className="h-4 w-4" aria-hidden="true" />} />
            <details className="deal-attrs">
              <summary>Adicionar ou editar atributos personalizados</summary>
              <CustomAttributes attributeModel="company_attribute" attributes={attrs ?? custom} onAttributesChange={setAttrs} />
              <Button size="sm" variant="outline" disabled={!attrs} onClick={() => attrs && void save({ custom_attributes: attrs })}>Salvar atributos</Button>
            </details>
          </>
        ) : (
          <p className="deal-empty-note">Nenhuma empresa associada. Selecione ou crie uma ao lado.</p>
        )}
      </div>
    </div>
  );
}
