import type { ProductCurrency, ProductKind, ProductStatus } from '@/types/products';

/**
 * Client-side schema for one row of a bulk product import (EVO-1734).
 *
 * **Keep in sync with `Product` model validations**
 * (app/models/product.rb on evo-ai-crm-community). The backend is the source
 * of truth — the client just fails fast so the user doesn't pay an HTTP
 * round-trip per typo. Whatever this lets through still has to pass the
 * server check before any row is written.
 */

export const MAX_BULK_ROWS = 500; // mirrors Products::BulkImporter::MAX_ITEMS
export const PRODUCT_KINDS: ProductKind[] = ['physical', 'digital'];
export const PRODUCT_STATUSES: ProductStatus[] = ['active', 'inactive', 'draft'];
export const PRODUCT_CURRENCIES: ProductCurrency[] = ['BRL', 'USD', 'EUR'];

/** Fields the bulk endpoint accepts on each item. */
export const BULK_FIELDS = [
  'name',
  'slug',
  'kind',
  'description',
  'sku',
  'default_price',
  'currency',
  'purchase_url',
  'status',
  'stock_quantity',
  'labels',
] as const;
export type BulkField = (typeof BULK_FIELDS)[number];

/** Fields the backend cannot synthesise — must be mapped before submit. */
export const REQUIRED_FIELDS: BulkField[] = ['name'];

export interface BulkItem {
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
}

export interface FieldError {
  field: BulkField | 'base';
  message: string;
}

export interface RowValidation {
  /** 0-based row index, matching the `index` returned by the server in 422 details. */
  index: number;
  /** 1-based line in the original CSV (header + blank lines accounted for). */
  csvLine: number;
  item: BulkItem | null;
  errors: FieldError[];
}

