import { useLanguage } from '@/hooks/useLanguage';
import { Button, Badge } from '@evoapi/design-system';
import { Pencil, Trash2, Package, Cloud, ShoppingCart } from 'lucide-react';
import type { Product } from '@/types/products';
import { stockInfo } from './productStock';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface Props {
  products: Product[];
  canUpdate: boolean;
  canDelete: boolean;
  canSell?: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onSell?: (product: Product) => void;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  draft: 'outline',
};

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function ProductsTable({
  products,
  canUpdate,
  canDelete,
  canSell = false,
  onEdit,
  onDelete,
  onSell,
}: Props) {
  const { t } = useLanguage('products');

  if (products.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-md">
        {t('table.empty')}
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 w-10"></th>
            <th className="px-3 py-2">{t('table.columns.name')}</th>
            <th className="px-3 py-2">{t('table.columns.sku')}</th>
            <th className="px-3 py-2">{t('table.columns.kind')}</th>
            <th className="px-3 py-2">{t('table.columns.price')}</th>
            <th className="px-3 py-2">Custo</th>
            <th className="px-3 py-2">Lucro</th>
            <th className="px-3 py-2">Fornecedor</th>
            <th className="px-3 py-2">{t('table.columns.stock')}</th>
            <th className="px-3 py-2">{t('table.columns.status')}</th>
            <th className="px-3 py-2">{t('table.columns.variants')}</th>
            <th className="px-3 py-2 text-right">{t('table.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const Icon = product.kind === 'digital' ? Cloud : Package;
            const stock = stockInfo(product);
            const cost = product.cost_price ?? null;
            const profit =
              cost == null ? null : product.default_price - cost;
            const thumb =
              product.media?.find((m) => m.kind === 'image')?.url ??
              product.images?.[0]?.url ??
              null;
            return (
              <tr key={product.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 w-10">
                  {thumb ? (
                    <img
                      src={resolveMediaUrl(thumb)}
                      alt={product.name}
                      className="h-9 w-9 rounded object-cover border"
                    />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{product.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{product.sku ?? '—'}</td>
                <td className="px-3 py-2">{t(`kind.${product.kind}`)}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {formatPrice(product.default_price, product.currency)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {cost == null ? '—' : formatPrice(cost, product.currency)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {profit == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className={profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPrice(profit, product.currency)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{product.supplier ?? '—'}</td>
                <td className="px-3 py-2">
                  {stock == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : stock === 0 ? (
                    <span className="text-destructive font-medium">{t('table.outOfStock')}</span>
                  ) : (
                    stock
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_VARIANT[product.status] ?? 'outline'}>
                    {t(`status.${product.status}`)}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{product.variants?.length ?? 0}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {canSell && onSell && product.item_type !== 'insumo' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSell(product)}
                      title="Registrar venda (baixa estoque + insumos)"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canUpdate}
                    onClick={() => onEdit(product)}
                    title={t('actions.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canDelete}
                    onClick={() => onDelete(product)}
                    title={t('actions.delete')}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
