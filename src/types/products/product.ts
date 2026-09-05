import type { PaginatedResponse, PaginationMeta } from '@/types/core';

export type ProductKind = 'physical' | 'digital';
export type ProductItemType = 'produto' | 'produto_ml' | 'servico' | 'insumo' | 'equipamento';
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

export type ProductMediaKind = 'image' | 'video';
export type ProductMediaSource = 'url' | 'upload' | 'gallery';

export interface ProductMedia {
  id?: string;
  kind: ProductMediaKind;
  source: ProductMediaSource;
  url: string;
}

export interface ProductIngredient {
  id: string;
  ingredient_product_id: string;
  name?: string | null;
  quantity: number;
  unit: string;
}

export interface ProductIngredientFormData {
  id?: string;
  _destroy?: boolean;
  ingredient_product_id: string;
  name?: string;
  quantity: number | null;
  unit: string;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string | null;
  kind: ProductKind;
  item_type?: ProductItemType;
  description?: string | null;
  sku?: string | null;
  default_price: number;
  cost_price?: number | null;
  profit?: number;
  currency: ProductCurrency;
  purchase_url?: string | null;
  status: ProductStatus;
  stock_quantity?: number | null;
  supplier?: string | null;
  material?: string | null;
  color?: string | null;
  size?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  ml_category?: string | null;
  ml_buying_model?: string | null;
  ml_listing_type?: string | null;
  ml_condition?: string | null;
  brand?: string | null;
  model?: string | null;
  compatible_brands?: string | null;
  accessory_type?: string | null;
  anatel_number?: string | null;
  equipamento_tipo?: string | null;
  publish_ml?: boolean;
  metadata?: Record<string, unknown>;
  labels?: string[];
  category_id?: string | null;
  category_name?: string | null;
  ingredients?: ProductIngredient[];
  media?: ProductMedia[];
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
  item_type?: ProductItemType;
  description?: string;
  sku?: string;
  default_price: number;
  cost_price?: number | null;
  currency: ProductCurrency;
  purchase_url?: string;
  status: ProductStatus;
  stock_quantity?: number | null;
  supplier?: string;
  material?: string;
  color?: string;
  size?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
  length_cm?: number | null;
  ml_category?: string;
  ml_buying_model?: string;
  ml_listing_type?: string;
  ml_condition?: string;
  brand?: string;
  model?: string;
  compatible_brands?: string;
  accessory_type?: string;
  anatel_number?: string;
  publish_ml?: boolean;
  labels?: string[];
  category_id?: string | null;
  media?: ProductMedia[];
  variants_attributes?: ProductVariantFormData[];
  product_ingredients_attributes?: ProductIngredientFormData[];
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
  item_type?: ProductItemType;
  status?: ProductStatus;
  category_id?: string;
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
  /** EVO-2226: remote image URLs; downloaded + attached server-side on import. */
  image_urls?: string[];
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

/* ---------- Remote import (EVO-1785 Phase 2 — Shopify / WooCommerce) ---------- */

export type ProductImportSource = 'woocommerce' | 'shopify';

export interface ProductImportCredentials {
  store_url?: string;
  consumer_key?: string;
  consumer_secret?: string;
  shop_domain?: string;
  access_token?: string;
}

/**
 * As returned by `POST /products/import_fetch`: ProductBulkItem's shape, except numeric
 * fields may arrive as strings (the store's raw JSON).
 */
export interface FetchedProductItem {
  name: string;
  kind?: ProductKind;
  slug?: string;
  description?: string;
  sku?: string;
  default_price?: string | number;
  currency?: ProductCurrency;
  purchase_url?: string;
  status?: ProductStatus;
  stock_quantity?: number;
  labels?: string[];
  image_urls?: string[];
}

export interface ProductImportFetchResponse {
  data: { items: FetchedProductItem[] };
  meta: {
    source: string;
    count: number;
    /** The walk stopped on a budget, so the store holds more than came back. */
    truncated?: boolean;
    /** Variants the fetch could not carry: /products/bulk creates one row per product. */
    variants_dropped?: number;
  };
}

export interface ProductsResponse extends PaginatedResponse<Product> {}

export interface ProductCategoriesResponse extends StandardResponse<ProductCategory[]> {}
export interface ProductCategoryCreateResponse extends StandardResponse<ProductCategory> {}

export interface ProductSellAffectedItem {
  id: string;
  name: string;
  stock_quantity: number;
}

export interface ProductSellResponse extends StandardResponse<{
  product_id: string;
  quantity: number;
  affected: ProductSellAffectedItem[];
}> {}

export interface ProductUploadResponse extends StandardResponse<{
  file_url: string;
  blob_key: string;
  blob_id: string;
}> {}

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
