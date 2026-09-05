export type WorkOrderStatus = 'open' | 'in_progress' | 'waiting_parts' | 'done' | 'delivered' | 'cancelled';

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'open',
  'in_progress',
  'waiting_parts',
  'done',
  'delivered',
  'cancelled',
];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em Andamento',
  waiting_parts: 'Aguardando Peças',
  done: 'Concluída',
  delivered: 'Entregue',
  cancelled: 'Cancelada',
};

export const PAYMENT_METHODS = [
  'Não Definido',
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Transferência',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface WorkOrderItem {
  product_id?: string;
  name: string;
  sku?: string;
  tipo?: string;
  valor: number;
  quantity: number;
}

export interface WorkOrder {
  id: string;
  os_number: string;
  status: WorkOrderStatus;
  client_name?: string | null;
  client_cpf?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  client_instagram?: string | null;
  client_cep?: string | null;
  client_address?: string | null;
  client_number?: string | null;
  client_neighborhood?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  device?: string | null;
  problems?: string | null;
  checklist?: string | null;
  observation?: string | null;
  device_password?: string | null;
  entry_date?: string | null;
  pickup_date?: string | null;
  device_turns_on: boolean;
  picked_up: boolean;
  items: WorkOrderItem[];
  items_count: number;
  item_names?: string;
  base_value: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  installments?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderFormData {
  os_number?: string;
  status?: WorkOrderStatus;
  client_name?: string;
  client_cpf?: string;
  client_phone?: string;
  client_email?: string;
  client_instagram?: string;
  client_cep?: string;
  client_address?: string;
  client_number?: string;
  client_neighborhood?: string;
  client_city?: string;
  client_state?: string;
  device?: string;
  problems?: string;
  checklist?: string;
  observation?: string;
  device_password?: string;
  entry_date?: string;
  pickup_date?: string | null;
  device_turns_on?: boolean;
  picked_up?: boolean;
  items?: WorkOrderItem[];
  base_value?: number;
  discount?: number;
  total?: number;
  payment_method?: PaymentMethod;
  installments?: number | null;
}

export interface WorkOrdersListParams {
  q?: string;
  status?: WorkOrderStatus;
  payment_method?: string;
  from?: string;
  to?: string;
}

export interface WorkOrdersResponse {
  success: boolean;
  data: WorkOrder[];
  meta: Record<string, unknown>;
  message?: string;
}