import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@evoapi/design-system';
import { Plus, Trash2 } from 'lucide-react';
import { productsService } from '@/services/products/productsService';
import type {
  PipelineItemProductLink,
  Product,
  ProductCurrency,
} from '@/types/products';

interface Props {
  pipelineItemId: string;
  canEdit?: boolean;
}

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

export default function PipelineItemProductsPanel({ pipelineItemId, canEdit = true }: Props) {
  const { t } = useLanguage('products');
  const [links, setLinks] = useState<PipelineItemProductLink[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [currency, setCurrency] = useState<ProductCurrency>('BRL');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!pipelineItemId) return;
    setLoading(true);
    try {
      const res = await productsService.listPipelineItemProducts(pipelineItemId);
      setLinks(res.data ?? []);
      setTotalValue(res.meta?.total_value ?? 0);
      const first = res.data?.[0]?.currency;
      if (first) setCurrency(first as ProductCurrency);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [pipelineItemId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = async () => {
    try {
      const res = await productsService.getProducts({ per_page: 500, status: 'active' });
      setProductOptions(res.data ?? []);
      setSelectedProductId('');
      setSelectedVariantId('');
      setQuantity(1);
      setNotes('');
      setAddOpen(true);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    }
  };

  const selectedProduct = productOptions.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants ?? [];

  const handleAdd = async () => {
    if (!selectedProductId || quantity < 1) return;
    setBusy(true);
    try {
      await productsService.addProductToPipelineItem(pipelineItemId, {
        product_id: selectedProductId,
        product_variant_id: selectedVariantId || null,
        quantity,
        notes: notes || undefined,
      });
      toast.success(t('pipelinePanel.added'));
      setAddOpen(false);
      load();
    } catch (error) {
      console.error(error);
      toast.error(t('pipelinePanel.addError'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    setBusy(true);
    try {
      await productsService.removeProductFromPipelineItem(pipelineItemId, linkId);
      toast.success(t('pipelinePanel.removed'));
      load();
    } catch (error) {
      console.error(error);
      toast.error(t('pipelinePanel.removeError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('pipelinePanel.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {links.length === 0
              ? t('pipelinePanel.empty')
              : t('pipelinePanel.summary', { count: links.length, total: formatPrice(totalValue, currency) })}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openAdd} disabled={busy}>
            <Plus className="h-4 w-4 mr-1" />
            {t('pipelinePanel.add')}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('page.loading')}</p>
      ) : (
        <div className="border rounded-md divide-y">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('pipelinePanel.emptyList')}
            </p>
          ) : (
            links.map((link) => (
              <div key={link.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1">
                  <div className="font-medium">
                    {link.product?.name}
                    {link.product_variant?.name && (
                      <span className="text-muted-foreground text-xs ml-1">
                        / {link.product_variant.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {link.quantity} × {formatPrice(link.locked_unit_price, link.currency)}
                  </div>
                </div>
                <div className="text-sm font-mono">
                  {formatPrice(link.subtotal, link.currency)}
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(link.id)}
                    disabled={busy}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pipelinePanel.add')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">{t('pipelinePanel.product')}</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('pipelinePanel.selectProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({formatPrice(p.default_price, p.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {variants.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">{t('pipelinePanel.variant')}</label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('pipelinePanel.selectVariant')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('pipelinePanel.noVariant')}</SelectItem>
                    {variants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground">{t('pipelinePanel.quantity')}</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">{t('pipelinePanel.notes')}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={busy || !selectedProductId || quantity < 1}>
              {busy ? t('actions.saving') : t('pipelinePanel.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
