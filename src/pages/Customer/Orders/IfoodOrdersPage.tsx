import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  UtensilsCrossed,
  Plus,
  Trash2,
  Pencil,
  PauseCircle,
  Star,
  Bike,
  MessageSquareWarning,
  Search,
  Store,
  DoorClosed,
  DoorOpen,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { ifoodService } from '@/services/orders/ifoodService';
import type {
  IfoodOrder,
  IfoodStatus,
  IfoodInterruption,
  IfoodCategory,
  IfoodSettlements,
  IfoodReviews,
  IfoodReviewSummary,
  IfoodReconciliation,
  IfoodAnticipations,
  IfoodFinancialEvent,
  IfoodDeliveryQuote,
  IfoodMenuItem,
  IfoodMerchantDetails,
  IfoodAnalytics,
} from '@/types/orders/ifoodOrder';

type Tab = 'pedidos' | 'status' | 'cardapio' | 'entrega' | 'disputas' | 'financeiro' | 'analytics' | 'avaliacoes';

const VALID_TABS: Tab[] = ['pedidos', 'status', 'cardapio', 'entrega', 'disputas', 'financeiro', 'analytics', 'avaliacoes'];

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

// Próxima ação disponível por status atual do pedido (fluxo linear do Order API).
const NEXT_ACTION: Record<string, { label: string; action: keyof typeof ACTION_HANDLERS } | undefined> = {
  PLACED: { label: 'Confirmar', action: 'confirm' },
  CONFIRMED: { label: 'Iniciar preparo', action: 'startPreparation' },
  PREPARATION_STARTED: { label: 'Pronto p/ retirada', action: 'readyToPickup' },
  READY_TO_PICKUP: { label: 'Despachar', action: 'dispatchOrder' },
};

const ACTION_HANDLERS = {
  confirm: ifoodService.confirmOrder.bind(ifoodService),
  startPreparation: ifoodService.startPreparation.bind(ifoodService),
  readyToPickup: ifoodService.readyToPickup.bind(ifoodService),
  dispatchOrder: ifoodService.dispatchOrder.bind(ifoodService),
};

const CANCELABLE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARATION_STARTED'];

interface ProductFormState {
  itemId: string | null;
  name: string;
  description: string;
  categoryId: string;
  price: string;
  status: string;
  currentPrice: number | null;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  itemId: null,
  name: '',
  description: '',
  categoryId: '',
  price: '',
  status: 'AVAILABLE',
  currentPrice: null,
};

