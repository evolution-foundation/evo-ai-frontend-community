import { useCallback, useMemo, useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  User,
  UserPlus,
  Phone,
  Package,
  CreditCard,
  Eye,
  MessageCircle,
  Download,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { contactsService } from '@/services/contacts/contactsService';
import { productsService } from '@/services/products/productsService';
import { workOrdersService } from '@/services/orders/workOrdersService';
import type { Product } from '@/types/products';
import {
  WorkOrder,
  WorkOrderItem,
  WorkOrderStatus,
  PAYMENT_METHODS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  PaymentMethod,
} from '@/types/orders/workOrder';

type View = 'registrar' | 'consultar';

const STATUS_VARIANT: Record<WorkOrderStatus, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  in_progress: 'secondary',
  waiting_parts: 'outline',
  done: 'default',
  delivered: 'secondary',
  cancelled: 'outline',
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function parseAmount(value: string): number {
  const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toLocalInputDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm() {
  return {
    os_number: '',
    client_name: '',
    client_cpf: '',
    client_phone: '',
    client_email: '',
    client_instagram: '',
    client_cep: '',
    client_address: '',
    client_number: '',
    client_neighborhood: '',
    client_city: '',
    client_state: 'SP',
    client_gender: '',
    client_birthdate: '',
    entry_date: new Date().toISOString().slice(0, 16),
    pickup_date: '',
    discount: '',
    payment_method: 'Não Definido' as PaymentMethod,
    installments: '',
  };
}

type FormState = ReturnType<typeof emptyForm>;

interface ClientContact {
  id: string;
  name?: string | null;
  cpf?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

// Campos do formulário que pertencem ao cadastro do cliente (contato)
const CLIENT_FIELDS = [
  'client_name',
  'client_cpf',
  'client_phone',
  'client_email',
  'client_instagram',
  'client_cep',
  'client_address',
  'client_number',
  'client_neighborhood',
  'client_city',
  'client_state',
] as const;

type ContactLike = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  tax_id?: string | null;
  custom_attributes?: Record<string, unknown> | null;
  additional_attributes?: {
    location?: { city?: string; state?: string } | null;
    social_profiles?: { instagram?: string } | null;
  } | null;
};

function contactFromApi(c: ContactLike): ClientContact {
  const ca = (c.custom_attributes ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    id: c.id,
    name: c.name ?? '',
    cpf: c.tax_id || str(ca.cpf),
    phone: c.phone_number || '',
    email: c.email || '',
    instagram: str(c.additional_attributes?.social_profiles?.instagram) || str(ca.instagram),
    cep: str(ca.cep),
    address: str(ca.endereco),
    number: str(ca.numero),
    neighborhood: str(ca.bairro),
    city: str(ca.cidade) || str(c.additional_attributes?.location?.city),
    state: str(ca.estado) || str(c.additional_attributes?.location?.state),
  };
}

interface CompanyProfile {
  nome: string;
  cnpj: string;
  whatsapp: string;
  endereco: string;
  responsavel: string;
  termos: string;
}

const COMPANY_PROFILE_KEY = 'os-company-profile';

function emptyCompanyProfile(): CompanyProfile {
  return { nome: '', cnpj: '', whatsapp: '', endereco: '', responsavel: '', termos: '' };
}

function loadCompanyProfile(): CompanyProfile {
  try {
    const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (raw) return { ...emptyCompanyProfile(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return emptyCompanyProfile();
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Documento da OS com estilos inline (cores hex) — compatível com html2canvas,
// que não interpreta funções de cor modernas do Tailwind v4 (oklch).
function buildOsDocument(order: WorkOrder, company: CompanyProfile): string {
  const items = order.items ?? [];
  const itemsRows = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 5px; border: 1px solid #ddd;">${escapeHtml(i.sku || i.product_id || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd;">${escapeHtml(i.tipo || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd;">${escapeHtml(i.name)}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${i.quantity}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${formatCurrency(Number(i.valor))}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${formatCurrency(0)}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: right;">${formatCurrency(Number(i.valor) * Number(i.quantity || 1))}</td>
        </tr>`,
    )
    .join('');

  const entryDate = order.entry_date ? new Date(order.entry_date).toLocaleString('pt-BR') : '';
  const pickupDate = order.pickup_date
    ? new Date(order.pickup_date).toLocaleDateString('pt-BR')
    : '____/____/______';

  const addressLine = [
    order.client_address,
    order.client_number,
    order.client_neighborhood,
    [order.client_city, order.client_state].filter(Boolean).join(' - '),
    order.client_cep ? `CEP ${order.client_cep}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return `
    <header style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #333; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
      <div style="width: 20%;"></div>
      <div style="text-align: center; flex-grow: 1;">
        <p style="font-size: 0.9rem; margin: 0; color: #333;"><strong>${escapeHtml(company.nome) || 'Sua Empresa'}</strong>${company.cnpj ? ` | CNPJ: ${escapeHtml(company.cnpj)}` : ''}${company.whatsapp ? ` | WhatsApp: ${escapeHtml(company.whatsapp)}` : ''}</p>
        ${company.endereco ? `<p style="font-size: 0.8rem; margin: 2px 0 0 0; color: #333;">${escapeHtml(company.endereco)}</p>` : ''}
        ${company.responsavel ? `<p style="font-size: 0.8rem; margin: 2px 0 0 0; color: #333;">Responsável: ${escapeHtml(company.responsavel)}</p>` : ''}
      </div>
      <div style="text-align: right; width: 20%;">
        <h5 style="font-weight: bold; font-size: 1rem; margin: 0;">Ordem de Serviço</h5>
        <p style="font-size: 1.1rem; margin: 4px 0 0 0; font-family: monospace; background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px;">#${escapeHtml(order.os_number)}</p>
      </div>
    </header>
    <section style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #ccc;">
      <div><strong>Data de Entrada:</strong> ${entryDate}</div>
      <div><strong>Data de Saída:</strong> ${pickupDate}</div>
    </section>
    <section style="border: 1px solid #ccc; padding: 2px 8px 8px; border-radius: 4px; margin-bottom: 0.5rem;">
      <h6 style="font-size: 0.9rem; font-weight: 600; margin: 0 0 0.25rem 0; padding-bottom: 0.25rem; border-bottom: 1px solid #eee;">Dados do Cliente</h6>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.1rem 1rem; font-size: 0.875rem;">
        <p style="margin: 2px 0;"><strong>Nome:</strong> ${escapeHtml(order.client_name)}</p>
        <p style="margin: 2px 0;"><strong>CPF:</strong> ${escapeHtml(order.client_cpf) || 'N/A'}</p>
        <p style="margin: 2px 0;"><strong>Telefone:</strong> ${escapeHtml(order.client_phone)}</p>
        <p style="margin: 2px 0;"><strong>Email:</strong> ${escapeHtml(order.client_email) || 'N/A'}</p>
      </div>
      ${addressLine ? `<div style="font-size: 0.875rem; margin-top: 0.25rem; border-top: 1px solid #eee; padding-top: 0.25rem;"><p style="margin: 2px 0;"><strong>Endereço:</strong> ${escapeHtml(addressLine)}</p></div>` : ''}
    </section>
    <section style="font-size: 0.875rem; margin-bottom: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <p style="margin: 0;"><strong>Aparelho Liga:</strong> ${order.device_turns_on ? 'Sim' : 'Não'} &nbsp;|&nbsp; <strong>Retirou:</strong> ${order.picked_up ? 'Sim' : 'Não'}</p>
      </div>
    </section>
    <section style="margin-bottom: 1rem;">
      <h6 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #eee;">Produtos e Serviços</h6>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
        <thead style="background-color: #f3f4f6;">
          <tr>
            <th style="padding: 5px; border: 1px solid #ddd; text-align: left;">ID</th>
            <th style="padding: 5px; border: 1px solid #ddd; text-align: left;">Tipo</th>
            <th style="padding: 5px; border: 1px solid #ddd; text-align: left;">Nome</th>
            <th style="padding: 5px; border: 1px solid #ddd;">Qtd</th>
            <th style="padding: 5px; border: 1px solid #ddd;">V. Venda</th>
            <th style="padding: 5px; border: 1px solid #ddd;">Desconto</th>
            <th style="padding: 5px; border: 1px solid #ddd;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
    </section>
    <section style="text-align: right; margin-bottom: 1rem; padding-top: 0.5rem; border-top: 1px solid #ccc; font-size: 0.9rem;">
      <p style="margin: 2px 0;"><strong>Subtotal:</strong> ${formatCurrency(Number(order.base_value))}</p>
      <p style="margin: 2px 0;"><strong>Desconto:</strong> ${formatCurrency(Number(order.discount))}</p>
      <p style="font-size: 1.25rem; font-weight: bold; margin: 2px 0;">Total: ${formatCurrency(Number(order.total))}</p>
      <p style="margin: 2px 0;"><strong>Forma de Pagamento:</strong> ${escapeHtml(order.payment_method)}${order.installments ? ` (${order.installments}x)` : ''}</p>
    </section>
    <footer style="padding-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; text-align: center; font-size: 0.875rem;">
      <div>
        <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto; padding-top: 0.5rem;">
          <p style="margin: 0;">Assinatura do Cliente</p>
        </div>
      </div>
      <div>
        <div style="border-top: 1px solid #333; width: 80%; margin: 0 auto; padding-top: 0.5rem;">
          <p style="margin: 0;">Assinatura Responsável</p>
        </div>
      </div>
    </footer>
    ${company.termos ? `<div style="font-size: 0.65rem; color: #555; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #ccc;">${escapeHtml(company.termos)}</div>` : ''}
  `;
}

export default function OrdersPage() {
  const [view, setView] = useState<View>('registrar');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [orderItems, setOrderItems] = useState<WorkOrderItem[]>([]);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientContact[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [savedClientSnapshot, setSavedClientSnapshot] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [saveClientDialogOpen, setSaveClientDialogOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [productCodeQuery, setProductCodeQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => loadCompanyProfile());
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [companyDraft, setCompanyDraft] = useState<CompanyProfile>(emptyCompanyProfile());
  const clientSearchTimer = useRef<number | null>(null);

  const addProductByCode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await productsService.getProducts({ q: code.trim(), per_page: 1 });
      const found = res.data?.[0];
      if (found) {
        addProductItem(found);
        setProductCodeQuery('');
        toast.success(`Produto "${found.name}" adicionado`);
      } else {
        toast.error('Produto não encontrado por ID/SKU');
      }
    } catch {
      toast.error('Erro ao buscar produto por código');
    }
  };

  const searchClients = async (term: string) => {
    setClientQuery(term);
    if (!term.trim()) {
      setClientResults([]);
      return;
    }
    try {
      setSearchingClients(true);
      const res = await contactsService.searchContacts({ q: term.trim() });
      setClientResults((res.data ?? []).map((c) => contactFromApi(c as unknown as ContactLike)));
    } catch {
      setClientResults([]);
    } finally {
      setSearchingClients(false);
    }
  };

  const selectClient = (contact: ClientContact) => {
    setForm({
      ...form,
      client_name: contact.name ?? '',
      client_cpf: contact.cpf ?? '',
      client_phone: contact.phone ?? '',
      client_email: contact.email ?? '',
      client_instagram: contact.instagram ?? '',
      client_cep: contact.cep ?? '',
      client_address: contact.address ?? '',
      client_number: contact.number ?? '',
      client_neighborhood: contact.neighborhood ?? '',
      client_city: contact.city ?? '',
      client_state: contact.state ?? 'SP',
    });
    setSelectedClientId(contact.id);
    setSavedClientSnapshot(
      JSON.stringify({
        client_name: contact.name ?? '',
        client_cpf: contact.cpf ?? '',
        client_phone: contact.phone ?? '',
        client_email: contact.email ?? '',
        client_instagram: contact.instagram ?? '',
        client_cep: contact.cep ?? '',
        client_address: contact.address ?? '',
        client_number: contact.number ?? '',
        client_neighborhood: contact.neighborhood ?? '',
        client_city: contact.city ?? '',
        client_state: contact.state ?? 'SP',
      }),
    );
    setClientQuery('');
    setClientResults([]);
    toast.success(`Cliente ${contact.name} selecionado`);
  };

  const clientFieldsFromForm = () =>
    Object.fromEntries(
      CLIENT_FIELDS.map((f) => [f, (form as unknown as Record<string, string>)[f] ?? '']),
    );

  // Dados do cliente alterados e ainda não salvos no cadastro (contato)?
  const clientDirty = useMemo(() => {
    if (!form.client_name.trim()) return false;
    return JSON.stringify(clientFieldsFromForm()) !== savedClientSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, savedClientSnapshot]);

  const saveClient = async (): Promise<boolean> => {
    if (!form.client_name.trim()) {
      toast.error('Informe o nome do cliente');
      return false;
    }
    try {
      setSavingClient(true);
      const payload = {
        name: form.client_name.trim(),
        type: 'person' as const,
        email: form.client_email.trim(),
        phone_number: form.client_phone.trim(),
        tax_id: form.client_cpf.trim(),
        custom_attributes: {
          cpf: form.client_cpf.trim(),
          instagram: form.client_instagram.trim(),
          cep: form.client_cep.trim(),
          endereco: form.client_address.trim(),
          numero: form.client_number.trim(),
          bairro: form.client_neighborhood.trim(),
          cidade: form.client_city.trim(),
          estado: form.client_state.trim(),
        },
      };
      const saved = selectedClientId
        ? await contactsService.updateContact(selectedClientId, payload)
        : await contactsService.createContact(payload);
      setSelectedClientId(saved.id);
      setSavedClientSnapshot(JSON.stringify(clientFieldsFromForm()));
      toast.success(selectedClientId ? 'Dados do cliente atualizados!' : 'Cliente cadastrado!');
      return true;
    } catch {
      toast.error('Erro ao salvar dados do cliente');
      return false;
    } finally {
      setSavingClient(false);
    }
  };
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [preview, setPreview] = useState<WorkOrder | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (search.trim()) params.q = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await workOrdersService.getOrders(params);
      setOrders(data);
    } catch {
      toast.error('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const filteredOrders = useMemo(() => {
    if (!onlyOpen) return orders;
    return orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  }, [orders, onlyOpen]);

  const totalValue = useMemo(() => filteredOrders.reduce((acc, o) => acc + Number(o.total) || 0, 0), [filteredOrders]);

  const resetForm = () => {
    setForm(emptyForm());
    setOrderItems([]);
    setEditing(null);
    setProductQuery('');
    setProductResults([]);
    setSelectedClientId(null);
    setSavedClientSnapshot('');
  };

  const openEdit = (order: WorkOrder) => {
    setEditing(order);
    setView('registrar');
    setForm({
      os_number: order.os_number,
      client_name: order.client_name ?? '',
      client_cpf: order.client_cpf ?? '',
      client_phone: order.client_phone ?? '',
      client_email: order.client_email ?? '',
      client_instagram: order.client_instagram ?? '',
      client_cep: order.client_cep ?? '',
      client_address: order.client_address ?? '',
      client_number: order.client_number ?? '',
      client_neighborhood: order.client_neighborhood ?? '',
      client_city: order.client_city ?? '',
      client_state: order.client_state ?? 'SP',
      client_gender: '',
      client_birthdate: '',
       entry_date: order.entry_date ? new Date(order.entry_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
       pickup_date: toLocalInputDate(order.pickup_date),
       discount: String(order.discount || ''),
       payment_method: order.payment_method,
       installments: String(order.installments ?? ''),
     });
    setOrderItems(order.items ?? []);
    setSelectedClientId(null);
    setSavedClientSnapshot('');
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!confirm(`Excluir a OS ${order.os_number}?`)) return;
    try {
      await workOrdersService.deleteOrder(order.id);
      toast.success('Ordem excluída');
      loadOrders();
    } catch {
      toast.error('Erro ao excluir ordem');
    }
  };

  const baseValue = useMemo(() => orderItems.reduce((acc, i) => acc + Number(i.valor) * Number(i.quantity || 1), 0), [orderItems]);
  const discount = useMemo(() => parseAmount(form.discount), [form.discount]);
  const total = Math.max(baseValue - discount, 0);

  const searchProducts = async (term: string) => {
    setProductQuery(term);
    if (!term.trim()) {
      setProductResults([]);
      return;
    }
    try {
      setSearchingProducts(true);
      const res = await productsService.getProducts({ q: term.trim(), per_page: 12 });
      setProductResults(res.data ?? []);
    } catch {
      setProductResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const addProductItem = (product: Product) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku ?? '',
          tipo: product.item_type === 'produto_ml' ? 'Produto (ML)' : product.item_type === 'servico' ? 'Serviço' : 'Produto',
          valor: Number(product.default_price) || 0,
          quantity: 1,
        },
      ];
    });
    setProductQuery('');
    setProductResults([]);
  };

  const removeItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<WorkOrderItem>) => {
    setOrderItems((prev) => prev.map((i, idx) => (idx === index ? { ...i, ...patch } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    // Dados do cliente alterados/criados mas não salvos no cadastro?
    if (clientDirty) {
      setSaveClientDialogOpen(true);
      return;
    }
    await doSubmit();
  };

  const confirmSaveClientAndSubmit = async () => {
    setSaveClientDialogOpen(false);
    const ok = await saveClient();
    if (!ok) return;
    await doSubmit();
  };

  const doSubmit = async () => {
    const payload = {
      os_number: editing?.os_number,
      status: editing?.status ?? ('open' as WorkOrderStatus),
      client_name: form.client_name.trim(),
      client_cpf: form.client_cpf.trim(),
      client_phone: form.client_phone.trim(),
      client_email: form.client_email.trim(),
      client_instagram: form.client_instagram.trim(),
      client_cep: form.client_cep.trim(),
      client_address: form.client_address.trim(),
      client_number: form.client_number.trim(),
      client_neighborhood: form.client_neighborhood.trim(),
      client_city: form.client_city.trim(),
      client_state: form.client_state.trim(),
      entry_date: form.entry_date ? new Date(form.entry_date).toISOString() : new Date().toISOString(),
      pickup_date: form.pickup_date ? new Date(`${form.pickup_date}T12:00:00`).toISOString() : null,
      items: orderItems,
      base_value: Number(baseValue.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      total: Number(total.toFixed(2)),
      payment_method: form.payment_method,
      installments: form.payment_method === 'Cartão de Crédito' && form.installments ? Number(form.installments) : null,
    };
    try {
      setSubmittingOrder(true);
      let created: WorkOrder;
      if (editing) {
        await workOrdersService.updateOrder(editing.id, payload);
        toast.success('Ordem de Serviço atualizada!');
        created = { ...editing, ...payload } as WorkOrder;
      } else {
        created = await workOrdersService.createOrder(payload);
        toast.success('Ordem de Serviço cadastrada!');
        setPreview(created);
      }
      resetForm();
      setView('consultar');
      loadOrders();
    } catch (err) {
      console.error(err);
      toast.error(editing ? 'Erro ao atualizar ordem' : 'Erro ao cadastrar ordem');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const whatsappOrder = (order: WorkOrder) => {
    const phone = (order.client_phone ?? '').replace(/\D/g, '');
    if (!phone) {
      toast.error('Telefone do cliente não informado');
      return;
    }
    const text = encodeURIComponent(
      `Olá, ${order.client_name ?? 'cliente'}! Segue os dados da sua Ordem de Serviço:\n\n` +
        `OS: #${order.os_number}\n` +
        `Total: ${formatCurrency(order.total)} (${order.payment_method})\nStatus: ${WORK_ORDER_STATUS_LABELS[order.status]}`,
    );
    window.open(`https://wa.me/55${phone}?text=${text}`, '_blank');
  };

  const downloadOrderPdf = async (order: WorkOrder) => {
    const element = document.getElementById('printable-os-preview');
    if (!element) return;
    try {
      toast.info('Gerando PDF...');
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth - 40, pdfHeight - 40);
      const fileName = `os-${(order.client_name ?? order.os_number).replace(/\s/g, '_')}.pdf`;
      pdf.save(fileName);
      toast.success('PDF baixado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    }
  };

  const printOrder = (order: WorkOrder) => {
    const docHtml = buildOsDocument(order, companyProfile);
    const frame = document.createElement('iframe');
    frame.style.position = 'absolute';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Ordem de Serviço #${order.os_number}</title><style>
      @media print {
        body { margin: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; }
        #print-dual-view { width: 100%; display: flex; justify-content: space-around; align-items: flex-start; }
        .print-copy { width: 48%; box-sizing: border-box; page-break-inside: avoid; }
        .print-copy, .print-copy p, .print-copy div, .print-copy footer { font-size: 8pt; }
        .print-copy table, .print-copy table th, .print-copy table td { font-size: 7pt; }
        .print-copy h4 { font-size: 11pt; }
        .print-copy h5 { font-size: 10pt; }
        .print-copy h6 { font-size: 9pt; }
        .print-copy section { margin-bottom: 0.5rem; }
        .print-copy footer { padding-top: 1rem; }
        .print-copy table td, .print-copy table th { padding: 2px 4px; }
      }
      body { margin: 0; padding: 12px; font-family: sans-serif; }
    </style></head><body>
      <div id="print-dual-view">
        <div class="print-copy">${docHtml}</div>
        <div class="print-copy">${docHtml}</div>
      </div>
    </body></html>`);
    doc.close();
    frame.contentWindow?.focus();
    setTimeout(() => {
      frame.contentWindow?.print();
      document.body.removeChild(frame);
    }, 250);
  };

  const renderRegistrar = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm text-muted-foreground">Nova Ordem de Serviço</p>
          <p className="text-xs text-muted-foreground">{editing ? 'Editando ordem' : 'O número será gerado automaticamente'}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setCompanyDraft(companyProfile);
              setCompanyDialogOpen(true);
            }}
          >
            <Building2 className="w-4 h-4 mr-2" /> Dados da Empresa
          </Button>
          <div className="text-right flex-shrink-0">
            <Label className="block text-xs text-muted-foreground">ID da OS</Label>
            <p className="font-mono text-lg font-semibold text-foreground">{editing ? editing.os_number : 'Auto'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Dados do Cliente
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {clientDirty && (
                <span className="text-xs text-amber-600 dark:text-amber-400">Alterações não salvas</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={savingClient || !form.client_name.trim()}
                onClick={saveClient}
              >
                <UserPlus className="w-3.5 h-3.5 mr-2" />
                {savingClient ? 'Salvando...' : selectedClientId ? 'Salvar Alterações do Cliente' : 'Salvar Cliente'}
              </Button>
            </div>
            <div className="relative w-72">
              <div className="relative">
                <Input
                  value={clientQuery}
                  onChange={(e) => {
                    setClientQuery(e.target.value);
                    const term = e.target.value;
                    if (clientSearchTimer.current) window.clearTimeout(clientSearchTimer.current);
                    clientSearchTimer.current = window.setTimeout(() => searchClients(term), 300);
                  }}
                  placeholder="Pesquisar por nome, CPF, telefone ou ID..."
                  className="pl-8 text-xs h-8"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
              {clientResults.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                  {clientResults.map((contact) => (
                    <button
                      type="button"
                      key={contact.id}
                      onClick={() => selectClient(contact)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b last:border-0 flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-foreground">{contact.name}</span>
                      <span className="text-muted-foreground">
                        {contact.cpf ? `CPF: ${contact.cpf} • ` : ''}{contact.phone ? `Tel: ${contact.phone}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchingClients && (
                <p className="text-xs text-muted-foreground mt-1">Buscando...</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="os-nome">Nome Completo *</Label>
            <Input id="os-nome" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Nome completo do cliente" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-cpf">CPF</Label>
            <Input id="os-cpf" value={form.client_cpf} onChange={(e) => setForm({ ...form, client_cpf: e.target.value })} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-telefone">
              <Phone className="w-3 h-3 inline mr-1" />Telefone
            </Label>
            <Input id="os-telefone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-email">E-mail</Label>
            <Input id="os-email" type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} placeholder="cliente@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-instagram">Instagram</Label>
            <Input id="os-instagram" value={form.client_instagram} onChange={(e) => setForm({ ...form, client_instagram: e.target.value })} placeholder="@cliente" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-genero">Gênero</Label>
            <Input id="os-genero" value={form.client_gender} onChange={(e) => setForm({ ...form, client_gender: e.target.value })} placeholder="Masculino/Feminino/Outro" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-nascimento">Data de Nascimento</Label>
            <Input id="os-nascimento" type="date" value={form.client_birthdate} onChange={(e) => setForm({ ...form, client_birthdate: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3 md:col-span-3">
            <div className="space-y-1.5">
              <Label htmlFor="os-cep">CEP</Label>
              <Input id="os-cep" value={form.client_cep} onChange={(e) => setForm({ ...form, client_cep: e.target.value })} placeholder="00000-000" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="os-endereco">Endereço</Label>
              <Input id="os-endereco" value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} placeholder="Rua, avenida..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-numero">Número</Label>
              <Input id="os-numero" value={form.client_number} onChange={(e) => setForm({ ...form, client_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-bairro">Bairro</Label>
              <Input id="os-bairro" value={form.client_neighborhood} onChange={(e) => setForm({ ...form, client_neighborhood: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-cidade">Cidade</Label>
              <Input id="os-cidade" value={form.client_city} onChange={(e) => setForm({ ...form, client_city: e.target.value })} placeholder="Guarulhos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-estado">Estado</Label>
              <Input id="os-estado" value={form.client_state} onChange={(e) => setForm({ ...form, client_state: e.target.value })} placeholder="SP" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="os-data-entrada">Data de Entrada</Label>
            <Input id="os-data-entrada" type="datetime-local" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="os-data-retirada">Data de Retirada</Label>
            <Input id="os-data-retirada" type="date" value={form.pickup_date} onChange={(e) => setForm({ ...form, pickup_date: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Produtos e Serviços
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="os-produto-id-search">Leitor / ID / SKU do Produto</Label>
            <div className="flex gap-2">
              <Input
                id="os-produto-id-search"
                value={productCodeQuery}
                onChange={(e) => setProductCodeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addProductByCode(productCodeQuery);
                  }
                }}
                placeholder="Digite o SKU ou ID e aperte Enter..."
              />
              <Button type="button" variant="outline" onClick={() => addProductByCode(productCodeQuery)}>
                Adicionar
              </Button>
            </div>
          </div>
          <div className="relative space-y-1.5">
            <Label htmlFor="os-produto-search">Buscar Produto/Serviço por Nome</Label>
            <Input
              id="os-produto-search"
              value={productQuery}
              onChange={(e) => searchProducts(e.target.value)}
              placeholder="Digite para buscar..."
            />
            {productResults.length > 0 && (
              <div className="absolute z-30 w-full max-h-52 overflow-y-auto rounded-lg border border-border bg-card shadow-lg mt-1">
                {productResults.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => addProductItem(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(p.default_price)}</span>
                  </button>
                ))}
              </div>
            )}
            {(!productQuery.trim() || productResults.length === 0) && searchingProducts && (
              <p className="text-xs text-muted-foreground">Buscando...</p>
            )}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Itens na Ordem</Label>
            <div className="rounded-md border border-border divide-y divide-border max-h-52 overflow-y-auto">
              {orderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-4 text-center">Nenhum item adicionado.</p>
              ) : (
                orderItems.map((item, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.tipo} {item.sku ? `· ${item.sku}` : ''}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 1 })}
                      className="w-16"
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        value={String(item.valor).replace('.', ',')}
                        onChange={(e) => updateItem(idx, { valor: parseAmount(e.target.value) })}
                        className="w-20 text-right"
                      />
                      <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <Label>Subtotal</Label>
          <div className="px-3 py-2 rounded-md border bg-muted text-sm font-mono">{formatCurrency(baseValue)}</div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="os-desconto">Desconto (R$)</Label>
          <Input id="os-desconto" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <Label>Total</Label>
          <div className="px-3 py-2 rounded-md border bg-muted text-sm font-mono font-bold">{formatCurrency(total)}</div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="os-pagamento">Forma de Pagamento</Label>
          <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}>
            <SelectTrigger id="os-pagamento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.payment_method === 'Cartão de Crédito' ? (
          <div className="space-y-1.5">
            <Label htmlFor="os-parcelas">Parcelas no Crédito</Label>
            <Input id="os-parcelas" type="number" min={1} value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} placeholder="1" />
          </div>
        ) : null}
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={submittingOrder}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {editing ? 'Salvar Alterações' : submittingOrder ? 'Cadastrando...' : 'Cadastrar Ordem de Serviço'}
        </Button>
        {editing && (
          <Button type="button" variant="outline" className="flex-1" onClick={() => { resetForm(); setView('consultar'); }}>
            Cancelar Edição
          </Button>
        )}
      </div>

      {/* Pergunta se deseja salvar os dados do cliente antes de registrar a OS */}
      <AlertDialog open={saveClientDialogOpen} onOpenChange={setSaveClientDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar dados do cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados do cliente foram alterados mas ainda não foram salvos no cadastro.
              Deseja salvá-los antes de registrar a ordem de serviço?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmSaveClientAndSubmit}>Sim, salvar</AlertDialogAction>
            <Button variant="outline" onClick={() => { setSaveClientDialogOpen(false); doSubmit(); }}>
              Não salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );

  const renderConsultar = () => (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={loadOrders} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={() => { resetForm(); setView('registrar'); }}>
            <Plus className="w-4 h-4 mr-2" /> Nova Ordem
          </Button>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkOrderStatus | 'all')}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {WORK_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {WORK_ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="accent-primary" />
            Somente em aberto
          </label>
        </div>
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, CPF, telefone, OS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Total de <span className="font-semibold text-foreground">{filteredOrders.length}</span> ordens
        </div>
        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> {formatCurrency(totalValue)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Carregando ordens...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma ordem de serviço encontrada.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">OS</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4">Data Entrada</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Pagamento</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold">{o.os_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium">{o.client_name}</p>
                    <p className="text-xs text-muted-foreground">{o.client_phone || o.client_cpf || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{o.items_count} {o.items_count === 1 ? 'item' : 'itens'}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{o.entry_date ? new Date(o.entry_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="py-3 px-4">
                    <Badge variant={STATUS_VARIANT[o.status] ?? 'outline'}>{WORK_ORDER_STATUS_LABELS[o.status]}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{o.payment_method}{o.installments ? ` (${o.installments}x)` : ''}</td>
                  <td className="py-3 px-4 text-right font-semibold">{formatCurrency(Number(o.total))}</td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setPreview(o)} title="Ver">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(o)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader
        title="Ordens de Serviço"
        subtitle="Registre e acompanhe ordens de serviço de assistência técnica."
      />

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setView('registrar')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            view === 'registrar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Plus className="w-4 h-4" /> Registrar OS
        </button>
        <button
          onClick={() => {
            setView('consultar');
            loadOrders();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
            view === 'consultar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Search className="w-4 h-4" /> Consultar OS
        </button>
      </div>

      {view === 'registrar' ? renderRegistrar() : renderConsultar()}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordem de Serviço Registrada!</DialogTitle>
            <DialogDescription>
              {preview ? `OS #${preview.os_number} • ${preview.client_name ?? ''}` : 'Resumo da ordem.'}
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div
                id="printable-os-preview"
                className="bg-white text-black border rounded-lg p-8 font-sans"
                dangerouslySetInnerHTML={{ __html: buildOsDocument(preview, companyProfile) }}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button variant="outline" onClick={() => downloadOrderPdf(preview)}>
                  <Download className="w-4 h-4 mr-2" /> Baixar PDF
                </Button>
                <Button variant="outline" onClick={() => printOrder(preview)}>
                  <Printer className="w-4 h-4 mr-2" /> Imprimir (2 vias)
                </Button>
                <Button variant="outline" onClick={() => whatsappOrder(preview)}>
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreview(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dados da Empresa na OS</DialogTitle>
            <DialogDescription>
              Aparecem no cabeçalho e rodapé do documento impresso/PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cp-nome">Nome da Empresa</Label>
              <Input id="cp-nome" value={companyDraft.nome} onChange={(e) => setCompanyDraft({ ...companyDraft, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-cnpj">CNPJ</Label>
              <Input id="cp-cnpj" value={companyDraft.cnpj} onChange={(e) => setCompanyDraft({ ...companyDraft, cnpj: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-whatsapp">WhatsApp</Label>
              <Input id="cp-whatsapp" value={companyDraft.whatsapp} onChange={(e) => setCompanyDraft({ ...companyDraft, whatsapp: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cp-endereco">Endereço</Label>
              <Input id="cp-endereco" value={companyDraft.endereco} onChange={(e) => setCompanyDraft({ ...companyDraft, endereco: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cp-responsavel">Responsável</Label>
              <Input id="cp-responsavel" value={companyDraft.responsavel} onChange={(e) => setCompanyDraft({ ...companyDraft, responsavel: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cp-termos">Termos de Serviço</Label>
              <Textarea id="cp-termos" rows={3} value={companyDraft.termos} onChange={(e) => setCompanyDraft({ ...companyDraft, termos: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setCompanyProfile(companyDraft);
                localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(companyDraft));
                setCompanyDialogOpen(false);
                toast.success('Dados da empresa salvos');
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}