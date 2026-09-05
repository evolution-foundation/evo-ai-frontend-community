import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Store,
  User,
  BarChart3,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Repeat,
  Pause,
  Play,
  CalendarClock,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@evoapi/design-system';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import {
  financialTransactionsService,
  recurringTransactionsService,
  FinancialTransaction,
  FinancialKind,
  FinancialScope,
  RecurringTransaction,
  RecurrenceEndRule,
} from '@/services/finances/financesService';

type TabId =
  | 'store-expenses'
  | 'store-entries'
  | 'store-history'
  | 'personal-expenses'
  | 'personal-entries'
  | 'personal-history'
  | 'history'
  | 'recurrences'
  | 'reports'
  | 'futuro';

type FrequencyChoice = 'monthly' | '15d' | 'custom';

interface RecurrenceFormState {
  enabled: boolean;
  frequency: FrequencyChoice;
  intervalDays: string;
  endRule: RecurrenceEndRule;
  endDate: string;
  count: string;
}

const emptyRecurrenceForm: RecurrenceFormState = {
  enabled: false,
  frequency: 'monthly',
  intervalDays: '30',
  endRule: 'never',
  endDate: '',
  count: '',
};

type QuickKey = 'hoje' | 'ontem' | 'semana' | 'mes' | 'ano' | 'todos';

const CHART_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#fb923c', '#22d3ee'];

const QUICK_OPTIONS: { key: QuickKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
  { key: 'todos', label: 'Todos' },
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function parseAmount(value: string): number | null {
  const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function toLocalInputDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalDate(d.toISOString());
}

function quickRange(key: QuickKey): { from: string; to: string } {
  const now = new Date();
  const today = toLocalDate(now.toISOString());
  const monday = (now.getDay() + 6) % 7;
  const weekStart = addDays(today, -monday);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const yearStart = `${now.getFullYear()}-01-01`;
  switch (key) {
    case 'hoje':
      return { from: today, to: today };
    case 'ontem':
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case 'semana':
      return { from: weekStart, to: today };
    case 'mes':
      return { from: monthStart, to: today };
    case 'ano':
      return { from: yearStart, to: today };
    case 'todos':
    default:
      return { from: '', to: '' };
  }
}

function emptyForm(scope: FinancialScope, kind: FinancialKind) {
  return {
    kind,
    scope,
    description: '',
    category: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 16),
  };
}

function frequencyLabel(r: RecurringTransaction): string {
  if (r.frequency === 'monthly') return 'Mensal';
  if (r.interval_days === 365) return 'Anual';
  if (r.interval_days === 15) return 'Quinzenal';
  if (r.interval_days === 7) return 'Semanal';
  return `A cada ${r.interval_days} dias`;
}

function endRuleLabel(r: RecurringTransaction): string {
  switch (r.end_rule) {
    case 'never':
      return 'Sempre';
    case 'until_date':
      return `Até ${formatShortDate(r.end_date || '')}`;
    case 'count':
      return `${r.generated_count} de ${r.max_occurrences} vezes`;
    default:
      return '—';
  }
}

function resolveIntervalDays(choice: FrequencyChoice, rawInterval: string): number | null {
  if (choice === 'monthly') return null;
  if (choice === 'annual') return 365;
  if (choice === '15d') return 15;
  const parsed = parseInt(rawInterval, 10);
  if (Number.isNaN(parsed) || parsed < 1) return null;
  return parsed;
}

/* ------------------------------ Visão Futuro ------------------------------ */

type GranularidadeFuturo = 'semana' | 'mes' | 'ano';

const futuroIsoLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const futuroHoje = (): string => futuroIsoLocal(new Date());

function futuroAvancarData(dateStr: string, frequency: string, intervalDays: number | null): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (frequency === 'monthly') dt.setMonth(dt.getMonth() + 1);
  else dt.setDate(dt.getDate() + Math.max(1, intervalDays ?? 30));
  return futuroIsoLocal(dt);
}

