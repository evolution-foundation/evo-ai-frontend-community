import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import { appendField } from '@/utils/products/formData';
import {
  Product,
  ProductFormData,
  ProductsListParams,
  ProductsResponse,
  ProductVariant,
  ProductVariantFormData,
  PipelineItemProductLink,
  PipelineItemProductsResponse,
  ProductBulkPayload,
  ProductBulkRealResponse,
  ProductBulkDryRunResponse,
  ProductSellResponse,
  ProductUploadResponse,
  ProductImportSource,
  ProductImportCredentials,
  ProductImportFetchResponse,
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
    return extractData<Product>(response);
  }

  async createProduct(payload: ProductFormData, files?: File[]): Promise<Product> {
    if (files && files.length > 0) {
      const formData = this.buildFormData(payload, files);
      const response = await api.post(this.baseUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<Product>(response);
    }

    const response = await api.post(this.baseUrl, { product: payload });
    return extractData<Product>(response);
  }

  async updateProduct(id: string, payload: Partial<ProductFormData>, files?: File[]): Promise<Product> {
    if (files && files.length > 0) {
      const formData = this.buildFormData(payload, files);
      const response = await api.patch(`${this.baseUrl}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return extractData<Product>(response);
    }

    const response = await api.patch(`${this.baseUrl}/${id}`, { product: payload });
    return extractData<Product>(response);
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

  /**
   * Fetches a remote store's catalog, already mapped into the bulk-import item shape:
   * the caller runs it through the same dry-run + `bulkProducts` path the CSV import
   * uses. Credentials are one-time.
   */
  async importFetch(
    source: ProductImportSource,
    credentials: ProductImportCredentials,
  ): Promise<ProductImportFetchResponse> {
    const response = await api.post(`${this.baseUrl}/import_fetch`, { source, credentials });
    return response.data as ProductImportFetchResponse;
  }

  async deleteProduct(id: string): Promise<{ id: string }> {
    const response = await api.delete(`${this.baseUrl}/${id}`);
    return extractData<{ id: string }>(response);
  }

  // ---------- Sales (stock deduction + ingredients) ----------

  async sellProduct(id: string, quantity: number): Promise<ProductSellResponse> {
    const response = await api.post(`${this.baseUrl}/${id}/sell`, { quantity });
    return response.data as ProductSellResponse;
  }

  // ---------- Media upload (images / videos) ----------

  async uploadMediaFile(file: File): Promise<ProductUploadResponse> {
    const formData = new FormData();
    formData.append('attachment', file, file.name);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as ProductUploadResponse;
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
    Object.entries(payload).forEach(([key, value]) => appendField(formData, `product[${key}]`, value));

    files.forEach((file) => {
      formData.append('product[images][]', file, file.name);
    });

    return formData;
  }
}

export const productsService = new ProductsService();
