import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  IfoodOrder,
  IfoodStatus,
  IfoodInterruption,
  IfoodCategory,
  IfoodSettlements,
  IfoodSales,
  IfoodReviews,
  IfoodReviewSummary,
  IfoodReconciliation,
  IfoodAnticipations,
  IfoodFinancialEvent,
  IfoodDeliveryQuote,
  IfoodProduct,
  IfoodMenuItem,
  IfoodMerchantDetails,
  IfoodAnalytics,
} from '@/types/orders/ifoodOrder';

class IfoodService {
  private readonly baseUrl = '/ifood';

  async getStatus(): Promise<IfoodStatus> {
    const response = await api.get(`${this.baseUrl}/status`);
    return extractData<IfoodStatus>(response);
  }

  async getOrders(): Promise<IfoodOrder[]> {
    const response = await api.get(`${this.baseUrl}/orders`);
    return extractData<IfoodOrder[]>(response);
  }

  async syncOrders(): Promise<IfoodOrder[]> {
    const response = await api.post(`${this.baseUrl}/orders/sync`);
    return extractData<IfoodOrder[]>(response);
  }

  async confirmOrder(id: string): Promise<IfoodOrder> {
    const response = await api.post(`${this.baseUrl}/orders/${id}/confirm`);
    return extractData<IfoodOrder>(response);
  }

  async startPreparation(id: string): Promise<IfoodOrder> {
    const response = await api.post(`${this.baseUrl}/orders/${id}/start_preparation`);
    return extractData<IfoodOrder>(response);
  }

  async readyToPickup(id: string): Promise<IfoodOrder> {
    const response = await api.post(`${this.baseUrl}/orders/${id}/ready_to_pickup`);
    return extractData<IfoodOrder>(response);
  }

  async dispatchOrder(id: string): Promise<IfoodOrder> {
    const response = await api.post(`${this.baseUrl}/orders/${id}/dispatch`);
    return extractData<IfoodOrder>(response);
  }

  async cancelOrder(id: string, reason?: string): Promise<IfoodOrder> {
    const response = await api.post(`${this.baseUrl}/orders/${id}/cancel`, { reason });
    return extractData<IfoodOrder>(response);
  }

  async getInterruptions(): Promise<IfoodInterruption[]> {
    const response = await api.get(`${this.baseUrl}/interruptions`);
    return extractData<IfoodInterruption[]>(response);
  }

  async createInterruption(minutes: number, description?: string): Promise<IfoodInterruption> {
    const response = await api.post(`${this.baseUrl}/interruptions`, { minutes, description });
    return extractData<IfoodInterruption>(response);
  }

