import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';

export type ProductKind = 'physical' | 'digital';
export type ProductStatus = 'active' | 'inactive' | 'draft';
export type ProductCurrency = 'BRL' | 'USD' | 'EUR';

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  price_override?: number | null;
  effective_price?: number | null;
  effective_currency?: ProductCurrency | null;
  stock_quantity?: number | null;
  attributes?: Record<string, unknown>;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductImage {
  id: number | string;
  url: string;
  content_type: string;
  filename: string;
  byte_size: number;
}

export interface Product {
  id: string;
  name: string;
  slug?: string | null;
  kind: ProductKind;
  description?: string | null;
  sku?: string | null;
  default_price: number;
  currency: ProductCurrency;
  purchase_url?: string | null;
  status: ProductStatus;
  stock_quantity?: number | null;
  metadata?: Record<string, unknown>;
  labels?: string[];
  variants: ProductVariant[];
  images: ProductImage[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload used when creating/updating a product. Variants come as
 * `variants_attributes` to leverage Rails' `accepts_nested_attributes_for`.
 * Mark a variant for deletion by setting `_destroy: true`.
 */
export interface ProductFormData {
  name: string;
  kind: ProductKind;
  description?: string;
  sku?: string;
  default_price: number;
  currency: ProductCurrency;
  purchase_url?: string;
  status: ProductStatus;
  stock_quantity?: number | null;
  labels?: string[];
  variants_attributes?: ProductVariantFormData[];
  metadata?: Record<string, unknown>;
  // Active Storage signed_ids of newly uploaded blobs
  images?: string[];
}

export interface ProductVariantFormData {
  id?: string;
  _destroy?: boolean;
  name: string;
  sku?: string;
  price_override?: number | null;
  stock_quantity?: number | null;
  position?: number;
  attributes_data?: Record<string, unknown>;
}

export interface ProductsListParams {
  page?: number;
  per_page?: number;
  q?: string;
  kind?: ProductKind;
  status?: ProductStatus;
}

/* ---------- Bulk import (EVO-1555 S1 + S1.1 dry-run) ---------- */

export interface ProductBulkItem {
  name: string;
  kind?: ProductKind;
  slug?: string;
  description?: string;
  sku?: string;
  default_price?: number;
  currency?: ProductCurrency;
  purchase_url?: string;
  status?: ProductStatus;
  stock_quantity?: number;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProductBulkPayload {
  products: ProductBulkItem[];
  dry_run?: boolean;
}

export interface ProductBulkServerError {
  index: number;
  sku: string | null;
  errors: Record<string, string[]>;
}

export interface ProductBulkRealResponse {
  success: true;
  data: Product[];
  meta: { created: number; updated: number; skipped: number };
  message: string;
}

export interface ProductBulkDryRunResponse {
  success: true;
  data: {
    dry_run: true;
    would_create: Array<{ index: number; sku: string | null; name: string; labels?: string[] }>;
    would_update: unknown[];
    would_skip: unknown[];
    errors: ProductBulkServerError[];
  };
  meta: { created: number; updated: number; skipped: number; errors: number };
}

export interface ProductsResponse extends PaginatedResponse<Product> {}
export interface ProductResponse extends StandardResponse<Product> {}
export interface ProductDeleteResponse extends StandardResponse<{ id: string }> {}

export interface PipelineItemProductLink {
  id: string;
  pipeline_item_id: string;
  product_id: string;
  product_variant_id?: string | null;
  product?: {
    id: string;
    name: string;
    kind: ProductKind;
    sku?: string | null;
    currency: ProductCurrency;
  };
  product_variant?: { id: string; name: string; sku?: string | null } | null;
  quantity: number;
  locked_unit_price: number;
  currency: ProductCurrency;
  subtotal: number;
  notes?: string | null;
  created_by_type?: string | null;
  created_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PipelineItemProductsResponse {
  data: PipelineItemProductLink[];
  meta?: { total_value?: number };
  message?: string;
}

export interface ProductsState {
  products: Product[];
  selectedProductIds: string[];
  meta: { pagination: PaginationMeta };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  searchQuery: string;
  filterKind: ProductKind | 'all';
  filterStatus: ProductStatus | 'all';
}