const URL_REGEXP = /^https?:\/\/\S+$/;

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // A lone comma followed by exactly three digits is ambiguous: "1,000" could
  // be 1000 (US thousands grouping) or 1.000 (BR/ES decimal). Reject it instead
  // of silently guessing — the user must use a dot for the decimal point or drop
  // the grouping. ("1,50"/"1,5" stay valid BR decimals; multiple separators
  // already fall through to NaN below.)
  if (/^-?\d{1,3},\d{3}$/.test(trimmed)) return NaN;
  // Tolerate comma decimals (BR/ES locales export "1,50" instead of "1.50").
  const normalized = trimmed.includes(',') && !trimmed.includes('.') ? trimmed.replace(',', '.') : trimmed;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function parseLabels(raw: string): string[] | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  return trimmed
    .split(/[,;|]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Bridges a server (Rails) validation message onto the stable codes used by
 * `import.serverErrors.*`. Client-side errors already carry those codes, so they
 * pass through untouched; the raw ActiveModel strings the 422 / dry-run response
 * carries (e.g. "has already been taken", "can't be blank") are mapped so the
 * error table localizes them instead of leaking English in pt-BR/es/fr/it.
 * Unknown messages fall through to the raw text (rendered via i18n defaultValue).
 */
export function normalizeServerErrorMessage(message: string): string {
  const m = message.trim().toLowerCase();
  if (m.includes('already been taken')) return 'taken';
  if (m.includes("can't be blank") || m.includes('can’t be blank') || m.includes('cannot be blank')) return 'required';
  if (m.includes('duplicated within batch')) return 'duplicated_within_batch';
  if (m.includes('too long')) return 'too_long';
  if (m.includes('not a number')) return 'invalid_number';
  if (m.includes('greater than or equal')) return 'must_be_non_negative';
  if (m.includes('must be an integer') || m.includes('not an integer')) return 'must_be_integer';
  if (m.includes('not included in the list')) return 'invalid_value';
  if (m.includes('not a valid') && m.includes('url')) return 'invalid_url';
  return message;
}

/**
 * Build a `BulkItem` from one CSV row using `headers → field` mapping, and
 * collect any client-side validation errors. The mapping is `{ csvHeader: bulkField | '' }`;
 * empty string means "ignore this column".
 */
export function buildBulkItem(
  row: string[],
  headers: string[],
  mapping: Record<string, BulkField | ''>,
): { item: BulkItem; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const partial: Partial<Record<BulkField, unknown>> = {};

  headers.forEach((header, columnIdx) => {
    const target = mapping[header];
    if (!target) return;
    const raw = row[columnIdx] ?? '';

    switch (target) {
      case 'default_price':
      case 'stock_quantity': {
        const parsed = parseNumber(raw);
        if (parsed === null) {
          // Leave unset; default/optional handling falls to validator.
          break;
        }
        if (Number.isNaN(parsed)) {
          errors.push({ field: target, message: 'invalid_number' });
        } else {
          partial[target] = parsed;
        }
        break;
      }
      case 'labels': {
        const labels = parseLabels(raw);
        if (labels !== undefined) partial.labels = labels;
        break;
      }
      default: {
        const trimmed = raw.trim();
        if (trimmed !== '') partial[target] = trimmed;
      }
    }
  });

  // Field-level validations mirror Product model (see app/models/product.rb).
  const name = partial.name as string | undefined;
  if (!name || name.length === 0) {
    errors.push({ field: 'name', message: 'required' });
  } else if (name.length > 255) {
    errors.push({ field: 'name', message: 'too_long' });
  }

  if (partial.kind !== undefined && !PRODUCT_KINDS.includes(partial.kind as ProductKind)) {
    errors.push({ field: 'kind', message: 'invalid_kind' });
  }
  if (partial.status !== undefined && !PRODUCT_STATUSES.includes(partial.status as ProductStatus)) {
    errors.push({ field: 'status', message: 'invalid_status' });
  }
  if (partial.currency !== undefined && !PRODUCT_CURRENCIES.includes(partial.currency as ProductCurrency)) {
    errors.push({ field: 'currency', message: 'invalid_currency' });
  }
  if (typeof partial.default_price === 'number' && partial.default_price < 0) {
    errors.push({ field: 'default_price', message: 'must_be_non_negative' });
  }
  if (typeof partial.stock_quantity === 'number') {
    if (partial.stock_quantity < 0) {
      errors.push({ field: 'stock_quantity', message: 'must_be_non_negative' });
    } else if (!Number.isInteger(partial.stock_quantity)) {
      errors.push({ field: 'stock_quantity', message: 'must_be_integer' });
    }
  }
  if (typeof partial.purchase_url === 'string' && !URL_REGEXP.test(partial.purchase_url)) {
    errors.push({ field: 'purchase_url', message: 'invalid_url' });
  }
  if (typeof partial.sku === 'string' && (partial.sku as string).length > 100) {
    errors.push({ field: 'sku', message: 'too_long' });
  }

  const item: BulkItem = {
    name: (name ?? '') as string,
    ...(partial.kind ? { kind: partial.kind as ProductKind } : {}),
    ...(partial.slug ? { slug: partial.slug as string } : {}),
    ...(partial.description ? { description: partial.description as string } : {}),
    ...(partial.sku ? { sku: partial.sku as string } : {}),
    ...(partial.default_price !== undefined ? { default_price: partial.default_price as number } : {}),
    ...(partial.currency ? { currency: partial.currency as ProductCurrency } : {}),
    ...(partial.purchase_url ? { purchase_url: partial.purchase_url as string } : {}),
    ...(partial.status ? { status: partial.status as ProductStatus } : {}),
    ...(partial.stock_quantity !== undefined ? { stock_quantity: partial.stock_quantity as number } : {}),
    ...(Array.isArray(partial.labels) ? { labels: partial.labels as string[] } : {}),
  };

  return { item, errors };
}

/**
 * Returns the same `index → errors` shape the server returns for 422 details,
 * so the UI can use a single rendering path regardless of error origin.
 *
 * Adds an intra-batch SKU dedup check to mirror the `DUPLICATE_SKU_IN_BATCH`
 * error emitted by `Products::BulkImporter#pre_validate_items`.
 */
export function validateAll(
  rows: string[][],
  headers: string[],
  rowLines: number[],
  mapping: Record<string, BulkField | ''>,
): RowValidation[] {
  const out: RowValidation[] = [];
  const seenSku = new Map<string, number>();

  rows.forEach((row, index) => {
    const csvLine = rowLines[index] ?? index + 2; // header counts as line 1.
    const { item, errors } = buildBulkItem(row, headers, mapping);
    if (item.sku) {
      const prior = seenSku.get(item.sku);
      if (prior !== undefined) {
        errors.push({ field: 'sku', message: 'duplicated_within_batch' });
      } else {
        seenSku.set(item.sku, index);
      }
    }
    out.push({ index, csvLine, item, errors });
  });

  return out;
}

/** A column header is "required-but-unmapped" iff none of the headers maps to it. */
export function unmappedRequiredFields(mapping: Record<string, BulkField | ''>): BulkField[] {
  const mapped = new Set(Object.values(mapping).filter((v): v is BulkField => v !== ''));
  return REQUIRED_FIELDS.filter((f) => !mapped.has(f));
}

/**
 * Heuristic header → bulk field auto-mapping (case/spacing-insensitive).
 * Catches common Excel/Sheets exports without forcing the user to remap.
 */
export function autoMap(headers: string[]): Record<string, BulkField | ''> {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
  const synonyms: Record<string, BulkField> = {
    name: 'name',
    nome: 'name',
    nombre: 'name',
    title: 'name',
    sku: 'sku',
    code: 'sku',
    codigo: 'sku',
    kind: 'kind',
    type: 'kind',
    tipo: 'kind',
    status: 'status',
    estado: 'status',
    description: 'description',
    descricao: 'description',
    descripcion: 'description',
    descrizione: 'description',
    slug: 'slug',
    price: 'default_price',
    defaultprice: 'default_price',
    preco: 'default_price',
    precio: 'default_price',
    currency: 'currency',
    moeda: 'currency',
    purchaseurl: 'purchase_url',
    purchase: 'purchase_url',
    url: 'purchase_url',
    link: 'purchase_url',
    stock: 'stock_quantity',
    stockquantity: 'stock_quantity',
    estoque: 'stock_quantity',
    labels: 'labels',
    tags: 'labels',
    categorias: 'labels',
    etiquetas: 'labels',
  };
  const out: Record<string, BulkField | ''> = {};
  headers.forEach((h) => {
    const key = norm(h);
    out[h] = synonyms[key] ?? '';
  });
  return out;
}
