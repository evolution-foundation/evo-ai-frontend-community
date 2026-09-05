import { useCallback, useEffect, useState } from 'react';
import { Bike, RefreshCw, Loader2, DoorOpen, DoorClosed, PauseCircle, Settings2, Save, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Label } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { ninetyNineService } from '@/services/orders/ninetyNineService';
import type { NinetyNineOrder, NinetyNineWebhookInfo } from '@/types/orders/ninetyNineOrder';
import type {
  NinetyNinePartnerStatus,
  NinetyNineStoreDetails,
  NinetyNineMenuItem,
  NinetyNineBillEntry,
  NinetyNineSettlement,
  NinetyNineBoundStore,
} from '@/types/orders/ninetyNinePartner';

type Tab = 'pedidos' | 'status' | 'cardapio' | 'financeiro';

const CANCEL_REASONS = [
  { code: 1, label: 'Cliente cancelou manualmente' },
  { code: 101, label: 'Loja cancelou manualmente' },
  { code: 103, label: 'Loja fora do horário de operação' },
];

const PAUSE_REASONS = [
  { code: 1001, label: 'Falha de equipamento / falta de energia' },
  { code: 1002, label: 'Ausência temporária de funcionários' },
  { code: 1003, label: 'Ingredientes insuficientes' },
  { code: 1004, label: 'Perto do horário de fechamento' },
  { code: 1005, label: 'Excesso de pedidos no salão' },
  { code: 1006, label: 'Outro motivo' },
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function bizStatusLabel(status?: number) {
  return { 1: 'Loja aberta', 2: 'Loja fechada', 3: 'Pausada', 4: 'Reabrindo' }[status || 0] || 'Desconhecido';
}

interface ConfigForm {
  NINETY_NINE_STORE_ID: string;
  NINETY_NINE_CLIENT_ID: string;
  NINETY_NINE_CLIENT_SECRET: string;
}

const EMPTY_CONFIG: ConfigForm = { NINETY_NINE_STORE_ID: '', NINETY_NINE_CLIENT_ID: '', NINETY_NINE_CLIENT_SECRET: '' };

function isMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function todayYYYYMMDD(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export default function NinetyNineOrdersPage() {
  const [tab, setTab] = useState<Tab>('pedidos');

  const [info, setInfo] = useState<NinetyNineWebhookInfo | null>(null);
  const [orders, setOrders] = useState<NinetyNineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [partnerStatus, setPartnerStatus] = useState<NinetyNinePartnerStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [storeDetails, setStoreDetails] = useState<NinetyNineStoreDetails | null>(null);
  const [loadingStore, setLoadingStore] = useState(false);
  const [togglingStore, setTogglingStore] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState(PAUSE_REASONS[0].code);
  const [pauseMinutes, setPauseMinutes] = useState<1 | 2 | 3 | 4>(1);

  const [menuItems, setMenuItems] = useState<NinetyNineMenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusValue, setEditingStatusValue] = useState('');

  const [billStart, setBillStart] = useState(todayYYYYMMDD(-7));
  const [billEnd, setBillEnd] = useState(todayYYYYMMDD());
  const [billEntries, setBillEntries] = useState<NinetyNineBillEntry[] | null>(null);
  const [settlements, setSettlements] = useState<NinetyNineSettlement[] | null>(null);
  const [loadingFinance, setLoadingFinance] = useState(false);

  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<ConfigForm>(EMPTY_CONFIG);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [secretModified, setSecretModified] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [boundStores, setBoundStores] = useState<NinetyNineBoundStore[] | null>(null);
  const [loadingBoundStores, setLoadingBoundStores] = useState(false);
  const [selectingStoreId, setSelectingStoreId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [webhookInfo, ordersList] = await Promise.all([
        ninetyNineService.getWebhookInfo(),
        ninetyNineService.getOrders(),
      ]);
      setInfo(webhookInfo);
      setOrders(ordersList);
    } catch {
      toast.error('Erro ao carregar dados do webhook da 99');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const data = await ninetyNineService.getPartnerStatus();
      setPartnerStatus(data);
    } catch {
      toast.error('Erro ao verificar conexão com a API da 99Food.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // --- Status da loja --------------------------------------------------

  const loadStoreDetails = useCallback(async () => {
    setLoadingStore(true);
    try {
      const data = await ninetyNineService.getStoreDetails();
      setStoreDetails(data);
    } catch {
      toast.error('Erro ao carregar dados da loja na 99Food.');
    } finally {
      setLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'status' && partnerStatus?.connected) loadStoreDetails();
  }, [tab, partnerStatus?.connected, loadStoreDetails]);

  const handleSetStoreStatus = async (payload: Record<string, unknown>) => {
    setTogglingStore(true);
    try {
      await ninetyNineService.setStoreStatus(payload);
      toast.success('Status da loja atualizado.');
      setPauseDialogOpen(false);
      await loadStoreDetails();
    } catch {
      toast.error('Erro ao atualizar status da loja.');
    } finally {
      setTogglingStore(false);
    }
  };

  // --- Cardápio ----------------------------------------------------------

  const loadMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const data = await ninetyNineService.getMenu();
      setMenuItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar o cardápio da 99Food.');
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'cardapio' && partnerStatus?.connected) loadMenu();
  }, [tab, partnerStatus?.connected, loadMenu]);

  const startEditStatus = (item: NinetyNineMenuItem) => {
    setEditingStatusId(item.item_id);
    setEditingStatusValue(item.status);
  };

  const saveItemStatus = async (itemId: string) => {
    try {
      await ninetyNineService.updateItemStatus(itemId, editingStatusValue);
      toast.success('Status do item atualizado.');
      setEditingStatusId(null);
      await loadMenu();
    } catch {
      toast.error('Erro ao atualizar status do item.');
    }
  };

  // --- Pedidos: ações reais ----------------------------------------------

  const runOrderAction = async (order: NinetyNineOrder, action: () => Promise<unknown>, successMsg: string) => {
    setActioningId(order.id);
    try {
      await action();
      toast.success(successMsg);
      await load();
    } catch {
      toast.error('Erro ao executar ação na 99Food. Confira se o pedido ainda existe na API.');
    } finally {
      setActioningId(null);
    }
  };

  // --- Financeiro -------------------------------------------------------

  const handleLoadBill = async () => {
    setLoadingFinance(true);
    try {
      const result = await ninetyNineService.getBillData(billStart, billEnd);
      setBillEntries(result.data || []);
    } catch {
      toast.error('Erro ao carregar faturamento. Confira se o período não passa de 31 dias.');
    } finally {
      setLoadingFinance(false);
    }
  };

  const handleLoadSettlements = async () => {
    setLoadingFinance(true);
    try {
      const result = await ninetyNineService.getSettlementsData(billStart, billEnd);
      setSettlements(result.data || []);
    } catch {
      toast.error('Erro ao carregar repasses. Confira se o período não passa de 31 dias.');
    } finally {
      setLoadingFinance(false);
    }
  };

  // --- Configuração de credenciais ---

  const openConfig = async () => {
    setConfigOpen(true);
    try {
      const data = await adminConfigService.getConfig('ninety_nine');
      setConfig({
        NINETY_NINE_STORE_ID: typeof data.NINETY_NINE_STORE_ID === 'string' ? data.NINETY_NINE_STORE_ID : '',
        NINETY_NINE_CLIENT_ID: typeof data.NINETY_NINE_CLIENT_ID === 'string' ? data.NINETY_NINE_CLIENT_ID : '',
        NINETY_NINE_CLIENT_SECRET: '',
      });
      setSecretConfigured(isMasked(data.NINETY_NINE_CLIENT_SECRET));
      setSecretModified(false);
    } catch {
      toast.error('Erro ao carregar configuração da 99Food.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: Record<string, string | null> = {
        NINETY_NINE_STORE_ID: config.NINETY_NINE_STORE_ID,
        NINETY_NINE_CLIENT_ID: config.NINETY_NINE_CLIENT_ID,
      };
      if (secretModified) payload.NINETY_NINE_CLIENT_SECRET = config.NINETY_NINE_CLIENT_SECRET || null;

      await adminConfigService.saveConfig('ninety_nine', payload);
      toast.success('Credenciais salvas! Agora conecte a loja abaixo.');
      setSecretModified(false);
      await loadStatus();
    } catch {
      toast.error('Erro ao salvar configuração da 99Food.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConnectStore = async () => {
    setConnecting(true);
    try {
      const url = await ninetyNineService.getConnectUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Abrimos a página da 99Food numa nova aba. Faça login e autorize a loja lá.');
    } catch {
      toast.error('Erro ao gerar o link de autorização. Salve o App ID/Secret primeiro.');
    } finally {
      setConnecting(false);
    }
  };

  const handleFetchBoundStores = async () => {
    setLoadingBoundStores(true);
    try {
      const stores = await ninetyNineService.getBoundStores();
      setBoundStores(stores);
      if (stores.length === 0) toast('Nenhuma loja vinculada ainda. Autorize uma loja primeiro (botão Conectar Loja).');
    } catch {
      toast.error('Erro ao buscar lojas vinculadas.');
    } finally {
      setLoadingBoundStores(false);
    }
  };

  const handleSelectStore = async (store: NinetyNineBoundStore) => {
    setSelectingStoreId(store.app_shop_id);
    try {
      await adminConfigService.saveConfig('ninety_nine', { NINETY_NINE_STORE_ID: store.app_shop_id });
      toast.success(`Loja "${store.shop_name}" conectada com sucesso!`);
      setConfigOpen(false);
      setBoundStores(null);
      await loadStatus();
    } catch {
      toast.error('Erro ao salvar a loja selecionada.');
    } finally {
      setSelectingStoreId(null);
    }
  };

  const inputClass =
    'w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader title="99 Delivery" subtitle="Integração com a 99Food: recebimento de pedidos e API oficial de parceiros." />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {loadingStatus ? (
            <span className="text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando conexão...
            </span>
          ) : partnerStatus?.connected ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> API conectada
              {partnerStatus.store_id ? ` · Loja ${partnerStatus.store_id}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> API não configurada
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={openConfig}>
          <Settings2 className="w-4 h-4 mr-2" /> Configurar API
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-border pb-2 flex-wrap">
        {(
          [
            ['pedidos', 'Pedidos'],
            ['status', 'Status da Loja'],
            ['cardapio', 'Cardápio'],
            ['financeiro', 'Financeiro'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
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
        <>
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando...</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bike className="w-4 h-4" /> URL do webhook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    A 99 envia os pedidos automaticamente por webhook (evento <code>orderNew</code>). Cadastre a URL
                    abaixo no painel de parceiros da 99Food.
                  </p>
                  <code className="block text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto whitespace-nowrap">
                    {info?.webhook_url}
                  </code>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{info?.orders_received ?? 0} evento(s) recebido(s)</p>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>

              <div className="space-y-3">
                {orders.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum pedido da 99 recebido ainda.
                    </CardContent>
                  </Card>
                ) : (
                  orders.map((order) => {
                    const busy = actioningId === order.id;
                    const orderId = order.external_order_id || order.id;
                    return (
                      <Card key={order.id}>
                        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {order.external_order_id ? `Pedido #${order.external_order_id}` : 'Pedido recebido'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.customer_name || 'Cliente não identificado'} · {order.items_count}{' '}
                              {order.items_count === 1 ? 'item' : 'itens'} · {new Date(order.received_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.status && <Badge variant="outline">{order.status}</Badge>}
                            {order.total_price != null && <span className="font-semibold">{formatCurrency(order.total_price)}</span>}
                            {partnerStatus?.connected && order.external_order_id && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => runOrderAction(order, () => ninetyNineService.confirmOrder(orderId), 'Pedido confirmado na 99Food.')}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => runOrderAction(order, () => ninetyNineService.readyOrder(orderId), 'Pedido marcado como pronto.')}
                                >
                                  Pronto
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => runOrderAction(order, () => ninetyNineService.deliveredOrder(orderId), 'Pedido marcado como entregue.')}
                                >
                                  Entregue
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  disabled={busy}
                                  onClick={() =>
                                    runOrderAction(
                                      order,
                                      () => ninetyNineService.cancelOrder(orderId, CANCEL_REASONS[1].code, 'Cancelado pela loja'),
                                      'Pedido cancelado na 99Food.',
                                    )
                                  }
                                >
                                  Cancelar
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'status' && (
        <div className="space-y-4">
          {!partnerStatus?.connected ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Configure a API (botão acima) pra ver e controlar o status real da loja.
              </CardContent>
            </Card>
          ) : loadingStore ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando dados da loja...</CardContent>
            </Card>
          ) : storeDetails ? (
            <Card>
              <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{storeDetails.name}</p>
                  <p className="text-xs text-muted-foreground">{storeDetails.addr}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={storeDetails.biz_status === 1 ? 'default' : 'outline'}>{bizStatusLabel(storeDetails.biz_status)}</Badge>
                  {storeDetails.biz_status === 1 ? (
                    <>
                      <Button size="sm" variant="outline" disabled={togglingStore} onClick={() => setPauseDialogOpen(true)}>
                        <PauseCircle className="w-4 h-4 mr-2" /> Pausar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingStore}
                        onClick={() => handleSetStoreStatus({ store_status: 2 })}
                      >
                        <DoorClosed className="w-4 h-4 mr-2" /> Fechar loja
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" disabled={togglingStore} onClick={() => handleSetStoreStatus({ store_status: 1 })}>
                      <DoorOpen className="w-4 h-4 mr-2" /> Abrir loja
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Não foi possível carregar os dados da loja.</CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'cardapio' && (
        <div className="space-y-4">
          {!partnerStatus?.connected ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Configure a API (botão acima) pra ver o cardápio real da loja.
              </CardContent>
            </Card>
          ) : loadingMenu ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando cardápio...</CardContent>
            </Card>
          ) : menuItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado no cardápio.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Card key={item.item_id}>
                  <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category_name} {item.price != null ? `· ${formatCurrency(item.price / 100)}` : ''}
                      </p>
                    </div>
                    {editingStatusId === item.item_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className={`${inputClass} w-40`}
                          value={editingStatusValue}
                          onChange={(e) => setEditingStatusValue(e.target.value)}
                        />
                        <Button size="sm" onClick={() => saveItemStatus(item.item_id)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingStatusId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="cursor-pointer" onClick={() => startEditStatus(item)}>
                        {item.status}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'financeiro' && (
        <div className="space-y-4">
          {!partnerStatus?.connected ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Configure a API (botão acima) pra consultar faturamento e repasses reais.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardContent className="py-4 flex flex-wrap items-end gap-3">
                  <div>
                    <Label className={labelClass}>Data inicial (AAAAMMDD)</Label>
                    <input className={inputClass} value={billStart} onChange={(e) => setBillStart(e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelClass}>Data final (AAAAMMDD)</Label>
                    <input className={inputClass} value={billEnd} onChange={(e) => setBillEnd(e.target.value)} />
                  </div>
                  <Button variant="outline" size="sm" disabled={loadingFinance} onClick={handleLoadBill}>
                    <Wallet className="w-4 h-4 mr-2" /> Buscar Faturamento
                  </Button>
                  <Button variant="outline" size="sm" disabled={loadingFinance} onClick={handleLoadSettlements}>
                    <Wallet className="w-4 h-4 mr-2" /> Buscar Repasses
                  </Button>
                  <p className="text-[11px] text-gray-400 w-full">Período máximo de 31 dias.</p>
                </CardContent>
              </Card>

              {billEntries && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Faturamento ({billEntries.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="py-1 pr-3">Pedido</th>
                          <th className="py-1 pr-3">Data</th>
                          <th className="py-1 pr-3">Valor Pedido</th>
                          <th className="py-1 pr-3">Comissão</th>
                          <th className="py-1 pr-3">Repasse</th>
                          <th className="py-1 pr-3">Previsão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {billEntries.map((b, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 pr-3 font-mono text-xs">{b.orderId}</td>
                            <td className="py-1.5 pr-3">{b.businessDateTime}</td>
                            <td className="py-1.5 pr-3">{formatCurrency((b.orderAmount || 0) / 100)}</td>
                            <td className="py-1.5 pr-3">{formatCurrency((b.commissionAmount || 0) / 100)}</td>
                            <td className="py-1.5 pr-3 font-semibold">{formatCurrency((b.settlementAmount || 0) / 100)}</td>
                            <td className="py-1.5 pr-3">{b.expectSettleDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {settlements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Repasses ({settlements.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-muted-foreground border-b">
                        <tr>
                          <th className="py-1 pr-3">ID do Repasse</th>
                          <th className="py-1 pr-3">Período</th>
                          <th className="py-1 pr-3">Data de Pagamento</th>
                          <th className="py-1 pr-3">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {settlements.map((s, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 pr-3 font-mono text-xs">{s.weekPaymentId}</td>
                            <td className="py-1.5 pr-3">
                              {s.settleStartDate} – {s.settleEndDate}
                            </td>
                            <td className="py-1.5 pr-3">{s.withdrawDate}</td>
                            <td className="py-1.5 pr-3 font-semibold">{formatCurrency((s.withdrawAmount || 0) / 100)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* --- MODAL: PAUSAR LOJA --- */}
      {pauseDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPauseDialogOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-800">Pausar loja</h2>
              <button onClick={() => setPauseDialogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Label className={labelClass}>Motivo</Label>
                <select className={inputClass} value={pauseReason} onChange={(e) => setPauseReason(Number(e.target.value))}>
                  {PAUSE_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className={labelClass}>Duração</Label>
                <select className={inputClass} value={pauseMinutes} onChange={(e) => setPauseMinutes(Number(e.target.value) as 1 | 2 | 3 | 4)}>
                  <option value={1}>10 minutos</option>
                  <option value={2}>20 minutos</option>
                  <option value={3}>30 minutos</option>
                  <option value={4}>Até o fim do dia</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPauseDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={togglingStore}
                  onClick={() =>
                    handleSetStoreStatus({ store_status: 3, pause_reason_code: pauseReason, pause_time: pauseMinutes })
                  }
                >
                  {togglingStore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Pausar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIGURAR API --- */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfigOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-800">Configurar API da 99Food</h2>
              <button onClick={() => setConfigOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto">
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <p className="text-xs text-gray-500">
                  Pegue o App ID e o App Secret em Gerenciamento de Aplicativo, no portal de parceiros da 99Food.
                </p>
                <div>
                  <Label className={labelClass}>App ID</Label>
                  <input
                    className={inputClass}
                    value={config.NINETY_NINE_CLIENT_ID}
                    onChange={(e) => setConfig({ ...config, NINETY_NINE_CLIENT_ID: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-medium text-gray-700">App Secret</Label>
                    {secretConfigured && !config.NINETY_NINE_CLIENT_SECRET && (
                      <span className="text-[10px] text-green-600">Configurado</span>
                    )}
                  </div>
                  <input
                    type="password"
                    autoComplete="off"
                    className={inputClass}
                    value={config.NINETY_NINE_CLIENT_SECRET}
                    onChange={(e) => {
                      setConfig({ ...config, NINETY_NINE_CLIENT_SECRET: e.target.value });
                      setSecretModified(e.target.value.length > 0);
                    }}
                    placeholder={secretConfigured ? '••••••••' : ''}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingConfig}>
                    {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar credenciais
                  </Button>
                </div>
              </form>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conectar a loja</p>
                <p className="text-xs text-gray-500">
                  Igual ao login do Google: gera um link, você abre, faz login na 99Food e autoriza a loja. Depois é só
                  buscar a lista e escolher.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={connecting} onClick={handleConnectStore}>
                    {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Conectar Loja
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={loadingBoundStores} onClick={handleFetchBoundStores}>
                    {loadingBoundStores && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Buscar Lojas Vinculadas
                  </Button>
                </div>

                {boundStores && (
                  <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {boundStores.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3">Nenhuma loja vinculada ainda.</p>
                    ) : (
                      boundStores.map((store) => (
                        <button
                          key={store.shop_id}
                          type="button"
                          disabled={selectingStoreId === store.app_shop_id}
                          onClick={() => handleSelectStore(store)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 ${
                            config.NINETY_NINE_STORE_ID === store.app_shop_id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-800">{store.shop_name}</p>
                            <p className="text-[11px] text-gray-400">app_shop_id: {store.app_shop_id}</p>
                          </div>
                          {selectingStoreId === store.app_shop_id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : config.NINETY_NINE_STORE_ID === store.app_shop_id ? (
                            <span className="text-[11px] text-blue-600 font-medium">Selecionada</span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Selecionar</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
