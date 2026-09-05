import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, ShoppingCart, X, Plus, Minus, Trash2, Search } from 'lucide-react';
import { menuService, PublicMenu, PublicMenuProduct } from '@/services/public/menuService';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const CART_STORAGE_KEY = 'cardapio-digital-cart';

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDITO', label: 'Crédito' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
];

const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
}

// Máscara com DDD + código do país: se o cliente digitar só DDD+número (11
// dígitos), assume que faltou o "55" e completa automaticamente.
function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11) digits = `55${digits}`;
  digits = digits.slice(0, 13);
  const cc = digits.slice(0, 2);
  const ddd = digits.slice(2, 4);
  const line = digits.slice(4);
  let out = cc;
  if (ddd) out += ` ${ddd}`;
  if (line) out += line.length > 4 ? ` ${line.slice(0, line.length - 4)}-${line.slice(-4)}` : ` ${line}`;
  return out;
}

function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function buildWhatsappLink(rawNumber?: string | null, text?: string): string | null {
  if (!rawNumber) return null;
  let digits = rawNumber.replace(/\D/g, '');
  if (digits.length <= 11) digits = `55${digits}`;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Mesmo resumo que o backend manda pro WhatsApp (DigitalMenu::OrderNotificationService#build_template),
// montado no cliente pra usar como mensagem pré-escrita no fallback "enviar
// você mesmo" quando o envio automático via API falha.
function buildOrderMessageText(
  customer: { fullName: string; phone: string; address: string; number: string; neighborhood: string; city: string; state: string },
  items: Array<{ name: string; price: number; quantity: number }>,
  paymentMethod: string,
  notes: string,
  total: number,
  currency: string,
): string {
  const lines: string[] = ['🛎️ Novo pedido - Cardápio Digital', ''];
  lines.push(`Cliente: ${customer.fullName}`);
  lines.push(`Telefone: ${customer.phone}`);
  let address = `${customer.address}, ${customer.number}`;
  if (customer.neighborhood) address += ` - ${customer.neighborhood}`;
  lines.push(`Endereço: ${address}`);
  if (customer.city) lines.push(`Cidade: ${customer.city}/${customer.state}`);
  lines.push('', 'Itens:');
  items.forEach((item) => {
    lines.push(`• ${item.quantity}x ${item.name} — ${formatCurrency(item.price * item.quantity, currency)}`);
  });
  lines.push('', `Total: ${formatCurrency(total, currency)}`, `Pagamento: ${paymentMethod}`);
  if (notes) lines.push(`Observações: ${notes}`);
  return lines.join('\n');
}

// Mesmo esquema de tracking usado nos templates de Sites: cookie
// `trackingProfile` (90 dias) acumulando utm_source/utm_medium/utm_campaign/
// utm_term/utm_content/gclid/fbclid/ttclid, enriquecendo todo evento
// mandado pro dataLayer via pushToDataLayer().
const TRACKING_COOKIE = 'trackingProfile';
const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid'];

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

function loadTrackingProfile(): Record<string, string> {
  const existing = getCookie(TRACKING_COOKIE);
  const existingParams: Record<string, string> = existing ? JSON.parse(existing) : {};

  const params = new URLSearchParams(window.location.search);
  const newParams: Record<string, string> = {};
  TRACKING_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) newParams[key] = value;
  });

  const trackingProfile = { ...existingParams, ...newParams };
  if (Object.keys(newParams).length > 0) {
    setCookie(TRACKING_COOKIE, JSON.stringify(trackingProfile), 90);
  }
  return trackingProfile;
}

function pushToDataLayer(eventObject: Record<string, unknown>, trackingProfile: Record<string, string>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ...eventObject,
    tracking_properties: trackingProfile,
    page_url: window.location.href,
  });
}

interface CartLine {
  product: PublicMenuProduct;
  quantity: number;
}

interface CheckoutFormData {
  fullName: string;
  cpf: string;
  birthDate: string;
  gender: string;
  phone: string;
  instagram: string;
  email: string;
  zip: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  paymentMethod: string;
  changeFor: string;
  notes: string;
}

const EMPTY_CHECKOUT_FORM: CheckoutFormData = {
  fullName: '',
  cpf: '',
  birthDate: '',
  gender: '',
  phone: '',
  instagram: '',
  email: '',
  zip: '',
  address: '',
  number: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  paymentMethod: 'PIX',
  changeFor: '',
  notes: '',
};