function futuroPeriodoRange(anchor: string, gran: GranularidadeFuturo): { from: string; to: string; titulo: string } {
  const [y, m, d] = anchor.split('-').map(Number);
  if (gran === 'ano') {
    return { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31`, titulo: String(y) };
  }
  const dt = new Date(y, m - 1, d);
  if (gran === 'mes') {
    const titulo = dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return {
      from: `${anchor.slice(0, 8)}01`,
      to: futuroIsoLocal(new Date(y, m, 0)),
      titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
    };
  }
  const dia = dt.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const seg = new Date(y, m - 1, d + diff);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  const curto = (x: Date) => x.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return { from: futuroIsoLocal(seg), to: futuroIsoLocal(dom), titulo: `Semana ${curto(seg)} – ${curto(dom)}` };
}

function futuroNavegarAncora(anchor: string, gran: GranularidadeFuturo, dir: number): string {
  const [y, m, d] = anchor.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (gran === 'ano') dt.setFullYear(dt.getFullYear() + dir);
  else if (gran === 'mes') {
    dt.setDate(1);
    dt.setMonth(dt.getMonth() + dir);
  } else dt.setDate(dt.getDate() + 7 * dir);
  return futuroIsoLocal(dt);
}

interface ItemFuturoLista {
  data: string;
  descricao: string;
  categoria: string;
  amount: number;
  kind: FinancialKind;
  recorrente: boolean;
}

interface FormState {
  kind: FinancialKind;
  scope: FinancialScope;
  description: string;
  category: string;
  amount: string;
  transaction_date: string;
}

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}

function CategoryCombobox({ value, onChange, suggestions, placeholder }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const exact = suggestions.filter((s) => s.toLowerCase() === value.trim().toLowerCase());
  const matches = suggestions.filter(
    (s) =>
      s.toLowerCase() !== value.trim().toLowerCase() &&
      (value.trim() === '' || s.toLowerCase().includes(value.trim().toLowerCase())),
  );
  const showCreate = value.trim() !== '' && exact.length === 0;

  const items = [...exact, ...matches].slice(0, 12);

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const handleBlur = () => {
    blurTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const handleFocus = () => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(true);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id="f-cat"
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder || 'Digite ou escolha uma categoria'}
            className="pr-8"
          />
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Adicionar nova categoria"
          onMouseDown={(e: React.MouseEvent) => {
            e.preventDefault();
            const next = value.trim() || 'Nova categoria';
            select(next);
            toast.success(`Categoria "${next}" selecionada`);
          }}
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {items.length === 0 && !showCreate ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">
              {suggestions.length === 0
                ? 'Nenhuma categoria cadastrada ainda.'
                : 'Nenhuma categoria correspondente.'}
            </div>
          ) : null}
          {items.map((cat) => (
            <button
              type="button"
              key={cat}
              onMouseDown={(e) => {
                e.preventDefault();
                select(cat);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
            >
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              {cat}
            </button>
          ))}
          {showCreate ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                select(value.trim());
              }}
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted transition-colors cursor-pointer border-t border-border flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar categoria &ldquo;{value.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function FinancesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('store-expenses');
  const [activeGroup, setActiveGroup] = useState<'store' | 'personal'>('store');

  // Submenu da sidebar: /finances/loja | /finances/pessoal | /finances/ambos
  const { escopo } = useParams<{ escopo: string }>();
  useEffect(() => {
    if (escopo === 'loja') {
      setActiveGroup('store');
      setActiveTab('store-expenses');
    } else if (escopo === 'pessoal') {
      setActiveGroup('personal');
      setActiveTab('personal-expenses');
    } else if (escopo === 'ambos') {
      setActiveTab('history');
    }
  }, [escopo]);

  // Escopo travado pelo submenu da sidebar (/finances/loja | /finances/pessoal):
  // esconde as opções do outro escopo no conteúdo da página. 'ambos' e a rota
  // /finances sem parâmetro mantêm o comportamento completo de sempre.
  const scopeLocked: 'store' | 'personal' | null =
    escopo === 'loja' ? 'store' : escopo === 'pessoal' ? 'personal' : null;

  const [futuroGran, setFuturoGran] = useState<GranularidadeFuturo>('mes');
  const [futuroAncora, setFuturoAncora] = useState(futuroHoje);

  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [quickKey, setQuickKey] = useState<QuickKey>('mes');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setQuickKey('mes');
    setFromDate('');
    setToDate('');
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setQuickKey('mes');
    setFromDate('');
    setToDate('');
  };

  const formattedMonthYear = useMemo(() => {
    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
    const year = currentDate.getFullYear();
    return `<${monthName} /${year}>`;
  }, [currentDate]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('store', 'expense'));
  const [recurrence, setRecurrence] = useState<RecurrenceFormState>(emptyRecurrenceForm);
  const [recurrences, setRecurrences] = useState<RecurringTransaction[]>([]);
  const [editingRecurrence, setEditingRecurrence] = useState<RecurringTransaction | null>(null);
  const [isRecDialogOpen, setIsRecDialogOpen] = useState(false);

  const scopes: { id: FinancialScope; label: string; icon: typeof Store }[] = [
    { id: 'store', label: 'Despesas Loja', icon: Store },
    { id: 'personal', label: 'Despesas Pessoais', icon: User },
  ];

  const tabFilter = useMemo(() => {
    switch (activeTab) {
      case 'store-expenses':
        return { scope: 'store' as const, kind: 'expense' as const, history: false };
      case 'store-entries':
        return { scope: 'store' as const, kind: 'income' as const, history: false };
      case 'store-history':
        return { scope: 'store' as const, kind: null, history: true };
      case 'personal-expenses':
        return { scope: 'personal' as const, kind: 'expense' as const, history: false };
      case 'personal-entries':
        return { scope: 'personal' as const, kind: 'income' as const, history: false };
      case 'personal-history':
        return { scope: 'personal' as const, kind: null, history: true };
      case 'history':
        return { scope: null, kind: null, history: true };
      default:
        return null;
    }
  }, [activeTab]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financialTransactionsService.getTransactions();
      setTransactions(data);
    } catch {
      toast.error('Erro ao carregar movimentações financeiras');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecurrences = useCallback(async () => {
    try {
      const data = await recurringTransactionsService.getRecurringTransactions();
      setRecurrences(data);
    } catch {
      toast.error('Erro ao carregar recorrências');
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadRecurrences();
  }, [loadTransactions, loadRecurrences]);

  const categorySuggestions = useMemo(() => {
    if (!tabFilter) return [];
    return Array.from(
      new Set(
        transactions
          .filter((t) => (tabFilter.scope === null || t.scope === tabFilter.scope) && (tabFilter.history || t.kind === tabFilter.kind))
          .map((t) => t.category)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [transactions, tabFilter]);

  const period = useMemo(() => {
    if (fromDate || toDate) return { from: fromDate, to: toDate };
    if (quickKey === 'mes') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const pad = (n: number) => String(n).padStart(2, '0');
      const firstDay = `${year}-${pad(month + 1)}-01`;
      const lastDayDate = new Date(year, month + 1, 0);
      const lastDay = `${year}-${pad(month + 1)}-${pad(lastDayDate.getDate())}`;
      return { from: firstDay, to: lastDay };
    }
    return quickRange(quickKey);
  }, [quickKey, fromDate, toDate, currentDate]);

  const periodFiltered = useMemo(() => {
    if (!tabFilter) return [];
    return transactions.filter((t) => {
      if (tabFilter.scope !== null && t.scope !== tabFilter.scope) return false;
      if (!tabFilter.history && t.kind !== tabFilter.kind) return false;
      const day = toLocalDate(t.transaction_date);
      if (period.from && day < period.from) return false;
      if (period.to && day > period.to) return false;
      return true;
    });
  }, [transactions, tabFilter, period]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return periodFiltered
      .filter(
        (t) =>
          !term ||
          t.description.toLowerCase().includes(term) ||
          (t.category || '').toLowerCase().includes(term),
      )
      .sort((a, b) => (a.transaction_date < b.transaction_date ? 1 : -1));
  }, [periodFiltered, search]);

  const periodTotal = useMemo(() => {
    const total = periodFiltered.reduce((acc, t) => acc + t.amount, 0);
    return { total, count: periodFiltered.length };
  }, [periodFiltered]);

  const handleOpenModal = (scope: FinancialScope, kind: FinancialKind, item?: FinancialTransaction) => {
    if (item) {
      setEditing(item);
      setForm({
        kind: item.kind,
        scope: item.scope,
        description: item.description,
        category: item.category || '',
        amount: String(item.amount).replace('.', ','),
        transaction_date: toLocalInputDateTime(item.transaction_date),
      });
    } else {
      setEditing(null);
      setForm(emptyForm(scope, kind));
    }
    setRecurrence({ ...emptyRecurrenceForm });
    setIsOpen(true);
  };

  const buildRecurrencePayload = () => {
    const startDate = form.transaction_date.slice(0, 10);
    const intervalDays = resolveIntervalDays(recurrence.frequency, recurrence.intervalDays);
    if (recurrence.frequency === 'custom' && intervalDays == null) {
      toast.error('Informe um intervalo de dias válido (maior que zero)');
      return null;
    }
    if (recurrence.endRule === 'until_date') {
      if (!recurrence.endDate) {
        toast.error('Informe a data limite da recorrência');
        return null;
      }
      if (recurrence.endDate < startDate) {
        toast.error('A data limite deve ser igual ou posterior à data inicial');
        return null;
      }
    }
    let maxOccurrences: number | null = null;
    if (recurrence.endRule === 'count') {
      const parsed = parseInt(recurrence.count, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        toast.error('Informe uma quantidade de repetições válida');
        return null;
      }
      maxOccurrences = parsed;
    }
    return {
      kind: form.kind,
      scope: form.scope,
      description: form.description.trim(),
      category: form.category.trim() || (form.kind === 'expense' ? 'Geral' : 'Vendas'),
      amount: parseAmount(form.amount) as number,
      start_date: startDate,
      frequency: (recurrence.frequency === 'monthly' ? 'monthly' : 'days') as 'monthly' | 'days',
      interval_days: intervalDays,
      end_rule: recurrence.endRule,
      end_date: recurrence.endRule === 'until_date' ? recurrence.endDate : null,
      max_occurrences: maxOccurrences,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (amount == null || amount <= 0) {
      toast.error('Informe um valor válido maior que zero');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Informe a descrição');
      return;
    }
    if (!form.transaction_date) {
      toast.error('Informe a data e hora');
      return;
    }
    try {
      if (editing) {
        const payload = {
          kind: form.kind,
          scope: form.scope,
          description: form.description.trim(),
          category: form.category.trim() || (form.kind === 'expense' ? 'Geral' : 'Vendas'),
          amount,
          transaction_date: new Date(form.transaction_date).toISOString(),
        };
        await financialTransactionsService.updateTransaction(editing.id, payload);
        toast.success('Movimentação atualizada com sucesso!');
      } else if (recurrence.enabled) {
        const payload = buildRecurrencePayload();
        if (!payload) return;
        await recurringTransactionsService.createRecurringTransaction(payload);
        toast.success('Recorrência criada! As movimentações foram agendadas.');
        loadRecurrences();
      } else {
        const payload = {
          kind: form.kind,
          scope: form.scope,
          description: form.description.trim(),
          category: form.category.trim() || (form.kind === 'expense' ? 'Geral' : 'Vendas'),
          amount,
          transaction_date: new Date(form.transaction_date).toISOString(),
        };
        await financialTransactionsService.createTransaction(payload);
        toast.success('Movimentação registrada com sucesso!');
      }
      setIsOpen(false);
      loadTransactions();
    } catch {
      toast.error('Erro ao salvar movimentação');
    }
  };

  const handleDelete = async (item: FinancialTransaction) => {
    if (!confirm(`Excluir "${item.description}"?`)) return;
    try {
      await financialTransactionsService.deleteTransaction(item.id);
      toast.success('Movimentação excluída');
      loadTransactions();
    } catch {
      toast.error('Erro ao excluir movimentação');
    }
  };

  const handleToggleRecurrence = async (r: RecurringTransaction) => {
    try {
      await recurringTransactionsService.updateRecurringTransaction(r.id, { active: !r.active });
      toast.success(r.active ? 'Recorrência pausada' : 'Recorrência retomada');
      loadRecurrences();
    } catch {
      toast.error('Erro ao atualizar recorrência');
    }
  };

  const handleDeleteRecurrence = async (r: RecurringTransaction) => {
    if (!confirm(`Excluir a recorrência "${r.description}"?`)) return;
    let deleteFuture = false;
    if (
      confirm(
        'Excluir também as movimentações futuras ainda não vencidas?\n\nOK = sim, excluir futuras\nCancelar = manter as já geradas',
      )
    ) {
      deleteFuture = true;
    }
    try {
      await recurringTransactionsService.deleteRecurringTransaction(r.id, deleteFuture);
      toast.success('Recorrência excluída');
      loadRecurrences();
      loadTransactions();
    } catch {
      toast.error('Erro ao excluir recorrência');
    }
  };

  const openEditRecurrence = (r: RecurringTransaction) => {
    setEditingRecurrence(r);
    setEditRecForm(recFormFromTemplate(r));
    setIsRecDialogOpen(true);
  };

  const recFormFromTemplate = (r: RecurringTransaction): RecurrenceFormState => ({
    enabled: true,
    frequency:
      r.frequency === 'monthly'
        ? 'monthly'
        : r.interval_days === 365
          ? 'annual'
          : r.interval_days === 15
            ? '15d'
            : 'custom',
    intervalDays: String(r.interval_days ?? 30),
    endRule: r.end_rule,
    endDate: r.end_date || '',
    count: r.max_occurrences ? String(r.max_occurrences) : '',
  });

  const [editRecForm, setEditRecForm] = useState<RecurrenceFormState>(emptyRecurrenceForm);

  const handleEditRecurrenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecurrence) return;
    const intervalDays = resolveIntervalDays(editRecForm.frequency, editRecForm.intervalDays);
    if (editRecForm.frequency === 'custom' && intervalDays == null) {
      toast.error('Informe um intervalo de dias válido (maior que zero)');
      return;
    }
    if (editRecForm.endRule === 'until_date') {
      if (!editRecForm.endDate) {
        toast.error('Informe a data limite da recorrência');
        return;
      }
      if (editRecForm.endDate < editingRecurrence.start_date) {
        toast.error('A data limite deve ser igual ou posterior à data inicial');
        return;
      }
    }
    let maxOccurrences: number | null = null;
    if (editRecForm.endRule === 'count') {
      const parsed = parseInt(editRecForm.count, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        toast.error('Informe uma quantidade de repetições válida');
        return;
      }
      maxOccurrences = parsed;
    }
    try {
      await recurringTransactionsService.updateRecurringTransaction(editingRecurrence.id, {
        frequency: editRecForm.frequency === 'monthly' ? 'monthly' : 'days',
        interval_days: intervalDays,
        end_rule: editRecForm.endRule,
        end_date: editRecForm.endRule === 'until_date' ? editRecForm.endDate : null,
        max_occurrences: maxOccurrences,
        active: true,
      });
      toast.success('Recorrência atualizada! Movimentações futuras foram reajustadas.');
      setIsRecDialogOpen(false);
      setEditingRecurrence(null);
      loadRecurrences();
      loadTransactions();
    } catch {
      toast.error('Erro ao atualizar recorrência');
    }
  };

  const handleQuick = (key: QuickKey) => {
    setQuickKey(key);
    setFromDate('');
    setToDate('');
  };

  const reports = useMemo(() => {
    const store = transactions.filter((t) => t.scope === 'store');
    const personal = transactions.filter((t) => t.scope === 'personal');

    const buildData = (items: FinancialTransaction[]) => {
      const income = items.filter((t) => t.kind === 'income').reduce((a, t) => a + t.amount, 0);
      const expenses = items.filter((t) => t.kind === 'expense').reduce((a, t) => a + t.amount, 0);
      const byDay: Record<string, { income: number; expenses: number }> = {};
      const byCategory: Record<string, number> = {};
      const byProduct: Record<string, number> = {};

      items.forEach((t) => {
        const day = toLocalDate(t.transaction_date);
        byDay[day] = byDay[day] || { income: 0, expenses: 0 };
        if (t.kind === 'income') byDay[day].income += t.amount;
        else {
          byDay[day].expenses += t.amount;
          byCategory[t.category || 'Não especificado'] =
            (byCategory[t.category || 'Não especificado'] || 0) + t.amount;
          byProduct[t.description] = (byProduct[t.description] || 0) + t.amount;
        }
      });

      const daily = Object.entries(byDay)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, v]) => ({
          date,
          Entradas: Number(v.income.toFixed(2)),
          Despesas: Number(v.expenses.toFixed(2)),
        }));

      const categories = Object.entries(byCategory)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value);

      const topProducts = Object.entries(byProduct)
        .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      return { income, expenses, net: income - expenses, daily, categories, topProducts };
    };

    return { store: buildData(store), personal: buildData(personal) };
  }, [transactions]);

  const renderCrudTab = () => {
    if (!tabFilter || activeTab === 'reports') return null;
    const scope = tabFilter.scope;
    const kind = tabFilter.kind;
    const isExpense = kind === 'expense';
    const isHistory = tabFilter.history;
    const isCombined = scope === null;
    const modalScope: FinancialScope = scope ?? activeGroup;
    const ScopeIcon = scopes.find((s) => s.id === scope)?.icon ?? Wallet;

    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={loadTransactions} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
            {isHistory ? (
              <>
                <Button variant="outline" onClick={() => handleOpenModal(modalScope, 'expense')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Despesa
                </Button>
                <Button variant="outline" onClick={() => handleOpenModal(modalScope, 'income')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Entrada
                </Button>
              </>
            ) : (
              <Button onClick={() => handleOpenModal(modalScope, kind as 'expense' | 'income')}>
                <Plus className="w-4 h-4 mr-2" />
                {isExpense ? 'Nova Despesa' : 'Nova Entrada'}
              </Button>
            )}
          </div>
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar descrição/categoria..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-1">Período</span>
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleQuick(opt.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    !fromDate && !toDate && quickKey === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Navegador centralizado de Mês/Ano */}
            <div className="flex items-center gap-1.5 bg-muted/50 border border-border px-2 py-1 rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={prevMonth}
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono font-semibold px-2 text-foreground capitalize">
                {formattedMonthYear}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={nextMonth}
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="f-from" className="text-sm text-muted-foreground">
              De
            </Label>
            <Input
              id="f-from"
              type="date"
              value={fromDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFromDate(e.target.value);
                setQuickKey('todos');
              }}
              className="w-auto"
            />
            <Label htmlFor="f-to" className="text-sm text-muted-foreground">
              Até
            </Label>
            <Input
              id="f-to"
              type="date"
              value={toDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setToDate(e.target.value);
                setQuickKey('todos');
              }}
              className="w-auto"
            />
            {(fromDate || toDate) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setQuickKey('mes');
                }}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScopeIcon className="w-4 h-4" />
            <span>
              Total do Período
              {period.from || period.to ? (
                <>
                  {' '}
                  ({period.from ? formatShortDate(period.from) : 'início'}
                  {period.to ? ` a ${formatShortDate(period.to)}` : ' até hoje'})
                </>
              ) : (
                ' (todos)'
              )}
              :
            </span>
            <span className="font-semibold text-foreground">{periodTotal.count} movimentações</span>
          </div>
          {isHistory ? (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                + {formatCurrency(filtered.filter(t => t.kind === 'income').reduce((a, t) => a + t.amount, 0))}
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                - {formatCurrency(filtered.filter(t => t.kind === 'expense').reduce((a, t) => a + t.amount, 0))}
              </span>
            </div>
          ) : (
            <span
              className={`text-xl font-bold ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              {isExpense ? '-' : '+'} {formatCurrency(periodTotal.total)}
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Carregando movimentações...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma movimentação encontrada neste período.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  {isCombined && <th className="py-3 px-4">Origem</th>}
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((t) => {
                  const rowIsExpense = isHistory ? t.kind === 'expense' : isExpense;
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {new Date(t.transaction_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          {t.recurring_transaction_id && (
                            <Repeat
                              className="w-3.5 h-3.5 text-primary shrink-0"
                              title={
                                t.occurrence_number
                                  ? `Ocorrência ${t.occurrence_number} de recorrência`
                                  : 'Parte de uma recorrência'
                              }
                            />
                          )}
                          {t.description}
                        </span>
                      </td>
                      {isCombined && (
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              t.scope === 'store'
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                                : 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                            }`}
                          >
                            {t.scope === 'store' ? (
                              <>
                                <Store className="w-3 h-3" /> Loja
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" /> Pessoal
                              </>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-muted text-xs">{t.category || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {rowIsExpense ? 'Despesa' : 'Entrada'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold ${rowIsExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                      >
                        {rowIsExpense ? '- ' : '+ '}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(t.scope, t.kind, t)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderFuturo = () => {
    if (activeTab !== 'futuro') return null;
    const hoje = futuroHoje();
    const { from, to, titulo } = futuroPeriodoRange(futuroAncora, futuroGran);
    const itens: ItemFuturoLista[] = [];

    for (const t of transactions) {
      if (t.scope !== activeGroup) continue;
      const dia = t.transaction_date.slice(0, 10);
      if (dia > hoje && dia >= from && dia <= to) {
        itens.push({
          data: dia,
          descricao: t.description,
          categoria: t.category || 'Sem categoria',
          amount: t.amount,
          kind: t.kind,
          recorrente: false,
        });
      }
    }

    for (const r of recurrences) {
      if (!r.active || r.scope !== activeGroup || !r.next_occurrence_date) continue;
      let cursor = r.next_occurrence_date.slice(0, 10);
      let restantes =
        r.end_rule === 'count' ? Math.max(0, (r.max_occurrences ?? 0) - r.generated_count) : null;
      let guard = 0;
      while (cursor && guard < 400) {
        guard += 1;
        if (r.end_rule === 'until_date' && r.end_date && cursor > r.end_date) break;
        if (restantes !== null && restantes <= 0) break;
        if (cursor > to) break;
        if (cursor > hoje && cursor >= from) {
          itens.push({
            data: cursor,
            descricao: r.description,
            categoria: r.category || 'Sem categoria',
            amount: r.amount,
            kind: r.kind,
            recorrente: true,
          });
        }
        if (restantes !== null) restantes -= 1;
        cursor = futuroAvancarData(cursor, r.frequency, r.interval_days);
      }
    }

    itens.sort((a, b) => a.data.localeCompare(b.data));
    const totEntradas = itens.filter((i) => i.kind === 'income').reduce((s, i) => s + i.amount, 0);
    const totDespesas = itens.filter((i) => i.kind === 'expense').reduce((s, i) => s + i.amount, 0);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Mês'],
              ['ano', 'Ano'],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => setFuturoGran(g)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                futuroGran === g
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setFuturoAncora((a) => futuroNavegarAncora(a, futuroGran, -1))}
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="min-w-40 text-center text-xl font-bold capitalize text-foreground">{titulo}</h3>
          <Button
            variant="outline"
            onClick={() => setFuturoAncora((a) => futuroNavegarAncora(a, futuroGran, 1))}
            aria-label="Próximo período"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Compromissos com data após hoje · Entradas previstas{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(totEntradas)}</span> ·
          Despesas previstas{' '}
          <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(totDespesas)}</span>
        </p>

        {itens.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Nenhum compromisso previsto para este período.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card divide-y divide-border">
            {itens.map((i, idx) => (
              <div key={`${i.data}-${i.descricao}-${idx}`} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                    i.kind === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {i.kind === 'income' ? '↓' : '↑'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {i.descricao}
                    {i.recorrente && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        🔁 recorrente
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(i.data)} · {i.categoria}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    i.kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {i.kind === 'income' ? '+' : '-'}
                  {formatCurrency(i.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRecurrences = () => {
    if (activeTab !== 'recurrences') return null;

    return (
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                loadRecurrences();
                loadTransactions();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
            <span className="text-sm text-muted-foreground">
              Despesas e entradas fixas geradas automaticamente (mensal, quinzenal ou a cada X dias).
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          {recurrences.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma recorrência cadastrada. Use o botão &ldquo;Recorrência&rdquo; ao criar uma despesa ou entrada.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Escopo</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4">Frequência</th>
                  <th className="py-3 px-4">Repetição</th>
                  <th className="py-3 px-4 text-center">Próxima</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(scopeLocked ? recurrences.filter((r) => r.scope === scopeLocked) : recurrences).map((r) => {
                  const isExpense = r.kind === 'expense';
                  return (
                    <tr key={r.id} className={`hover:bg-muted/30 transition-colors ${r.active ? '' : 'opacity-60'}`}>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          <Repeat className="w-3.5 h-3.5 text-primary shrink-0" />
                          {r.description}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isExpense ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isExpense ? 'Despesa' : 'Entrada'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-muted text-xs">{r.scope === 'store' ? 'Loja' : 'Pessoal'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(r.amount)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{frequencyLabel(r)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{endRuleLabel(r)}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground text-xs">
                        {r.active && r.next_occurrence_date ? formatShortDate(r.next_occurrence_date) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {r.active ? 'Ativa' : 'Pausada'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={r.active ? 'Pausar recorrência' : 'Retomar recorrência'}
                          onClick={() => handleToggleRecurrence(r)}
                        >
                          {r.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar recorrência" onClick={() => openEditRecurrence(r)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Excluir recorrência"
                          onClick={() => handleDeleteRecurrence(r)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderReports = () => {
    if (activeTab !== 'reports') return null;

    const block = (data: typeof reports.store) => (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Entradas</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(data.income)}</h3>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Despesas</span>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <ArrowUpFromLine className="w-4 h-4" />
              </div>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(data.expenses)}</h3>
          </div>
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Lucro / Saldo</span>
              <div
                className={`p-2 rounded-lg ${data.net >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
              >
                {data.net >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <h3 className={`mt-2 text-2xl font-bold ${data.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(data.net)}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-4">Entradas e Despesas por Dia</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="Entradas" fill="#34d399" />
                <Bar dataKey="Despesas" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card">
            <h4 className="text-sm font-semibold text-foreground mb-4">Despesas por Categoria</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={(entry) => entry.name as string}
                >
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card lg:col-span-2">
            <h4 className="text-sm font-semibold text-foreground mb-4">Top Despesas por Descrição</h4>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-8">
        {scopeLocked !== 'personal' && (
          <div>
            <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Financeiro da Loja
            </h4>
            {block(reports.store)}
          </div>
        )}
        {scopeLocked !== 'store' && (
          <div>
            <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Financeiro Pessoal
            </h4>
            {block(reports.personal)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader
        title="Finanças & Gestão Financeira"
        subtitle="Despesas (Loja e Pessoais), Outras Entradas e relatórios com gráficos."
      />

      <div className="flex flex-col gap-4 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {scopeLocked !== 'personal' && (
          <button
            type="button"
            onClick={() => {
              setActiveGroup('store');
              setActiveTab('store-expenses');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab.startsWith('store-')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Store className="w-4 h-4" /> Despesas Loja
          </button>
          )}
          {scopeLocked !== 'store' && (
          <button
            type="button"
            onClick={() => {
              setActiveGroup('personal');
              setActiveTab('personal-expenses');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab.startsWith('personal-')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <User className="w-4 h-4" /> Despesas Pessoais
          </button>
          )}

          {!scopeLocked && (
            <>
              <div className="h-5 w-px bg-border mx-1" />

              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  setSearch('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Receipt className="w-4 h-4" /> Histórico
              </button>
            </>
          )}

          <div className="h-5 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => {
              setActiveTab('recurrences');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'recurrences'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="w-4 h-4" /> Recorrências
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('futuro');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'futuro'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarClock className="w-4 h-4" /> Futuro
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports');
              setSearch('');
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Relatórios
          </button>
        </div>

        {/* Sub-abas: Despesas / Entradas / Histórico */}
        {(activeTab.startsWith('store-') || activeTab.startsWith('personal-')) && (
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground mr-1">
              {activeTab.startsWith('store-') ? 'Loja:' : 'Pessoal:'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab.startsWith('store-') ? 'store-expenses' : 'personal-expenses')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store-expenses' || activeTab === 'personal-expenses'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" /> Despesas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab.startsWith('store-') ? 'store-entries' : 'personal-entries')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store-entries' || activeTab === 'personal-entries'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Entradas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(activeTab.startsWith('store-') ? 'store-history' : 'personal-history')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store-history' || activeTab === 'personal-history'
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" /> Histórico (Tudo)
            </button>
          </div>
        )}
      </div>

      {renderCrudTab()}
      {renderFuturo()}
      {renderRecurrences()}
      {renderReports()}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Movimentação' : 'Nova Movimentação'}</DialogTitle>
              <DialogDescription>
                {form.scope === 'store' ? 'Financeiro da Loja' : 'Financeiro Pessoal'} —
                {form.kind === 'expense' ? ' despesa' : ' entrada'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="f-desc">Descrição</Label>
                <Input
                  id="f-desc"
                  value={form.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Aluguel, Venda extra, Freelance..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-cat">Categoria</Label>
                <CategoryCombobox
                  value={form.category}
                  onChange={(value) => setForm({ ...form, category: value })}
                  suggestions={categorySuggestions}
                  placeholder={
                    form.kind === 'expense' ? 'Ex: Aluguel, Fornecedor, Impostos...' : 'Ex: Venda, Serviço...'
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-amount">Valor (R$)</Label>
                  <Input
                    id="f-amount"
                    value={form.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00"
                    inputMode="decimal"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-date">Data e Hora</Label>
                  <Input
                    id="f-date"
                    type="datetime-local"
                    value={form.transaction_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, transaction_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              {!editing && (
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => setRecurrence({ ...recurrence, enabled: !recurrence.enabled })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      recurrence.enabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                    Recorrência {recurrence.enabled ? 'ativada' : 'desativada'}
                  </button>
                  {recurrence.enabled && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        A primeira movimentação usa a data acima; as próximas serão geradas automaticamente.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="r-freq">Frequência</Label>
                          <select
                            id="r-freq"
                            value={recurrence.frequency}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setRecurrence({ ...recurrence, frequency: e.target.value as FrequencyChoice })
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
                          >
                            <option value="monthly">Mensal</option>
                            <option value="annual">Anual</option>
                            <option value="15d">Quinzenal (15 dias)</option>
                            <option value="custom">A cada X dias</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="r-end">Repetir</Label>
                          <select
                            id="r-end"
                            value={recurrence.endRule}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                              setRecurrence({ ...recurrence, endRule: e.target.value as RecurrenceEndRule })
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
                          >
                            <option value="never">Sempre</option>
                            <option value="until_date">Até uma data limite</option>
                            <option value="count">Quantidade de vezes</option>
                          </select>
                        </div>
                      </div>
                      {recurrence.frequency === 'custom' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="r-interval">Repetir a cada quantos dias?</Label>
                          <Input
                            id="r-interval"
                            type="number"
                            min={1}
                            value={recurrence.intervalDays}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setRecurrence({ ...recurrence, intervalDays: e.target.value })
                            }
                            placeholder="Ex: 30"
                          />
                        </div>
                      )}
                      {recurrence.endRule === 'until_date' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="r-enddate">Data limite</Label>
                          <Input
                            id="r-enddate"
                            type="date"
                            value={recurrence.endDate}
                            min={form.transaction_date.slice(0, 10)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setRecurrence({ ...recurrence, endDate: e.target.value })
                            }
                          />
                        </div>
                      )}
                      {recurrence.endRule === 'count' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="r-count">Quantas vezes repetir?</Label>
                          <Input
                            id="r-count"
                            type="number"
                            min={1}
                            value={recurrence.count}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setRecurrence({ ...recurrence, count: e.target.value })
                            }
                            placeholder="Ex: 12"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRecDialogOpen}
        onOpenChange={(open) => {
          setIsRecDialogOpen(open);
          if (!open) setEditingRecurrence(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditRecurrenceSubmit}>
            <DialogHeader>
              <DialogTitle>Editar Recorrência</DialogTitle>
              <DialogDescription>
                {editingRecurrence && (
                  <>
                    {editingRecurrence.kind === 'expense' ? 'Despesa' : 'Entrada'} ·{' '}
                    {editingRecurrence.scope === 'store' ? 'Loja' : 'Pessoal'} — as movimentações futuras serão
                    reajustadas; as já registradas são mantidas.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {editingRecurrence && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm space-y-1">
                  <div className="font-medium text-foreground">{editingRecurrence.description}</div>
                  <div className="text-xs text-muted-foreground">
                    Início em {formatShortDate(editingRecurrence.start_date)} ·{' '}
                    {editingRecurrence.generated_count} movimentações geradas
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="er-freq">Frequência</Label>
                    <select
                      id="er-freq"
                      value={editRecForm.frequency}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setEditRecForm({ ...editRecForm, frequency: e.target.value as FrequencyChoice })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="annual">Anual</option>
                      <option value="15d">Quinzenal (15 dias)</option>
                      <option value="custom">A cada X dias</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="er-end">Repetir</Label>
                    <select
                      id="er-end"
                      value={editRecForm.endRule}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setEditRecForm({ ...editRecForm, endRule: e.target.value as RecurrenceEndRule })
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
                    >
                      <option value="never">Sempre</option>
                      <option value="until_date">Até uma data limite</option>
                      <option value="count">Quantidade de vezes</option>
                    </select>
                  </div>
                </div>
                {editRecForm.frequency === 'custom' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="er-interval">Repetir a cada quantos dias?</Label>
                    <Input
                      id="er-interval"
                      type="number"
                      min={1}
                      value={editRecForm.intervalDays}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditRecForm({ ...editRecForm, intervalDays: e.target.value })
                      }
                      placeholder="Ex: 30"
                    />
                  </div>
                )}
                {editRecForm.endRule === 'until_date' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="er-enddate">Data limite</Label>
                    <Input
                      id="er-enddate"
                      type="date"
                      value={editRecForm.endDate}
                      min={editingRecurrence.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditRecForm({ ...editRecForm, endDate: e.target.value })
                      }
                    />
                  </div>
                )}
                {editRecForm.endRule === 'count' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="er-count">Quantas vezes repetir?</Label>
                    <Input
                      id="er-count"
                      type="number"
                      min={1}
                      value={editRecForm.count}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditRecForm({ ...editRecForm, count: e.target.value })
                      }
                      placeholder="Ex: 12"
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRecDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}