  async deleteInterruption(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/interruptions/${id}`);
  }

  async getCategories(): Promise<IfoodCategory[]> {
    const response = await api.get(`${this.baseUrl}/categories`);
    return extractData<IfoodCategory[]>(response);
  }

  async createCategory(name: string): Promise<IfoodCategory> {
    const response = await api.post(`${this.baseUrl}/categories`, { name });
    return extractData<IfoodCategory>(response);
  }

  async updateCategory(id: string, name: string): Promise<IfoodCategory> {
    const response = await api.patch(`${this.baseUrl}/categories/${id}`, { name });
    return extractData<IfoodCategory>(response);
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/categories/${id}`);
  }

  async getSettlements(beginDate?: string, endDate?: string): Promise<IfoodSettlements> {
    const response = await api.get(`${this.baseUrl}/settlements`, {
      params: { begin_date: beginDate, end_date: endDate },
    });
    return extractData<IfoodSettlements>(response);
  }

  async getSales(beginDate?: string, endDate?: string): Promise<IfoodSales> {
    const response = await api.get(`${this.baseUrl}/sales`, {
      params: { begin_date: beginDate, end_date: endDate },
    });
    return extractData<IfoodSales>(response);
  }

  async getReviews(page = 1): Promise<IfoodReviews> {
    const response = await api.get(`${this.baseUrl}/reviews`, { params: { page } });
    return extractData<IfoodReviews>(response);
  }

  async getDeliveryQuote(latitude: number, longitude: number): Promise<IfoodDeliveryQuote> {
    const response = await api.get(`${this.baseUrl}/delivery_quote`, { params: { latitude, longitude } });
    return extractData<IfoodDeliveryQuote>(response);
  }

  async requestDriver(orderId: string, quoteId: string): Promise<void> {
    await api.post(`${this.baseUrl}/orders/${orderId}/request_driver`, { quote_id: quoteId });
  }

  async cancelRequestDriver(orderId: string): Promise<void> {
    await api.post(`${this.baseUrl}/orders/${orderId}/cancel_request_driver`);
  }

  async acceptDispute(disputeId: string, reason: string, detailReason?: string): Promise<void> {
    await api.post(`${this.baseUrl}/disputes/${disputeId}/accept`, { reason, detail_reason: detailReason });
  }

  async rejectDispute(disputeId: string, reason: string, detailReason?: string): Promise<void> {
    await api.post(`${this.baseUrl}/disputes/${disputeId}/reject`, { reason, detail_reason: detailReason });
  }

  async getProducts(): Promise<IfoodProduct[]> {
    const response = await api.get(`${this.baseUrl}/products`);
    return extractData<IfoodProduct[]>(response);
  }

  async createProduct(name: string, description?: string): Promise<IfoodProduct> {
    const response = await api.post(`${this.baseUrl}/products`, { name, description });
    return extractData<IfoodProduct>(response);
  }

  async createItem(productId: string, categoryId: string, priceValue: number): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/items`, {
      product_id: productId,
      category_id: categoryId,
      price_value: priceValue,
    });
    return extractData(response);
  }

  async getMenuItems(): Promise<IfoodMenuItem[]> {
    const response = await api.get(`${this.baseUrl}/menu_items`);
    return extractData<IfoodMenuItem[]>(response);
  }

  async updateMenuItem(
    itemId: string,
    payload: {
      categoryId: string;
      productId: string;
      name?: string;
      description?: string;
      priceValue?: number;
      currentPrice?: number;
      status?: string;
    },
  ): Promise<void> {
    await api.patch(`${this.baseUrl}/menu_items/${itemId}`, {
      category_id: payload.categoryId,
      product_id: payload.productId,
      name: payload.name,
      description: payload.description,
      price_value: payload.priceValue,
      current_price: payload.currentPrice,
      status: payload.status,
    });
  }

  async deleteMenuItem(itemId: string, categoryId: string, productId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/menu_items/${itemId}`, {
      params: { category_id: categoryId, product_id: productId },
    });
  }

  async getMerchantDetails(): Promise<IfoodMerchantDetails> {
    const response = await api.get(`${this.baseUrl}/merchant_details`);
    return extractData<IfoodMerchantDetails>(response);
  }

  async closeStore(reason: string, minutes?: number): Promise<void> {
    await api.post(`${this.baseUrl}/close`, { reason, minutes });
  }

  async openStore(): Promise<void> {
    await api.post(`${this.baseUrl}/open`);
  }

  async getAnalytics(beginDate?: string, endDate?: string): Promise<IfoodAnalytics> {
    const response = await api.get(`${this.baseUrl}/analytics`, {
      params: { begin_date: beginDate, end_date: endDate },
    });
    return extractData<IfoodAnalytics>(response);
  }

  async getDeliveryQuoteForOrder(orderId: string): Promise<IfoodDeliveryQuote> {
    const response = await api.get(`${this.baseUrl}/orders/${orderId}/delivery_quote`);
    return extractData<IfoodDeliveryQuote>(response);
  }

  async getReconciliation(competence?: string): Promise<IfoodReconciliation | null> {
    const response = await api.get(`${this.baseUrl}/reconciliation`, { params: { competence } });
    return extractData<IfoodReconciliation | null>(response);
  }

  async getAnticipations(beginDate?: string, endDate?: string): Promise<IfoodAnticipations> {
    const response = await api.get(`${this.baseUrl}/anticipations`, {
      params: { begin_date: beginDate, end_date: endDate },
    });
    return extractData<IfoodAnticipations>(response);
  }

  async getFinancialEvents(beginDate?: string, endDate?: string): Promise<IfoodFinancialEvent[]> {
    const response = await api.get(`${this.baseUrl}/financial_events`, {
      params: { begin_date: beginDate, end_date: endDate },
    });
    return extractData<IfoodFinancialEvent[]>(response);
  }

  async getReviewSummary(): Promise<IfoodReviewSummary | null> {
    const response = await api.get(`${this.baseUrl}/review_summary`);
    return extractData<IfoodReviewSummary | null>(response);
  }

  async replyReview(reviewId: string, text: string): Promise<void> {
    await api.post(`${this.baseUrl}/reviews/${reviewId}/reply`, { text });
  }
}

export const ifoodService = new IfoodService();
