export interface NinetyNineOrder {
  id: string;
  external_order_id: string | null;
  status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{ name?: string; quantity?: number }>;
  items_count: number;
  total_price: number | null;
  raw_payload: Record<string, unknown>;
  received_at: string;
  created_at: string;
}

export interface NinetyNineWebhookInfo {
  webhook_url: string;
  orders_received: number;
}