// O checkout (dados de entrega/pagamento) fica num modal central separado do
// drawer do carrinho — não é mais uma "etapa" dentro do drawer. `checkoutStep`
// controla só o conteúdo desse modal (formulário -> confirmação); ele é
// resetado toda vez que o modal fecha, então nunca fica "grudado" numa etapa
// anterior (bug corrigido).
type CheckoutStep = 'form' | 'confirmed';

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // localStorage indisponível (aba privada etc.) — carrinho só dura a sessão em memória.
  }
}

const DigitalMenuPage = () => {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<PublicMenuProduct | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);

  const [cart, setCart] = useState<CartLine[]>(() => loadCart());
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('form');
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormData>(EMPTY_CHECKOUT_FORM);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [orderSendStatus, setOrderSendStatus] = useState<'checking' | 'sent' | 'failed'>('checking');
  const [fallbackWhatsappLink, setFallbackWhatsappLink] = useState<string | null>(null);

  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const modalImageRef = useRef<HTMLImageElement>(null);
  const trackingProfileRef = useRef<Record<string, string>>({});
  const homeEventFiredRef = useRef(false);

  useEffect(() => {
    trackingProfileRef.current = loadTrackingProfile();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await menuService.getMenu();
        setMenu(data);
        if (!homeEventFiredRef.current) {
          homeEventFiredRef.current = true;
          pushToDataLayer({ event: 'home' }, trackingProfileRef.current);
        }
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => saveCart(cart), [cart]);

  // Injeta o GTM configurado em Organização > Cardápio Digital, se houver —
  // mesmo snippet (script + noscript) usado nos templates de Sites.
  useEffect(() => {
    const gtmId = menu?.settings?.gtm_id;
    if (!gtmId || document.getElementById('digital-menu-gtm')) return;

    const script = document.createElement('script');
    script.id = 'digital-menu-gtm';
    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.id = 'digital-menu-gtm-noscript';
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [menu?.settings?.gtm_id]);

  const allProducts = useMemo(
    () => menu?.categories.flatMap((c) => c.products.map((p) => ({ ...p, categoryId: c.id ?? 'sem-categoria' }))) ?? [],
    [menu],
  );

  const visibleCategories = useMemo(
    () => (menu?.categories ?? []).filter((c) => c.products.length > 0),
    [menu],
  );

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (activeCategory !== 'todos') {
      list = list.filter((p) => p.categoryId === activeCategory);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, activeCategory, search]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  const openProduct = (product: PublicMenuProduct) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    pushToDataLayer(
      { event: 'view_item', ecommerce: { items: [{ item_id: product.id, item_name: product.name, price: product.price }] } },
      trackingProfileRef.current,
    );
  };

  // Anima uma cópia da imagem do produto "voando" até o ícone do carrinho —
  // manipulação de DOM direta (fora do React) porque é um efeito único de
  // 600ms que não precisa de re-render nenhum, só de duas mudanças de estilo
  // encadeadas pra disparar a transição CSS.
  const flyToCart = (imageEl: HTMLImageElement | null) => {
    const cartEl = cartButtonRef.current;
    if (!cartEl || !imageEl) return;

    const startRect = imageEl.getBoundingClientRect();
    const endRect = cartEl.getBoundingClientRect();

    const clone = imageEl.cloneNode(true) as HTMLImageElement;
    clone.style.position = 'fixed';
    clone.style.zIndex = '100';
    clone.style.margin = '0';
    clone.style.borderRadius = '9999px';
    clone.style.objectFit = 'cover';
    clone.style.top = `${startRect.top}px`;
    clone.style.left = `${startRect.left}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    clone.style.transition = 'top 0.6s cubic-bezier(0.55,0,1,0.45), left 0.6s cubic-bezier(0.55,0,1,0.45), width 0.6s ease-in, height 0.6s ease-in, opacity 0.6s ease-in';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clone.style.top = `${endRect.top + endRect.height / 2 - 10}px`;
        clone.style.left = `${endRect.left + endRect.width / 2 - 10}px`;
        clone.style.width = '20px';
        clone.style.height = '20px';
        clone.style.opacity = '0.4';
      });
    });

    setTimeout(() => {
      clone.remove();
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 400);
    }, 600);
  };

  const addToCart = (product: PublicMenuProduct, quantity: number) => {
    flyToCart(modalImageRef.current);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { product, quantity }];
    });
    pushToDataLayer(
      {
        event: 'add_to_cart',
        ecommerce: { items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity }] },
      },
      trackingProfileRef.current,
    );
    setSelectedProduct(null);
  };

  const updateLineQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const closeCart = () => setCartOpen(false);

  const openCart = () => setCartOpen(true);

  // Fecha o modal de checkout E reseta a etapa — sem isso, abrir de novo
  // depois de um pedido concluído ficava travado mostrando a confirmação
  // anterior (bug corrigido).
  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutStep('form');
  };

  const goToCheckout = () => {
    setCartOpen(false);
    setCheckoutStep('form');
    setCheckoutOpen(true);
  };

  const setField = (field: keyof CheckoutFormData, value: string) => {
    setCheckoutForm((prev) => ({ ...prev, [field]: value }));
  };

  // Quando o CEP completa 8 dígitos, busca o endereço no ViaCEP e preenche
  // Endereço/Bairro/Cidade/Estado automaticamente (sem sobrescrever se a
  // busca não achar nada).
  const handleZipChange = (rawValue: string) => {
    const formatted = formatZip(rawValue);
    setField('zip', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.erro) return;
        setCheckoutForm((prev) => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      })
      .catch(() => {
        // Falha na busca não bloqueia o checkout — cliente preenche manualmente.
      });
  };

  // O envio pro WhatsApp roda em background (job assíncrono, evita travar o
  // checkout — ver DigitalMenu::SendOrderNotificationJob). Como a resposta
  // desse POST não sabe se o envio deu certo, consulta o status por um tempo
  // curto; só quando falha de verdade (ou não confirma a tempo) é que mostra
  // o botão de fallback com a mensagem do pedido pronta.
  const pollOrderStatus = (token: string) => {
    let attempts = 0;
    const maxAttempts = 6;
    const check = async () => {
      attempts += 1;
      try {
        const status = await menuService.getOrderStatus(token);
        if (status === 'sent') {
          setOrderSendStatus('sent');
          return;
        }
        if (status === 'failed') {
          setOrderSendStatus('failed');
          return;
        }
      } catch {
        // hiccup consultando o status — tenta de novo até acabar as tentativas
      }
      if (attempts >= maxAttempts) {
        setOrderSendStatus('failed');
        return;
      }
      setTimeout(check, 1500);
    };
    check();
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    const orderToken = crypto.randomUUID();
    const notesWithChange =
      checkoutForm.paymentMethod === 'DINHEIRO' && checkoutForm.changeFor
        ? `Troco para: R$ ${checkoutForm.changeFor}${checkoutForm.notes ? ` | ${checkoutForm.notes}` : ''}`
        : checkoutForm.notes;
    const orderItems = cart.map((line) => ({ name: line.product.name, price: line.product.price, quantity: line.quantity }));
    const currency = cart[0]?.product.currency ?? 'BRL';
    const messageText = buildOrderMessageText(
      {
        fullName: checkoutForm.fullName,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        number: checkoutForm.number,
        neighborhood: checkoutForm.neighborhood,
        city: checkoutForm.city,
        state: checkoutForm.state,
      },
      orderItems,
      checkoutForm.paymentMethod,
      notesWithChange,
      cartTotal,
      currency,
    );

    try {
      await menuService.submitOrder(
        {
          full_name: checkoutForm.fullName,
          cpf: checkoutForm.cpf || undefined,
          birth_date: checkoutForm.birthDate || undefined,
          gender: checkoutForm.gender || undefined,
          phone: checkoutForm.phone,
          instagram: checkoutForm.instagram || undefined,
          email: checkoutForm.email || undefined,
          zip: checkoutForm.zip || undefined,
          address: checkoutForm.address,
          number: checkoutForm.number,
          neighborhood: checkoutForm.neighborhood || undefined,
          city: checkoutForm.city,
          state: checkoutForm.state,
        },
        orderItems,
        checkoutForm.paymentMethod,
        notesWithChange,
        orderToken,
      );
    } catch {
      // O pedido é a experiência do cliente — mesmo se a chamada de criação
      // falhar, a tela ainda confirma; o fallback do WhatsApp cobre esse caso.
    } finally {
      pushToDataLayer(
        {
          event: 'generate_lead',
          ecommerce: {
            value: cartTotal,
            items: cart.map((line) => ({ item_id: line.product.id, item_name: line.product.name, price: line.product.price, quantity: line.quantity })),
          },
        },
        trackingProfileRef.current,
      );
      setSubmittingOrder(false);
      setCheckoutStep('confirmed');
      setOrderSendStatus('checking');
      setFallbackWhatsappLink(buildWhatsappLink(menu?.settings?.whatsapp_number, messageText));
      setCart([]);
      setCheckoutForm(EMPTY_CHECKOUT_FORM);
      pollOrderStatus(orderToken);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-lg bg-card rounded-lg shadow-md border border-border p-8 text-center">
          <p className="text-lg font-medium text-foreground">Cardápio indisponível</p>
          <p className="text-sm text-muted-foreground mt-2">Tente novamente em instantes.</p>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full h-10 rounded-md border border-border bg-muted/30 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const labelClass = 'text-xs font-medium text-muted-foreground mb-1 block';

  const settings = menu.settings;
  const iconStyle = settings.icon_color ? { color: settings.icon_color, borderColor: settings.icon_color } : undefined;
  const textStyle = settings.text_color ? { color: settings.text_color } : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={settings.background_color ? { backgroundColor: settings.background_color } : undefined}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border"
        style={settings.header_color ? { backgroundColor: settings.header_color } : undefined}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            {settings.company_name && (
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                style={settings.company_name_color ? { color: settings.company_name_color } : undefined}
              >
                {settings.company_name}
              </p>
            )}
            <h1
              className="text-xl font-bold text-foreground"
              style={settings.title_color ? { color: settings.title_color } : undefined}
            >
              Cardápio Digital
            </h1>
            <p className="text-xs text-muted-foreground" style={textStyle}>
              Confira nossos produtos disponíveis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              style={iconStyle}
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="relative">
              {cartCount > 0 && (
                <span className="animate-ping absolute inset-0 rounded-full bg-primary opacity-60 pointer-events-none" />
              )}
              <button
                ref={cartButtonRef}
                onClick={openCart}
                className={`relative h-10 w-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-transform ${cartBounce ? 'scale-125' : 'scale-100'}`}
                style={iconStyle}
                aria-label="Carrinho"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full h-5 w-5 bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="max-w-5xl mx-auto px-4 pb-3">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full h-10 rounded-full border border-border bg-muted/30 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Category pills */}
        {visibleCategories.length > 1 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveCategory('todos')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === 'todos'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              Todos
            </button>
            {visibleCategories.map((c) => (
              <button
                key={c.id ?? 'sem-categoria'}
                onClick={() => setActiveCategory(c.id ?? 'sem-categoria')}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  activeCategory === (c.id ?? 'sem-categoria')
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16">
            {allProducts.length === 0 ? 'Nenhum produto disponível no momento.' : 'Nenhum produto encontrado.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => openProduct(product)}
                className="text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary transition-colors"
              >
                <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={resolveMediaUrl(product.image_url)}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-foreground text-sm line-clamp-2">{product.name}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {formatCurrency(product.price, product.currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="border-t border-border py-4 mt-auto"
        style={settings.footer_color ? { backgroundColor: settings.footer_color } : undefined}
      >
        <p className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground" style={textStyle}>
          {settings.company_name || 'Cardápio Digital'}
        </p>
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl overflow-hidden">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="aspect-video bg-muted/30 flex items-center justify-center overflow-hidden">
              {selectedProduct.image_url ? (
                <img
                  ref={modalImageRef}
                  src={resolveMediaUrl(selectedProduct.image_url)}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Package className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="p-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedProduct.name}</h3>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(selectedProduct.price, selectedProduct.currency)}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-full">
                  <button
                    onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 flex items-center justify-center"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity((q) => q + 1)}
                    className="h-9 w-9 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => addToCart(selectedProduct, modalQuantity)}
                  className="flex-1 h-10 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={closeCart} />
          <div className="relative w-full max-w-sm bg-card border-l border-border h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Meu Carrinho</h3>
              <button onClick={closeCart} className="h-8 w-8 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Seu carrinho está vazio.</p>
              ) : (
                cart.map((line) => (
                  <div key={line.product.id} className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-md bg-muted/30 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                      {line.product.image_url ? (
                        <img
                          src={resolveMediaUrl(line.product.image_url)}
                          alt={line.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{line.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(line.product.price, line.product.currency)}
                      </p>
                    </div>
                    <div className="flex items-center border border-border rounded-full">
                      <button
                        onClick={() => updateLineQuantity(line.product.id, -1)}
                        className="h-7 w-7 flex items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => updateLineQuantity(line.product.id, 1)}
                        className="h-7 w-7 flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeLine(line.product.id)}
                      className="h-8 w-8 flex items-center justify-center text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="text-lg font-bold text-foreground">
                    {formatCurrency(cartTotal, cart[0]?.product.currency ?? 'BRL')}
                  </span>
                </div>
                <button
                  onClick={goToCheckout}
                  className="w-full h-11 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                >
                  Finalizar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal — dados de entrega/pagamento, centralizado na tela */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeCheckout} />
          <div className="relative w-full max-w-lg max-h-[90vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-foreground">
                {checkoutStep === 'confirmed' ? 'Pedido enviado' : 'Finalizar Pedido'}
              </h3>
              <button onClick={closeCheckout} className="h-8 w-8 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {checkoutStep === 'confirmed' ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="text-center py-10 space-y-4">
                  {orderSendStatus === 'failed' ? (
                    <>
                      <p className="text-base font-medium text-foreground">Pedido registrado!</p>
                      <p className="text-sm text-muted-foreground">
                        Não conseguimos confirmar o envio automático pra loja. Clique abaixo pra enviar você mesmo pelo WhatsApp — a mensagem já vem pronta.
                      </p>
                      {fallbackWhatsappLink && (
                        <a
                          href={fallbackWhatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                        >
                          Enviar pedido via WhatsApp
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-foreground">Pedido enviado!</p>
                      <p className="text-sm text-muted-foreground">
                        {orderSendStatus === 'checking'
                          ? 'Confirmando o envio pra loja...'
                          : 'A loja recebeu seu pedido por WhatsApp e vai confirmar em instantes.'}
                      </p>
                      {orderSendStatus === 'sent' && buildWhatsappLink(menu.settings.whatsapp_number) && (
                        <a
                          href={buildWhatsappLink(menu.settings.whatsapp_number)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                        >
                          Abrir WhatsApp
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <label className={labelClass}>Nome Completo *</label>
                    <input
                      required
                      value={checkoutForm.fullName}
                      onChange={(e) => setField('fullName', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>CPF</label>
                      <input value={checkoutForm.cpf} onChange={(e) => setField('cpf', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Data de Nascimento</label>
                      <input
                        placeholder="DD/MM/AAAA"
                        inputMode="numeric"
                        maxLength={10}
                        value={checkoutForm.birthDate}
                        onChange={(e) => setField('birthDate', formatBirthDate(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Telefone (WhatsApp) *</label>
                      <input
                        required
                        placeholder="55 11 91234-1234"
                        inputMode="numeric"
                        maxLength={16}
                        value={checkoutForm.phone}
                        onChange={(e) => setField('phone', formatPhone(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>E-mail</label>
                      <input
                        type="email"
                        placeholder="seuemail@exemplo.com"
                        value={checkoutForm.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>CEP</label>
                      <input
                        placeholder="00000-000"
                        inputMode="numeric"
                        maxLength={9}
                        value={checkoutForm.zip}
                        onChange={(e) => handleZipChange(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Número *</label>
                      <input
                        required
                        value={checkoutForm.number}
                        onChange={(e) => setField('number', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Endereço *</label>
                    <input
                      required
                      value={checkoutForm.address}
                      onChange={(e) => setField('address', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelClass}>Bairro</label>
                      <input
                        value={checkoutForm.neighborhood}
                        onChange={(e) => setField('neighborhood', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cidade *</label>
                      <input
                        required
                        value={checkoutForm.city}
                        onChange={(e) => setField('city', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Estado</label>
                      <select
                        value={checkoutForm.state}
                        onChange={(e) => setField('state', e.target.value)}
                        className={inputClass}
                      >
                        {BR_STATES.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>Forma de Pagamento *</span>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {PAYMENT_METHODS.map((method) => (
                        <label key={method.value} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={checkoutForm.paymentMethod === method.value}
                            onChange={() => setField('paymentMethod', method.value)}
                          />
                          {method.label}
                        </label>
                      ))}
                    </div>
                    {checkoutForm.paymentMethod === 'DINHEIRO' && (
                      <div className="mt-2">
                        <label className={labelClass}>Troco para quanto?</label>
                        <input
                          placeholder="Ex: 50,00 (deixe em branco se não precisar)"
                          inputMode="decimal"
                          value={checkoutForm.changeFor}
                          onChange={(e) => setField('changeFor', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Observações</label>
                    <textarea
                      placeholder="Ex: Tirar a cebola, ponto da carne, etc."
                      value={checkoutForm.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      className="w-full min-h-[70px] rounded-md border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-border space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(cartTotal, cart[0]?.product.currency ?? 'BRL')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutOpen(false);
                        setCartOpen(true);
                      }}
                      className="flex-1 h-11 rounded-full border border-border font-medium hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="flex-1 h-11 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      {submittingOrder ? 'Enviando...' : 'Enviar Pedido'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalMenuPage;
