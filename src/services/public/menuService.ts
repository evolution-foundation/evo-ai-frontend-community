import apiPublic from '@/services/core/apiPublic';

export interface PublicMenuProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  image_url?: string | null;
}

export interface PublicMenuCategory {
  id: string | null;
  name: string;
  products: PublicMenuProduct[];
}

export interface PublicMenuSettings {
  company_name: string | null;
  header_color: string | null;
  background_color: string | null;
  footer_color: string | null;
  icon_color: string | null;
  text_color: string | null;
  title_color: string | null;
  company_name_color: string | null;
  gtm_id: string | null;
  whatsapp_number: string | null;
}

export interface PublicMenu {
  categories: PublicMenuCategory[];
  settings: PublicMenuSettings;
}

export interface OrderCustomer {
  full_name: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  phone: string;
  instagram?: string;
  email?: string;
  zip?: string;
  address: string;
  number: string;
  neighborhood?: string;
  city: string;
  state?: string;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

/**
 * Service para a API pública (anônima) do cardápio digital.
 * Endpoints: GET /public/api/v1/menu, POST /public/api/v1/menu/orders.
 * Não requer autenticação — lista os produtos com status "active" do
 * catálogo, agrupados por categoria, e envia pedidos pro WhatsApp
 * configurado em Organização > Cardápio Digital.
 */
class MenuService {
  async getMenu(): Promise<PublicMenu> {
    const { data } = await apiPublic.get<{ data: PublicMenu }>('/menu');
    return data.data;
  }

  async submitOrder(
    customer: OrderCustomer,
    items: OrderItem[],
    paymentMethod: string,
    notes: string,
    orderToken: string,
  ): Promise<void> {
    await apiPublic.post('/menu/orders', { customer, items, payment_method: paymentMethod, notes, order_token: orderToken });
  }

  // O envio pro WhatsApp roda em background (pode levar alguns segundos) —
  // o checkout consulta esse status pra decidir se mostra o fallback "enviar
  // você mesmo pelo WhatsApp" quando o envio automático falha de verdade.
  async getOrderStatus(orderToken: string): Promise<'pending' | 'sent' | 'failed'> {
    const { data } = await apiPublic.get<{ status: 'pending' | 'sent' | 'failed' }>(`/menu/orders/${orderToken}/status`);
    return data.status;
  }
}

export const menuService = new MenuService();
export default menuService;
