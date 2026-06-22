import { useLanguage } from '@/hooks/useLanguage';
import { Button, Badge } from '@evoapi/design-system';
import { Pencil, Trash2, Package, Cloud } from 'lucide-react';
import type { Product } from '@/types/products';
import { stockInfo } from './productStock';

interface Props {
  products: Product[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
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
  onEdit,
  onDelete,
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
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 w-10"></th>
            <th className="px-3 py-2">{t('table.columns.name')}</th>
            <th className="px-3 py-2">{t('table.columns.sku')}</th>
            <th className="px-3 py-2">{t('table.columns.kind')}</th>
            <th className="px-3 py-2">{t('table.columns.price')}</th>
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
            return (
              <tr key={product.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </td>
                <td className="px-3 py-2 font-medium">{product.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{product.sku ?? '—'}</td>
                <td className="px-3 py-2">{t(`kind.${product.kind}`)}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {formatPrice(product.default_price, product.currency)}
                </td>
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
                <td className="px-3 py-2 text-right">
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
