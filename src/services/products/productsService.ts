import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import {
  Product,
  ProductFormData,
  ProductsListParams,
  ProductsResponse,
  ProductResponse,
  ProductDeleteResponse,
  ProductVariant,
  ProductVariantFormData,
  PipelineItemProductLink,
  PipelineItemProductsResponse,
  ProductBulkPayload,
  ProductBulkRealResponse,
  ProductBulkDryRunResponse,
} from '@/types/products';

class ProductsService {
  private readonly baseUrl = '/products';

  async getProducts(params?: ProductsListParams): Promise<ProductsResponse> {
    try {
      const response = await api.get(this.baseUrl, { params });
      return extractResponse<Product>(response) as ProductsResponse;
    } catch (error) {
      console.error('ProductsService.getProducts error:', error);
      throw error;
    }
  }

  async getProduct(id: string): Promise<Product> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return extractData<ProductResponse>(response).data;
  }

  async createProduct(payload: ProductFormData, files?: File[]): Promise<Product> {
    if (files && files.length > 0) {
      const formData = this.buildFormData(payload, files);
      const response = await api.post(this.baseUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<ProductResponse>(response).data;
    }

    const response = await api.post(this.baseUrl, { product: payload });
    return extractData<ProductResponse>(response).data;
  }

  async updateProduct(id: string, payload: Partial<ProductFormData>, files?: File[]): Promise<Product> {
    if (files && files.length > 0) {
      const formData = this.buildFormData(payload, files);
      const response = await api.patch(`${this.baseUrl}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<ProductResponse>(response).data;
    }

    const response = await api.patch(`${this.baseUrl}/${id}`, { product: payload });
    return extractData<ProductResponse>(response).data;
  }

  /**
   * Bulk-create products in one transaction (EVO-1555 S1).
   * `dry_run: true` runs the same validation/transaction pipeline and rolls
   * back, returning a preview payload — see EVO-1736 (S1.1).
   */
  async bulkProducts(
    payload: ProductBulkPayload & { dry_run: true },
  ): Promise<ProductBulkDryRunResponse>;
  async bulkProducts(payload: ProductBulkPayload): Promise<ProductBulkRealResponse>;
  async bulkProducts(
    payload: ProductBulkPayload & { dry_run?: boolean },
  ): Promise<ProductBulkRealResponse | ProductBulkDryRunResponse> {
    const { dry_run, ...body } = payload;
    const response = await api.post(`${this.baseUrl}/bulk`, body, {
      params: dry_run ? { dry_run: true } : undefined,
    });
    return response.data;
  }

  async deleteProduct(id: string): Promise<ProductDeleteResponse> {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return extractData<ProductDeleteResponse>(response);
  }

  // ---------- Variants ----------

  async listVariants(productId: string): Promise<ProductVariant[]> {
    const response = await api.get(`${this.baseUrl}/${productId}/variants`);
    return (extractResponse<ProductVariant>(response).data as ProductVariant[]) ?? [];
  }

  async createVariant(productId: string, payload: ProductVariantFormData): Promise<ProductVariant> {
    const response = await api.post(`${this.baseUrl}/${productId}/variants`, { variant: payload });
    return extractData<{ data: ProductVariant }>(response).data;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    payload: Partial<ProductVariantFormData>,
  ): Promise<ProductVariant> {
    const response = await api.patch(`${this.baseUrl}/${productId}/variants/${variantId}`, {
      variant: payload,
    });
    return extractData<{ data: ProductVariant }>(response).data;
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${productId}/variants/${variantId}`);
  }

  // ---------- Agent attachments ----------

  async listAgentProducts(agentId: string): Promise<Product[]> {
    const response = await api.get(`/ai_agents/${agentId}/products`);
    return (extractResponse<Product>(response).data as Product[]) ?? [];
  }

  async attachProductsToAgent(agentId: string, productIds: string[]): Promise<void> {
    await api.post(`/ai_agents/${agentId}/products`, { product_ids: productIds });
  }

  async detachProductFromAgent(agentId: string, productId: string): Promise<void> {
    await api.delete(`/ai_agents/${agentId}/products/${productId}`);
  }

  // ---------- Pipeline item sales ----------

  async listPipelineItemProducts(pipelineItemId: string): Promise<PipelineItemProductsResponse> {
    const response = await api.get(`/pipeline_items/${pipelineItemId}/products`);
    return response.data as PipelineItemProductsResponse;
  }

  async addProductToPipelineItem(
    pipelineItemId: string,
    payload: {
      product_id: string;
      product_variant_id?: string | null;
      quantity: number;
      notes?: string;
    },
  ): Promise<PipelineItemProductLink> {
    const response = await api.post(`/pipeline_items/${pipelineItemId}/products`, payload);
    return extractData<{ data: PipelineItemProductLink }>(response).data;
  }

  async updatePipelineItemProduct(
    pipelineItemId: string,
    linkId: string,
    payload: { quantity?: number; notes?: string },
  ): Promise<PipelineItemProductLink> {
    const response = await api.patch(`/pipeline_items/${pipelineItemId}/products/${linkId}`, payload);
    return extractData<{ data: PipelineItemProductLink }>(response).data;
  }

  async removeProductFromPipelineItem(pipelineItemId: string, linkId: string): Promise<void> {
    await api.delete(`/pipeline_items/${pipelineItemId}/products/${linkId}`);
  }

  // ---------- Helpers ----------

  private buildFormData(payload: Partial<ProductFormData>, files: File[]): FormData {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'variants_attributes' && Array.isArray(value)) {
        formData.append(`product[${key}]`, JSON.stringify(value));
        return;
      }
      if (key === 'labels' && Array.isArray(value)) {
        value.forEach((label) => formData.append('product[labels][]', String(label)));
        return;
      }
      if (key === 'metadata' && typeof value === 'object') {
        formData.append('product[metadata]', JSON.stringify(value));
        return;
      }
      formData.append(`product[${key}]`, String(value));
    });

    files.forEach((file) => {
      formData.append('product[images][]', file, file.name);
    });

    return formData;
  }
}

export const productsService = new ProductsService();
