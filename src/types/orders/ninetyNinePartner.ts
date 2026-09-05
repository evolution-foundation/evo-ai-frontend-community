export interface NinetyNinePartnerStatus {
  connected: boolean;
  store_id: string | null;
}

export interface NinetyNineBoundStore {
  shop_id: number;
  shop_name: string;
  app_shop_id: string;
  bound_flag: number;
}

export interface NinetyNineStoreDetails {
  shop_id: number;
  app_shop_id: string;
  name: string;
  addr?: string;
  biz_status: number;
  sub_biz_status: number;
  auto_switch: number;
  store_status?: number;
  promise_produce_time?: number;
}

export interface NinetyNineMenuItem {
  item_id: string;
  name: string;
  status: string;
  price?: number;
  category_name?: string;
}

export interface NinetyNineBillEntry {
  orderId: string;
  orderType: number;
  businessDateTime: string;
  orderAmount: number;
  settlementAmount: number;
  expectSettleDate: string;
  commissionAmount: number;
}

export interface NinetyNineSettlement {
  weekPaymentId: string;
  withdrawDate: string;
  withdrawAmount: number;
  settleStartDate: string;
  settleEndDate: string;
  currency: string;
}
