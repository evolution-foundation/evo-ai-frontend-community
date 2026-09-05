export interface IfoodOrderItem {
  name: string;
  quantity: number;
  unitPrice?: number;
}

export interface IfoodOrder {
  id: string;
  ifood_order_id: string;
  display_id: string | null;
  status: string;
  order_type: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: IfoodOrderItem[];
  items_count: number;
  total_price: number;
  placed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IfoodStatus {
  connected: boolean;
  merchant_id?: string;
  merchant_name?: string;
  available?: boolean;
  status_message?: string;
}

export interface IfoodInterruption {
  id: string;
  description: string;
  start: string;
  end: string;
}

export interface IfoodCategory {
  id: string;
  name: string;
  status: string;
  index?: number;
}

export interface IfoodSettlements {
  beginDate: string;
  endDate: string;
  balance: number;
  settlements: Array<{ expectedPaymentDate?: string; grossValue?: number; netValue?: number }>;
}

export interface IfoodSales {
  sales?: Array<{ orderId?: string; grossValue?: number; netValue?: number; date?: string }>;
}

export interface IfoodReview {
  id?: string;
  orderId?: string;
  score?: number;
  comment?: string;
  createdAt?: string;
}

export interface IfoodReviews {
  page: number;
  size: number;
  reviews: IfoodReview[];
}

export interface IfoodReviewSummary {
  averageRating?: number;
  totalReviews?: number;
  [key: string]: unknown;
}

export interface IfoodReconciliation {
  [key: string]: unknown;
}

export interface IfoodAnticipations {
  beginDate?: string;
  endDate?: string;
  balance?: number;
  settlements?: Array<{ expectedPaymentDate?: string; grossValue?: number; netValue?: number }>;
}

export interface IfoodFinancialEvent {
  eventName?: string;
  date?: string;
  value?: number;
  [key: string]: unknown;
}

export interface IfoodDeliveryQuote {
  id: string;
  quote: { grossValue: number; discount: number; raise: number; netValue: number };
  expirationAt: string;
}

export interface IfoodProduct {
  id: string;
  name: string;
  description?: string;
  serving?: string;
}

export interface IfoodMenuItem {
  item_id: string;
  product_id: string;
  category_id: string;
  category_name: string;
  name: string | null;
  description: string | null;
  price: number | null;
  status: string;
}

export interface IfoodMerchantDetails {
  merchant_id: string;
  name: string;
  corporate_name: string;
  address?: {
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  operations?: Array<{ name: string }>;
  preparation_time_minutes: number | null;
}

export interface IfoodAnalytics {
  [key: string]: unknown;
}