export default function IfoodOrdersPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(
    VALID_TABS.includes(initialTab as Tab) ? (initialTab as Tab) : 'pedidos',
  );
  const [status, setStatus] = useState<IfoodStatus | null>(null);
  const [orders, setOrders] = useState<IfoodOrder[]>([]);
  const [interruptions, setInterruptions] = useState<IfoodInterruption[]>([]);
  const [categories, setCategories] = useState<IfoodCategory[]>([]);
  const [menuItems, setMenuItems] = useState<IfoodMenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [merchantDetails, setMerchantDetails] = useState<IfoodMerchantDetails | null>(null);
  const [settlements, setSettlements] = useState<IfoodSettlements | null>(null);
  const [reconciliation, setReconciliation] = useState<IfoodReconciliation | null>(null);
  const [anticipations, setAnticipations] = useState<IfoodAnticipations | null>(null);
  const [financialEvents, setFinancialEvents] = useState<IfoodFinancialEvent[]>([]);
  const [reviews, setReviews] = useState<IfoodReviews | null>(null);
  const [reviewSummary, setReviewSummary] = useState<IfoodReviewSummary | null>(null);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [analytics, setAnalytics] = useState<IfoodAnalytics | null>(null);
  const [analyticsForbidden, setAnalyticsForbidden] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [pauseMinutes, setPauseMinutes] = useState('30');
  const [pauseReason, setPauseReason] = useState('');
  const [togglingStore, setTogglingStore] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const [quoteMode, setQuoteMode] = useState<'manual' | 'pedido'>('manual');
  const [quoteLat, setQuoteLat] = useState('');
  const [quoteLng, setQuoteLng] = useState('');
  const [quoteOrderId, setQuoteOrderId] = useState('');
  const [quote, setQuote] = useState<IfoodDeliveryQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [driverOrderId, setDriverOrderId] = useState('');
  const [callingDriver, setCallingDriver] = useState(false);

  const [disputeId, setDisputeId] = useState('');
  const [disputeReason, setDisputeReason] = useState('CUSTOMER_SATISFACTION');
  const [respondingDispute, setRespondingDispute] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<IfoodCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<IfoodCategory | null>(null);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<IfoodMenuItem | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await ifoodService.getStatus());
    } catch {
      toast.error('Erro ao consultar status da loja no iFood');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await ifoodService.getOrders());
    } catch {
      toast.error('Erro ao carregar pedidos do iFood');
    }
  }, []);

  const loadInterruptions = useCallback(async () => {
    try {
      setInterruptions(await ifoodService.getInterruptions());
    } catch {
      toast.error('Erro ao carregar pausas da loja');
    }
  }, []);

  const loadMerchantDetails = useCallback(async () => {
    try {
      setMerchantDetails(await ifoodService.getMerchantDetails());
    } catch {
      toast.error('Erro ao carregar dados cadastrais da loja');
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await ifoodService.getCategories());
    } catch {
      toast.error('Erro ao carregar categorias');
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      setMenuItems(await ifoodService.getMenuItems());
    } catch {
      toast.error('Erro ao carregar produtos do cardápio');
    }
  }, []);

  const loadSettlements = useCallback(async () => {
    try {
      setSettlements(await ifoodService.getSettlements());
    } catch {
      toast.error('Erro ao carregar extrato financeiro');
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      setReviews(await ifoodService.getReviews());
    } catch {
      toast.error('Erro ao carregar avaliações');
    }
  }, []);

  const loadReviewSummary = useCallback(async () => {
    try {
      setReviewSummary(await ifoodService.getReviewSummary());
    } catch {
      // Sem resumo ainda (loja sem avaliações) — não é erro pro usuário.
    }
  }, []);

  const loadReconciliation = useCallback(async () => {
    try {
      setReconciliation(await ifoodService.getReconciliation());
    } catch {
      // Sem arquivo de conciliação pro mês — não é erro pro usuário.
    }
  }, []);

  const loadAnticipations = useCallback(async () => {
    try {
      setAnticipations(await ifoodService.getAnticipations());
    } catch {
      toast.error('Erro ao carregar antecipações');
    }
  }, []);

  const loadFinancialEvents = useCallback(async () => {
    try {
      setFinancialEvents(await ifoodService.getFinancialEvents());
    } catch {
      toast.error('Erro ao carregar eventos financeiros');
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalytics(await ifoodService.getAnalytics());
      setAnalyticsForbidden(false);
      setAnalyticsError(null);
    } catch (error) {
      const err = error as { response?: { data?: { forbidden?: boolean; errors?: string[] } } };
      setAnalyticsForbidden(Boolean(err.response?.data?.forbidden));
      setAnalyticsError(err.response?.data?.errors?.[0] ?? null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadStatus(),
      loadOrders(),
      loadInterruptions(),
      loadMerchantDetails(),
      loadCategories(),
      loadMenuItems(),
      loadSettlements(),
      loadReconciliation(),
      loadAnticipations(),
      loadFinancialEvents(),
      loadReviews(),
      loadReviewSummary(),
      loadAnalytics(),
    ]).finally(() => setLoading(false));
  }, [
    loadStatus,
    loadOrders,
    loadInterruptions,
    loadMerchantDetails,
    loadCategories,
    loadMenuItems,
    loadSettlements,
    loadReconciliation,
    loadAnticipations,
    loadFinancialEvents,
    loadReviews,
    loadReviewSummary,
    loadAnalytics,
  ]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      setOrders(await ifoodService.syncOrders());
      toast.success('Pedidos atualizados');
    } catch {
      toast.error('Erro ao sincronizar pedidos com o iFood');
    } finally {
      setSyncing(false);
    }
  };

  const handleOrderAction = async (order: IfoodOrder, action: keyof typeof ACTION_HANDLERS) => {
    setActioningId(order.id);
    try {
      const updated = await ACTION_HANDLERS[action](order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.success('Pedido atualizado');
    } catch {
      toast.error('Erro ao atualizar pedido no iFood');
    } finally {
      setActioningId(null);
    }
  };

  const handleCancel = async (order: IfoodOrder) => {
    setActioningId(order.id);
    try {
      const updated = await ifoodService.cancelOrder(order.id, 'Cancelado pela loja');
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.success('Pedido cancelado');
    } catch {
      toast.error('Erro ao cancelar pedido no iFood');
    } finally {
      setActioningId(null);
    }
  };

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      toast.error('Informe o motivo da pausa');
      return;
    }
    const minutes = Number(pauseMinutes) || 30;
    try {
      await ifoodService.createInterruption(minutes, pauseReason.trim());
      toast.success(`Loja pausada por ${minutes} minutos`);
      setPauseReason('');
      loadInterruptions();
    } catch {
      toast.error('Erro ao pausar a loja');
    }
  };

  const handleRemoveInterruption = async (id: string) => {
    try {
      await ifoodService.deleteInterruption(id);
      toast.success('Pausa removida');
      loadInterruptions();
    } catch {
      toast.error('Erro ao remover pausa');
    }
  };

  const activeInterruption = useMemo(() => {
    const now = Date.now();
    return interruptions.find((i) => new Date(i.start).getTime() <= now && now <= new Date(i.end).getTime());
  }, [interruptions]);

  const handleCloseStore = async () => {
    if (!pauseReason.trim()) {
      toast.error('Informe o motivo do fechamento');
      return;
    }
    setTogglingStore(true);
    try {
      await ifoodService.closeStore(pauseReason.trim());
      toast.success('Loja fechada');
      setPauseReason('');
      setCloseDialogOpen(false);
      loadInterruptions();
      loadStatus();
    } catch {
      toast.error('Erro ao fechar a loja');
    } finally {
      setTogglingStore(false);
    }
  };

  const handleOpenStore = async () => {
    setTogglingStore(true);
    try {
      await ifoodService.openStore();
      toast.success('Loja reaberta');
      loadInterruptions();
      loadStatus();
    } catch {
      toast.error('Erro ao reabrir a loja');
    } finally {
      setTogglingStore(false);
    }
  };

  const handleQuote = async () => {
    setQuoting(true);
    try {
      if (quoteMode === 'pedido') {
        if (!quoteOrderId) {
          toast.error('Escolha o pedido');
          return;
        }
        setQuote(await ifoodService.getDeliveryQuoteForOrder(quoteOrderId));
        setDriverOrderId(quoteOrderId);
      } else {
        const lat = Number(quoteLat.replace(',', '.'));
        const lng = Number(quoteLng.replace(',', '.'));
        if (!lat || !lng) {
          toast.error('Informe latitude e longitude válidas');
          return;
        }
        setQuote(await ifoodService.getDeliveryQuote(lat, lng));
      }
    } catch {
      toast.error('Erro ao cotar entrega — endereço pode estar fora da área de cobertura');
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  };

  const handleUseStoreAddress = () => {
    if (!merchantDetails?.address) return;
    // Endereço vem sem lat/lng dedicados na resposta resumida — este atalho só
    // preenche quando a loja tiver coordenadas cadastradas.
    toast.info('Use "Pedido existente" para cotar sem digitar coordenadas — o endereço da loja não expõe lat/lng por essa rota.');
  };

  const handleCallDriver = async () => {
    if (!quote) {
      toast.error('Cote a entrega primeiro');
      return;
    }
    if (!driverOrderId) {
      toast.error('Escolha o pedido');
      return;
    }
    setCallingDriver(true);
    try {
      await ifoodService.requestDriver(driverOrderId, quote.id);
      toast.success('Entregador solicitado — acompanhe o status do pedido');
    } catch {
      toast.error('Erro ao chamar entregador');
    } finally {
      setCallingDriver(false);
    }
  };

  const handleRespondDispute = async (action: 'accept' | 'reject') => {
    if (!disputeId.trim()) {
      toast.error('Informe o ID da disputa');
      return;
    }
    setRespondingDispute(true);
    try {
      if (action === 'accept') {
        await ifoodService.acceptDispute(disputeId.trim(), disputeReason);
      } else {
        await ifoodService.rejectDispute(disputeId.trim(), disputeReason);
      }
      toast.success(action === 'accept' ? 'Disputa aceita' : 'Disputa recusada');
      setDisputeId('');
    } catch {
      toast.error('Erro ao responder disputa');
    } finally {
      setRespondingDispute(false);
    }
  };

  // Categorias
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: IfoodCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await ifoodService.updateCategory(editingCategory.id, categoryName.trim());
        toast.success('Categoria atualizada');
      } else {
        await ifoodService.createCategory(categoryName.trim());
        toast.success('Categoria criada');
      }
      setCategoryDialogOpen(false);
      loadCategories();
    } catch {
      toast.error(editingCategory ? 'Erro ao editar categoria' : 'Erro ao criar categoria');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirmDeleteCategory) return;
    try {
      await ifoodService.deleteCategory(confirmDeleteCategory.id);
      toast.success('Categoria excluída');
      setConfirmDeleteCategory(null);
      loadCategories();
      loadMenuItems();
    } catch {
      toast.error('Erro ao excluir categoria — remova os produtos dela primeiro');
    }
  };

  // Produtos do cardápio (linha = produto + categoria + preço)
  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (item) =>
        (item.name ?? '').toLowerCase().includes(q) || item.category_name.toLowerCase().includes(q),
    );
  }, [menuItems, menuSearch]);

  const openCreateProduct = () => {
    setProductForm({ ...EMPTY_PRODUCT_FORM, categoryId: categories[0]?.id ?? '' });
    setProductDialogOpen(true);
  };

  const openEditProduct = (item: IfoodMenuItem) => {
    setProductForm({
      itemId: item.item_id,
      name: item.name ?? '',
      description: item.description ?? '',
      categoryId: item.category_id,
      price: item.price != null ? String(item.price) : '',
      status: item.status,
      currentPrice: item.price,
    });
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim() || !productForm.categoryId) {
      toast.error('Preencha nome e categoria');
      return;
    }
    const priceValue = parseFloat(productForm.price.replace(',', '.'));
    if (Number.isNaN(priceValue)) {
      toast.error('Informe um preço válido');
      return;
    }
    setSavingProduct(true);
    try {
      if (productForm.itemId) {
        const current = menuItems.find((i) => i.item_id === productForm.itemId);
        if (!current) throw new Error('not found');
        await ifoodService.updateMenuItem(productForm.itemId, {
          categoryId: productForm.categoryId,
          productId: current.product_id,
          name: productForm.name.trim(),
          description: productForm.description.trim() || undefined,
          priceValue,
          currentPrice: current.price ?? undefined,
          status: productForm.status,
        });
        toast.success('Produto atualizado');
      } else {
        const product = await ifoodService.createProduct(productForm.name.trim(), productForm.description.trim() || undefined);
        await ifoodService.createItem(product.id, productForm.categoryId, priceValue);
        toast.success('Produto adicionado ao cardápio');
      }
      setProductDialogOpen(false);
      loadMenuItems();
    } catch {
      toast.error('Erro ao salvar produto');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!confirmDeleteItem) return;
    try {
      await ifoodService.deleteMenuItem(confirmDeleteItem.item_id, confirmDeleteItem.category_id, confirmDeleteItem.product_id);
      toast.success('Produto removido do cardápio');
      setConfirmDeleteItem(null);
      loadMenuItems();
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleSendReply = async () => {
    if (!replyingReviewId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await ifoodService.replyReview(replyingReviewId, replyText.trim());
      toast.success('Resposta enviada');
      setReplyingReviewId(null);
      setReplyText('');
      loadReviews();
    } catch {
      toast.error('Erro ao enviar resposta');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
        <BaseHeader title="Pedidos iFood" subtitle="Integração com o iFood." />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
        <BaseHeader title="Pedidos iFood" subtitle="Integração com o iFood." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              Integração pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Credenciais do iFood ainda não configuradas nesta instalação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader title="Pedidos iFood" subtitle="Integração com o iFood." />

      <Card>
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{status.merchant_name}</p>
            <p className="text-xs text-muted-foreground">ID: {status.merchant_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status.available ? 'default' : 'outline'}>
              {status.available ? 'Loja aberta' : status.status_message || 'Loja fechada'}
            </Badge>
            {status.available ? (
              <Button size="sm" variant="outline" disabled={togglingStore} onClick={() => setCloseDialogOpen(true)}>
                <DoorClosed className="w-4 h-4 mr-2" /> Fechar loja
              </Button>
            ) : (
              <Button size="sm" disabled={togglingStore} onClick={handleOpenStore}>
                <DoorOpen className="w-4 h-4 mr-2" /> Reabrir loja
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 border-b border-border pb-2 flex-wrap">
        {([
          ['pedidos', 'Pedidos'],
          ['status', 'Status & Pausas'],
          ['cardapio', 'Cardápio'],
          ['entrega', 'Entrega'],
          ['disputas', 'Disputas'],
          ['financeiro', 'Financeiro'],
          ['analytics', 'Analytics'],
          ['avaliacoes', 'Avaliações'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pedidos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum pedido do iFood ainda.
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const next = NEXT_ACTION[order.status];
              const canCancel = CANCELABLE_STATUSES.includes(order.status);
              const busy = actioningId === order.id;
              return (
                <Card key={order.id}>
                  <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        Pedido #{order.display_id || order.ifood_order_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_name || 'Cliente não identificado'} · {order.items_count}{' '}
                        {order.items_count === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{order.status}</Badge>
                      <span className="font-semibold">{formatCurrency(order.total_price)}</span>
                      {next && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => handleOrderAction(order, next.action)}
                        >
                          {next.label}
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => handleCancel(order)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === 'status' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="w-4 h-4" /> Dados da loja
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Nome fantasia: </span>
                <span className="font-medium">{merchantDetails?.name ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Razão social: </span>
                <span className="font-medium">{merchantDetails?.corporate_name ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Merchant ID: </span>
                <span className="font-mono text-xs">{merchantDetails?.merchant_id ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Operação: </span>
                <span className="font-medium">
                  {merchantDetails?.operations?.map((o) => o.name).join(', ') || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Endereço: </span>
                <span className="font-medium">
                  {merchantDetails?.address
                    ? `${merchantDetails.address.street ?? ''}, ${merchantDetails.address.number ?? ''} — ${
                        merchantDetails.address.city ?? ''
                      }/${merchantDetails.address.state ?? ''}`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tempo médio de preparo: </span>
                <span className="font-medium">
                  {merchantDetails?.preparation_time_minutes != null
                    ? `${merchantDetails.preparation_time_minutes} min`
                    : 'não configurado (defina pelo Portal do Parceiro)'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PauseCircle className="w-4 h-4" /> Pausar loja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={pauseMinutes}
                  onChange={(e) => setPauseMinutes(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
                <Button size="sm" onClick={handlePause}>
                  Pausar
                </Button>
              </div>
              <Input
                placeholder="Motivo da pausa (obrigatório)"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            {interruptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pausa ativa.</p>
            ) : (
              interruptions.map((i) => (
                <Card key={i.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{i.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(i.start).toLocaleString('pt-BR')} → {new Date(i.end).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveInterruption(i.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'cardapio' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto ou categoria..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openCreateCategory}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar categoria
              </Button>
              <Button size="sm" onClick={openCreateProduct} disabled={categories.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar produto
              </Button>
            </div>
          </div>

          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Crie uma categoria antes de adicionar produtos.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-1 border rounded-full pl-3 pr-1 py-1 bg-muted/30">
                <span className="text-xs font-medium">{cat.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCategory(cat)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDeleteCategory(cat)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {filteredMenuItems.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-md">
              Nenhum produto no cardápio ainda.
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Preço</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMenuItems.map((item) => (
                    <tr key={item.item_id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">
                        {item.name}
                        {item.description && (
                          <p className="text-xs text-muted-foreground font-normal">{item.description}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{item.category_name}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.price != null ? formatCurrency(item.price) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={item.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                          {item.status === 'AVAILABLE' ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => openEditProduct(item)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDeleteItem(item)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'entrega' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            A cotação da API oficial do iFood (Shipping) pede latitude/longitude do destino — mas
            se já existe um pedido sincronizado, dá pra cotar direto por ele, sem digitar
            coordenadas (o iFood resolve o endereço de entrega automaticamente).
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className="w-4 h-4" /> Cotar entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={quoteMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setQuoteMode('manual')}
                >
                  Latitude/Longitude
                </Button>
                <Button
                  size="sm"
                  variant={quoteMode === 'pedido' ? 'default' : 'outline'}
                  onClick={() => setQuoteMode('pedido')}
                >
                  Pedido existente
                </Button>
              </div>

              {quoteMode === 'manual' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Latitude"
                    value={quoteLat}
                    onChange={(e) => setQuoteLat(e.target.value)}
                    className="w-40"
                  />
                  <Input
                    placeholder="Longitude"
                    value={quoteLng}
                    onChange={(e) => setQuoteLng(e.target.value)}
                    className="w-40"
                  />
                  {merchantDetails?.address && (
                    <Button size="sm" variant="ghost" onClick={handleUseStoreAddress}>
                      Usar endereço da loja
                    </Button>
                  )}
                  <Button size="sm" onClick={handleQuote} disabled={quoting}>
                    {quoting ? 'Cotando...' : 'Cotar'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={quoteOrderId}
                    onChange={(e) => setQuoteOrderId(e.target.value)}
                    className="flex-1 min-w-[240px] h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione o pedido...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.display_id || o.ifood_order_id.slice(0, 8)} — {o.customer_name || 'Cliente'}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleQuote} disabled={quoting}>
                    {quoting ? 'Cotando...' : 'Cotar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {quote && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Válido até {new Date(quote.expirationAt).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {formatCurrency(quote.quote.netValue)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <select
                    value={driverOrderId}
                    onChange={(e) => setDriverOrderId(e.target.value)}
                    className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">Selecione o pedido...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.display_id || o.ifood_order_id.slice(0, 8)} — {o.customer_name || 'Cliente'}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleCallDriver} disabled={callingDriver}>
                    <Bike className="w-4 h-4 mr-2" /> Chamar entregador
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'disputas' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Responda disputas pós-entrega abertas pelo cliente (Handshake Platform). Informe o ID
            da disputa recebido no evento HANDSHAKE_DISPUTE ao sincronizar pedidos.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4" /> Responder disputa
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="ID da disputa"
                value={disputeId}
                onChange={(e) => setDisputeId(e.target.value)}
                className="w-64"
              />
              <Input
                placeholder="Motivo (ex: CUSTOMER_SATISFACTION)"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-64"
              />
              <Button size="sm" onClick={() => handleRespondDispute('accept')} disabled={respondingDispute}>
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRespondDispute('reject')}
                disabled={respondingDispute}
              >
                Recusar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'financeiro' && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Extrato dos últimos 7 dias (repasses via Conciliator). Vendas detalhadas ficam
            limitadas pelo iFood a janelas de no máximo 8 dias por consulta.
          </p>
          <Card>
            <CardContent className="py-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {settlements ? `${settlements.beginDate} → ${settlements.endDate}` : '—'}
              </span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(settlements?.balance ?? 0)}
              </span>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {!settlements?.settlements?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum repasse no período.</p>
            ) : (
              settlements.settlements.map((s, idx) => (
                <Card key={idx}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <span className="text-sm">{s.expectedPaymentDate || '—'}</span>
                    <span className="font-semibold">{formatCurrency(s.netValue ?? 0)}</span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Antecipações (últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent className="py-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {anticipations ? `${anticipations.beginDate} → ${anticipations.endDate}` : '—'}
              </span>
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(anticipations?.balance ?? 0)}
              </span>
            </CardContent>
          </Card>
          {!anticipations?.settlements?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma antecipação no período.</p>
          ) : (
            <div className="space-y-2">
              {anticipations.settlements.map((s, idx) => (
                <Card key={idx}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <span className="text-sm">{s.expectedPaymentDate || '—'}</span>
                    <span className="font-semibold">{formatCurrency(s.netValue ?? 0)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conciliação do mês</CardTitle>
            </CardHeader>
            <CardContent>
              {reconciliation ? (
                <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(reconciliation, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum arquivo de conciliação gerado pro mês atual ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eventos financeiros (últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {financialEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento financeiro no período.</p>
              ) : (
                <div className="space-y-2">
                  {financialEvents.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm border-b border-border py-2 last:border-0">
                      <span>{ev.eventName || '—'}</span>
                      <span className="text-muted-foreground">{ev.date}</span>
                      <span className="font-semibold">{ev.value != null ? formatCurrency(ev.value) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> KPIs de pedidos (últimos 30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsForbidden ? (
                <p className="text-sm text-muted-foreground">
                  O iFood bloqueou o acesso (403) — as credenciais desta loja ainda não têm o
                  escopo <span className="font-mono">analytics</span> liberado. Isso não é um bug
                  daqui: precisa solicitar esse escopo ao iFood (geralmente via homologação/suporte
                  do parceiro) antes de conseguir ver esses dados.
                </p>
              ) : analyticsError ? (
                <p className="text-sm text-muted-foreground">Erro ao carregar: {analyticsError}</p>
              ) : (
                <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-x-auto">
                  {JSON.stringify(analytics, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'avaliacoes' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="text-xl font-bold text-foreground">
                  {reviewSummary?.averageRating != null ? reviewSummary.averageRating.toFixed(1) : '—'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {reviewSummary?.totalReviews != null
                  ? `${reviewSummary.totalReviews} avaliações`
                  : 'Sem avaliações ainda'}
              </span>
            </CardContent>
          </Card>

          {!reviews?.reviews?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma avaliação ainda.
              </CardContent>
            </Card>
          ) : (
            reviews.reviews.map((r, idx) => (
              <Card key={idx}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold">{r.score ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">{r.createdAt}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  {r.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyingReviewId(r.id!);
                        setReplyText('');
                      }}
                    >
                      Responder
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Fechar loja agora */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar loja agora</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="close-reason">Motivo (obrigatório)</Label>
            <Input
              id="close-reason"
              placeholder="Ex: sem entregadores disponíveis"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)} disabled={togglingStore}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseStore} disabled={togglingStore}>
              {togglingStore ? 'Fechando...' : 'Fechar loja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar/editar categoria */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input id="cat-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} disabled={savingCategory}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={savingCategory}>
              {savingCategory ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir categoria */}
      <Dialog open={Boolean(confirmDeleteCategory)} onOpenChange={(open) => !open && setConfirmDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir "{confirmDeleteCategory?.name}"? Produtos vinculados a ela também somem do cardápio.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteCategory(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar/editar produto do cardápio */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{productForm.itemId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name">Nome</Label>
              <Input
                id="prod-name"
                value={productForm.name}
                onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prod-desc">Descrição</Label>
              <Textarea
                id="prod-desc"
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={productForm.categoryId}
                onValueChange={(v) => setProductForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Preço</Label>
                <Input
                  id="prod-price"
                  placeholder="19.90"
                  value={productForm.price}
                  onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={productForm.status} onValueChange={(v) => setProductForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Disponível</SelectItem>
                    <SelectItem value="UNAVAILABLE">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)} disabled={savingProduct}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={savingProduct}>
              {savingProduct ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir produto */}
      <Dialog open={Boolean(confirmDeleteItem)} onOpenChange={(open) => !open && setConfirmDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir produto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir "{confirmDeleteItem?.name}" do cardápio?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteItem(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteMenuItem}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responder avaliação */}
      <Dialog open={Boolean(replyingReviewId)} onOpenChange={(open) => !open && setReplyingReviewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder avaliação</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Sua resposta..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyingReviewId(null)} disabled={sendingReply}>
              Cancelar
            </Button>
            <Button onClick={handleSendReply} disabled={sendingReply}>
              {sendingReply ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
