import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  Download,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { Button, Input } from '@evoapi/design-system';
import { toast } from 'sonner';
import { pipelinesService } from '@/services/pipelines';
import { contactsService } from '@/services/contacts';
import { labelsService } from '@/services/contacts/labelsService';
import { useAppDataStore } from '@/store/appDataStore';
import type {
  Deal,
  DealContact,
  DealLabel,
  Pipeline,
  ConversationForModal,
} from '@/types/analytics';
import type { Label } from '@/types/settings';
import CustomAttributes from '@/components/contacts/CustomAttributes';
import {
  getContactAvatarStyle,
  getContactDisplayName,
  getContactInitials,
} from '@/utils/chat/avatarHelpers';

const TABS = [
  { id: 'activities', label: 'Atividades', icon: CalendarCheck },
  { id: 'contacts', label: 'Contatos', icon: Users },
  { id: 'company', label: 'Empresa', icon: Building2 },
  { id: 'deal', label: 'Negócio', icon: BriefcaseBusiness },
  { id: 'conversations', label: 'Conversas', icon: MessageSquare },
  { id: 'files', label: 'Arquivos', icon: Paperclip },
  { id: 'history', label: 'Histórico', icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

const formatMoney = (value = 0, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

const formatDate = (date?: string | number) => {
  if (!date) return '—';
  const parsed = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  return parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const avatarUrl = (contact?: DealContact | null) => contact?.avatar_url || contact?.thumbnail;

function ContactAvatar({
  contact,
  size = 'h-11 w-11',
}: {
  contact?: DealContact | null;
  size?: string;
}) {
  const image = avatarUrl(contact);
  const hueStyle = getContactAvatarStyle(contact?.name);
  if (image)
    return (
      <img
        src={image}
        alt=""
        className={`${size} rounded-full object-cover ring-2 ring-background`}
      />
    );
  return (
    <div
      className={`${size} rounded-full ${hueStyle ? 'av-hue' : 'bg-primary/15 text-primary'} flex items-center justify-center font-bold`}
      style={hueStyle}
    >
      {getContactInitials(contact?.name) || '?'}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function DealDetailPage() {
  const { pipelineId, dealId } = useParams<{ pipelineId: string; dealId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (
    TABS.some(tab => tab.id === searchParams.get('tab')) ? searchParams.get('tab') : 'activities'
  ) as TabId;
  const returnTo = searchParams.get('returnTo');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [availableContacts, setAvailableContacts] = useState<DealContact[]>([]);
  const [availableConversations, setAvailableConversations] = useState<ConversationForModal[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [selectedConversation, setSelectedConversation] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { agents, fetchAgents } = useAppDataStore();

  const load = useCallback(async () => {
    if (!pipelineId || !dealId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [dealData, pipelineData, contactsData, conversationsData, labelsData] =
        await Promise.all([
          pipelinesService.getDeal(dealId),
          pipelinesService.getPipeline(pipelineId),
          pipelinesService.getAvailableContacts(pipelineId),
          pipelinesService.getAvailableConversations(pipelineId),
          labelsService.getLabels({ per_page: 100 }),
        ]);
      setDeal(dealData);
      setPipeline(pipelineData);
      setAvailableContacts(contactsData as DealContact[]);
      setAvailableConversations(conversationsData);
      setAvailableLabels(labelsData.data || []);
    } catch (error) {
      console.error(error);
      setDeal(null);
      setLoadError('O negócio não foi encontrado ou você não tem permissão para acessá-lo.');
      toast.error('Não foi possível carregar o negócio.');
    } finally {
      setLoading(false);
    }
  }, [dealId, pipelineId]);

  useEffect(() => {
    void load();
    void fetchAgents().catch(() => toast.error('Não foi possível carregar os responsáveis.'));
  }, [load, fetchAgents]);

  const dealAttributeKeys = useMemo(() => {
    const custom = pipeline?.custom_fields as { attributes?: string[] } | undefined;
    return custom?.attributes || [];
  }, [pipeline]);

  const updateLocal = (key: keyof Deal, value: unknown) => {
    setDeal(current => (current ? { ...current, [key]: value } : current));
  };

  const toggleDealLabel = (label: Label) => {
    setDeal(current => {
      if (!current) return current;
      const labels = current.labels || [];
      const isSelected = labels.some(
        currentLabel =>
          currentLabel.id === label.id ||
          (currentLabel.title || currentLabel.name).toLocaleLowerCase() ===
            label.title.toLocaleLowerCase(),
      );
      const nextLabel: DealLabel = {
        id: label.id,
        name: label.title,
        title: label.title,
        color: label.color,
      };
      return {
        ...current,
        labels: isSelected
          ? labels.filter(
              currentLabel =>
                currentLabel.id !== label.id &&
                (currentLabel.title || currentLabel.name).toLocaleLowerCase() !==
                  label.title.toLocaleLowerCase(),
            )
          : [...labels, nextLabel],
      };
    });
  };

  const saveDeal = async () => {
    if (!dealId || !deal) return;
    setSaving(true);
    try {
      const updated = await pipelinesService.updateDeal(dealId, {
        title: deal.title,
        value: Number(deal.value || 0),
        currency: deal.currency,
        notes: deal.notes,
        owner_id: deal.owner?.id ?? null,
        company_id: deal.company?.id ?? null,
        labels: (deal.labels || []).map(label => label.id || label.title || label.name),
        pipeline_stage_id: deal.pipeline_stage_id || deal.stage_id,
        custom_fields: deal.custom_fields,
      });
      setDeal(updated);
      toast.success('Negócio salvo.');
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível salvar o negócio.');
    } finally {
      setSaving(false);
    }
  };

  const associateContact = async (primary = false) => {
    if (!dealId || !selectedContact) return;
    try {
      setDeal(await pipelinesService.addDealContact(dealId, selectedContact, primary));
      setSelectedContact('');
      toast.success('Contato associado.');
    } catch {
      toast.error('Não foi possível associar o contato.');
    }
  };

  const associateConversation = async () => {
    if (!dealId || !selectedConversation) return;
    try {
      setDeal(await pipelinesService.addDealConversation(dealId, selectedConversation));
      setSelectedConversation('');
      toast.success('Conversa associada.');
    } catch {
      toast.error('Não foi possível associar a conversa.');
    }
  };

  const updateContact = async (contact: DealContact, changes: Partial<DealContact>) => {
    try {
      await contactsService.updateContact(contact.id, {
        name: changes.name,
        email: changes.email,
        phone_number: changes.phone_number,
        custom_attributes: changes.custom_attributes,
      });
      await load();
      toast.success('Contato atualizado.');
    } catch {
      toast.error('Não foi possível atualizar o contato.');
    }
  };

  const makePrimaryContact = async (contact: DealContact) => {
    if (!dealId) return;
    try {
      setDeal(await pipelinesService.addDealContact(dealId, contact.id, true));
      toast.success('Contato principal atualizado.');
    } catch {
      toast.error('Não foi possível alterar o contato principal.');
    }
  };

  const removeContact = async (contact: DealContact) => {
    if (!dealId) return;
    try {
      setDeal(await pipelinesService.removeDealContact(dealId, contact.id));
      toast.success('Contato removido do negócio.');
    } catch {
      toast.error('Não foi possível remover o contato.');
    }
  };

  const associateCompany = async () => {
    if (!dealId || !selectedCompany) return;
    try {
      const updated = await pipelinesService.updateDeal(dealId, { company_id: selectedCompany });
      setDeal(updated);
      setSelectedCompany('');
      toast.success('Empresa associada.');
    } catch {
      toast.error('Não foi possível associar a empresa.');
    }
  };

  const removeConversation = async (conversationId: string) => {
    if (!dealId) return;
    try {
      setDeal(await pipelinesService.removeDealConversation(dealId, conversationId));
      toast.success('Conversa removida do negócio.');
    } catch {
      toast.error('Não foi possível remover a conversa.');
    }
  };

  const removeFile = async (fileId: string) => {
    if (!dealId) return;
    try {
      await pipelinesService.removeDealFile(dealId, fileId);
      await load();
      toast.success('Arquivo removido.');
    } catch {
      toast.error('Não foi possível remover o arquivo.');
    }
  };

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!dealId || !event.target.files?.length) return;
    const files = Array.from(event.target.files);
    if (files.length > 10 || files.some(file => file.size > 10 * 1024 * 1024)) {
      toast.error('Envie até 10 arquivos, com no máximo 10 MB cada.');
      return;
    }
    try {
      await pipelinesService.uploadDealFiles(dealId, files);
      await load();
      toast.success('Arquivos enviados.');
    } catch {
      toast.error('Não foi possível enviar os arquivos.');
    }
    event.target.value = '';
  };

  const goBack = () =>
    navigate(
      returnTo ||
        (location.state as { returnTo?: string } | null)?.returnTo ||
        `/pipelines/${pipelineId}`,
    );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !deal) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-9 w-9 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Negócio indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loadError || 'Não foi possível carregar este negócio.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={goBack}>
              Voltar ao pipeline
            </Button>
            <Button onClick={() => void load()}>Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  const primary = deal.primary_contact || deal.contacts?.[0];
  const personOptions = availableContacts.filter(
    contact =>
      contact.type !== 'company' && !deal.contacts?.some(linked => linked.id === contact.id),
  );
  const companyOptions = availableContacts.filter(contact => contact.type === 'company');

  return (
    <div className="min-h-full bg-muted/20">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-3 flex items-center gap-3 text-sm text-muted-foreground">
          <button
            onClick={goBack}
            className="hover:text-foreground"
            aria-label="Voltar ao pipeline"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(`/pipelines/${pipelineId}`)}
            className="hover:text-foreground"
          >
            {pipeline?.name || 'Pipeline'}
          </button>
          <span>/</span>
          <span className="font-medium text-foreground truncate">{deal.title}</span>
        </div>
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <ContactAvatar contact={primary} size="h-12 w-12" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{deal.title}</h1>
              <p className="text-sm text-muted-foreground truncate">
                {[deal.company?.name, primary?.name, formatMoney(deal.value, deal.currency)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {(deal.contact_count || 0) > 1 && (
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                +{(deal.contact_count || 1) - 1}
              </span>
            )}
            <div className="flex max-w-xl flex-wrap gap-1.5">
              {(deal.labels || []).map(label => (
                <DealTagPill key={label.id || label.name} label={label} />
              ))}
            </div>
          </div>
          <Button onClick={saveDeal} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{' '}
            Salvar
          </Button>
        </div>
        <nav className="px-6 flex gap-1 overflow-x-auto" aria-label="Seções do negócio">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setSearchParams(current => {
                    const next = new URLSearchParams(current);
                    next.set('tab', tab.id);
                    return next;
                  })
                }
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl p-6 space-y-5">
        {activeTab === 'activities' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Section
              title="Tarefas do pipeline"
              description="Atividades ligadas diretamente a esta oportunidade."
            >
              {deal.tasks?.length ? (
                <div className="space-y-3">
                  {deal.tasks.map((task, index) => (
                    <pre
                      key={String(task.id || index)}
                      className="rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap"
                    >
                      {JSON.stringify(task, null, 2)}
                    </pre>
                  ))}
                </div>
              ) : (
                <Empty text="Nenhuma tarefa cadastrada." />
              )}
            </Section>
            <Section
              title="Ações agendadas"
              description="Mensagens, lembretes e automações futuras."
            >
              {deal.scheduled_actions?.length ? (
                <div className="space-y-3">
                  {deal.scheduled_actions.map((action, index) => (
                    <div key={String(action.id || index)} className="rounded-lg border p-3 text-sm">
                      {String(action.action_type || 'Ação')} ·{' '}
                      {formatDate(action.scheduled_for as string)}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty text="Nenhuma ação agendada." />
              )}
            </Section>
          </div>
        )}

        {activeTab === 'contacts' && (
          <Section
            title="Contatos associados"
            description="O contato principal aparece no card; os demais são indicados pelo contador."
          >
            <div className="mb-5 flex gap-2">
              <select
                aria-label="Selecionar contato"
                value={selectedContact}
                onChange={event => setSelectedContact(event.target.value)}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione um contato</option>
                {personOptions.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => associateContact(false)}
                disabled={!selectedContact}
              >
                <Plus className="mr-2 h-4 w-4" />
                Associar
              </Button>
              <Button onClick={() => associateContact(true)} disabled={!selectedContact}>
                Associar como principal
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {deal.contacts?.map(contact => (
                <ContactEditor
                  key={contact.id}
                  contact={contact}
                  primary={deal.primary_contact?.id === contact.id}
                  onSave={updateContact}
                  onMakePrimary={() => makePrimaryContact(contact)}
                  onRemove={() => removeContact(contact)}
                />
              ))}
            </div>
          </Section>
        )}

        {activeTab === 'company' && (
          <Section
            title="Empresa"
            description="O nome é predefinido; os demais campos e atributos globais são opcionais."
          >
            <div className="mb-5 flex gap-2">
              <select
                aria-label="Selecionar empresa"
                value={selectedCompany}
                onChange={event => setSelectedCompany(event.target.value)}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione uma empresa</option>
                {companyOptions.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <Button onClick={associateCompany} disabled={!selectedCompany}>
                Associar empresa
              </Button>
            </div>
            <div className="mb-5 flex gap-2 rounded-xl border border-dashed border-border p-3">
              <Input
                value={newCompanyName}
                onChange={event => setNewCompanyName(event.target.value)}
                placeholder="Nome da nova empresa"
              />
              <Button
                variant="outline"
                disabled={!newCompanyName.trim()}
                onClick={async () => {
                  try {
                    const company = await contactsService.createContact({
                      name: newCompanyName.trim(),
                      type: 'company',
                    });
                    setDeal(await pipelinesService.updateDeal(deal.id, { company_id: company.id }));
                    setNewCompanyName('');
                    toast.success('Empresa criada e associada.');
                  } catch {
                    toast.error('Não foi possível criar a empresa.');
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar empresa
              </Button>
            </div>
            {deal.company ? (
              <ContactEditor contact={deal.company as DealContact} onSave={updateContact} />
            ) : (
              <Empty text="Nenhuma empresa associada." />
            )}
          </Section>
        )}

        {activeTab === 'deal' && (
          <Section
            title="Campos de negócio"
            description="Dados comerciais e campos personalizados deste pipeline."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Título">
                <Input
                  value={deal.title}
                  onChange={event => updateLocal('title', event.target.value)}
                />
              </Field>
              <Field label="Etapa">
                <select
                  aria-label="Etapa"
                  value={deal.pipeline_stage_id || deal.stage_id}
                  onChange={event => updateLocal('pipeline_stage_id', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {pipeline?.stages?.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Valor">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deal.value || 0}
                  onChange={event => updateLocal('value', Number(event.target.value))}
                />
              </Field>
              <Field label="Moeda">
                <select
                  aria-label="Moeda"
                  value={deal.currency}
                  onChange={event => updateLocal('currency', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>BRL</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </Field>
              <Field label="Responsável">
                <select
                  aria-label="Responsável"
                  value={deal.owner?.id || ''}
                  onChange={event =>
                    updateLocal(
                      'owner',
                      event.target.value
                        ? (agents.find(
                            agent => String(agent.id) === event.target.value,
                          ) as Deal['owner'])
                        : null,
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sem responsável</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="space-y-3 md:col-span-2">
                <div>
                  <span className="text-sm font-medium text-foreground">Tags do negócio</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estas tags pertencem à oportunidade e são as exibidas no card do pipeline.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-3">
                  {availableLabels.length ? (
                    availableLabels.map(label => {
                      const selected = (deal.labels || []).some(
                        currentLabel =>
                          currentLabel.id === label.id ||
                          (currentLabel.title || currentLabel.name).toLocaleLowerCase() ===
                            label.title.toLocaleLowerCase(),
                      );
                      return (
                        <button
                          key={label.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleDealLabel(label)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity ${selected ? 'opacity-100 ring-2 ring-primary/30' : 'opacity-55 hover:opacity-90'}`}
                          style={{
                            borderColor: label.color,
                            backgroundColor: `${label.color}18`,
                            color: label.color,
                          }}
                        >
                          <Tag className="h-3 w-3" />
                          {label.title}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
                  )}
                </div>
              </div>
              {dealAttributeKeys.map(key => (
                <Field key={key} label={key}>
                  <Input
                    value={String(deal.custom_fields?.[key] || '')}
                    onChange={event =>
                      updateLocal('custom_fields', {
                        ...(deal.custom_fields || {}),
                        [key]: event.target.value,
                      })
                    }
                  />
                </Field>
              ))}
              <Field label="Anotações" wide>
                <textarea
                  value={deal.notes || ''}
                  onChange={event => updateLocal('notes', event.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Contexto, próximos passos e observações do vendedor"
                />
              </Field>
            </div>
          </Section>
        )}

        {activeTab === 'conversations' && (
          <Section
            title="Conversas associadas"
            description="Associar uma conversa também vincula automaticamente seu contato."
          >
            <div className="mb-5 flex gap-2">
              <select
                aria-label="Selecionar conversa"
                value={selectedConversation}
                onChange={event => setSelectedConversation(event.target.value)}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione uma conversa</option>
                {availableConversations.map(conversation => (
                  <option key={conversation.id} value={conversation.id}>
                    #{conversation.display_id} · {conversation.contact?.name || 'Sem contato'}
                  </option>
                ))}
              </select>
              <Button onClick={associateConversation} disabled={!selectedConversation}>
                <Plus className="mr-2 h-4 w-4" />
                Associar
              </Button>
            </div>
            <div className="space-y-3">
              {deal.conversations?.map(conversation => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-4 rounded-xl border border-border p-4"
                >
                  <ContactAvatar contact={conversation.contact} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      #{conversation.display_id} · {conversation.contact?.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {conversation.latest_message?.content || 'Sem mensagens'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/conversations/${conversation.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeConversation(conversation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {activeTab === 'files' && (
          <Section
            title="Arquivos do negócio"
            description="Até 10 arquivos por envio e 10 MB por arquivo."
          >
            <label className="mb-5 inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Enviar arquivos
              <input type="file" multiple className="sr-only" onChange={uploadFiles} />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {deal.files?.map(file => (
                <div key={file.id} className="flex items-center gap-3 rounded-xl border p-4">
                  {file.thumbnail_url ? (
                    <img
                      src={file.thumbnail_url}
                      alt=""
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.byte_size ? `${(file.byte_size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button onClick={() => removeFile(file.id)} className="p-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {activeTab === 'history' && (
          <Section
            title="Histórico auditável"
            description="Registro cronológico de alterações, associações, arquivos e movimentações."
          >
            <ol className="relative ml-3 border-l border-border space-y-6">
              {deal.history?.map(event => (
                <li key={`${event.action}-${event.id}`} className="ml-6">
                  <span className="absolute -left-2 mt-1.5 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{event.action.replace(/_/g, ' ')}</strong>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {event.source}
                    </span>
                    <time className="text-xs text-muted-foreground">
                      {formatDate(event.created_at)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.actor?.name || 'Sistema'}
                  </p>
                  {Object.keys(event.changes || {}).length > 0 && (
                    <pre className="mt-2 overflow-auto rounded-lg bg-muted/60 p-3 text-xs">
                      {JSON.stringify(event.changes, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-2 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function DealTagPill({ label }: { label: DealLabel }) {
  const color = label.color || '#1f93ff';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{ borderColor: color, backgroundColor: `${color}18`, color }}
    >
      <Tag className="h-3 w-3" />
      {label.title || label.name}
    </span>
  );
}

function ContactEditor({
  contact,
  primary,
  onSave,
  onMakePrimary,
  onRemove,
}: {
  contact: DealContact;
  primary?: boolean;
  onSave: (contact: DealContact, changes: Partial<DealContact>) => Promise<void>;
  onMakePrimary?: () => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(contact);
  useEffect(() => setDraft(contact), [contact]);
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-4 flex items-center gap-3">
        <ContactAvatar contact={contact} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{getContactDisplayName(contact.name)}</p>
          <p className="text-xs text-muted-foreground">
            {primary
              ? 'Contato principal'
              : contact.type === 'company'
                ? 'Empresa'
                : 'Contato associado'}
          </p>
        </div>
        {onMakePrimary && !primary && contact.type !== 'company' && (
          <Button variant="ghost" size="sm" onClick={onMakePrimary}>
            Tornar principal
          </Button>
        )}
        {onRemove && (
          <button onClick={onRemove} className="p-2 text-destructive" aria-label="Remover contato">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <Input
          value={draft.name || ''}
          onChange={event => setDraft({ ...draft, name: event.target.value })}
          placeholder="Nome"
        />
        <Input
          value={draft.email || ''}
          onChange={event => setDraft({ ...draft, email: event.target.value })}
          placeholder="E-mail"
        />
        <Input
          value={draft.phone_number || ''}
          onChange={event => setDraft({ ...draft, phone_number: event.target.value })}
          placeholder="Telefone"
        />
        <CustomAttributes
          attributeModel={contact.type === 'company' ? 'company_attribute' : 'contact_attribute'}
          attributes={draft.custom_attributes || {}}
          onAttributesChange={customAttributes =>
            setDraft({ ...draft, custom_attributes: customAttributes })
          }
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onSave(contact, {
              name: draft.name,
              email: draft.email,
              phone_number: draft.phone_number,
              custom_attributes: draft.custom_attributes,
            })
          }
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar dados
        </Button>
      </div>
    </div>
  );
}
