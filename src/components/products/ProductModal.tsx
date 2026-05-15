import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import type {
  Product,
  ProductFormData,
  ProductVariantFormData,
  ProductKind,
  ProductStatus,
  ProductCurrency,
} from '@/types/products';

interface Props {
  open: boolean;
  product?: Product | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ProductFormData, files?: File[]) => Promise<void>;
}

const KINDS: ProductKind[] = ['physical', 'digital'];
const STATUSES: ProductStatus[] = ['active', 'inactive', 'draft'];
const CURRENCIES: ProductCurrency[] = ['BRL', 'USD', 'EUR'];

function emptyForm(): ProductFormData {
  return {
    name: '',
    kind: 'physical',
    description: '',
    sku: '',
    default_price: 0,
    currency: 'BRL',
    purchase_url: '',
    status: 'active',
    stock_quantity: null,
    labels: [],
    variants_attributes: [],
  };
}

function variantToForm(variant: Product['variants'][number]): ProductVariantFormData {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku ?? '',
    price_override: variant.price_override ?? null,
    stock_quantity: variant.stock_quantity ?? null,
    position: variant.position,
    attributes_data: (variant.attributes as Record<string, unknown>) ?? {},
  };
}

export default function ProductModal({ open, product, loading, onOpenChange, onSubmit }: Props) {
  const { t } = useLanguage('products');
  const [form, setForm] = useState<ProductFormData>(emptyForm());
  const [variants, setVariants] = useState<ProductVariantFormData[]>([]);
  const [labelsText, setLabelsText] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const isEdit = useMemo(() => Boolean(product?.id), [product]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        kind: product.kind,
        description: product.description ?? '',
        sku: product.sku ?? '',
        default_price: product.default_price,
        currency: product.currency,
        purchase_url: product.purchase_url ?? '',
        status: product.status,
        stock_quantity: product.stock_quantity ?? null,
        labels: product.labels ?? [],
        variants_attributes: [],
      });
      setVariants((product.variants ?? []).map(variantToForm));
      setLabelsText((product.labels ?? []).join(', '));
    } else {
      setForm(emptyForm());
      setVariants([]);
      setLabelsText('');
    }
    setNewFiles([]);
  }, [open, product]);

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        name: '',
        sku: '',
        price_override: null,
        stock_quantity: null,
        position: prev.length,
        attributes_data: {},
      },
    ]);
  };

  const handleVariantChange = (index: number, patch: Partial<ProductVariantFormData>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const handleVariantRemove = (index: number) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        if (v.id) return { ...v, _destroy: true };
        return null as unknown as ProductVariantFormData;
      }).filter(Boolean) as ProductVariantFormData[],
    );
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    setNewFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const labels = labelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: ProductFormData = {
      ...form,
      labels,
      variants_attributes: variants.map((v, idx) => ({
        ...v,
        position: v.position ?? idx,
      })),
    };

    await onSubmit(payload, newFiles.length > 0 ? newFiles : undefined);
  };

  const canSubmit = form.name.trim().length > 0 && form.default_price >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
          <DialogDescription>{t('modal.subtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">{t('modal.tabs.general')}</TabsTrigger>
            <TabsTrigger value="media">{t('modal.tabs.media')}</TabsTrigger>
            <TabsTrigger value="variants">{t('modal.tabs.variants')}</TabsTrigger>
            <TabsTrigger value="labels">{t('modal.tabs.labels')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 overflow-y-auto pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-name">{t('fields.name')} *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('fields.namePlaceholder')}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t('fields.kind')}</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as ProductKind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`kind.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('fields.status')}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-sku">{t('fields.sku')}</Label>
                <Input
                  id="p-sku"
                  value={form.sku ?? ''}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-stock">{t('fields.stockQuantity')}</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min={0}
                  value={form.stock_quantity ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock_quantity: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-price">{t('fields.defaultPrice')} *</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.default_price}
                  onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t('fields.currency')}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v as ProductCurrency })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-url">{t('fields.purchaseUrl')}</Label>
                <Input
                  id="p-url"
                  type="url"
                  placeholder="https://..."
                  value={form.purchase_url ?? ''}
                  onChange={(e) => setForm({ ...form, purchase_url: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-desc">{t('fields.description')}</Label>
                <Textarea
                  id="p-desc"
                  rows={4}
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('fields.descriptionPlaceholder')}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-3 overflow-y-auto pt-4">
            <div className="border-2 border-dashed rounded-md p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{t('media.uploadHint')}</p>
              <label className="inline-block">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
                  <Plus className="h-4 w-4" />
                  {t('media.selectFiles')}
                </span>
              </label>
            </div>

            {product?.images && product.images.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('media.existing')}</p>
                <div className="grid grid-cols-3 gap-3">
                  {product.images.map((image) => (
                    <div key={image.id} className="border rounded overflow-hidden">
                      <img src={image.url} alt={image.filename} className="w-full h-32 object-cover" />
                      <div className="px-2 py-1 text-xs truncate">{image.filename}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newFiles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">{t('media.pending')}</p>
                <ul className="space-y-1">
                  {newFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                      <span className="truncate">{file.name}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveNewFile(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variants" className="space-y-3 overflow-y-auto pt-4">
            {form.kind === 'digital' && (
              <p className="text-xs text-muted-foreground">{t('variants.digitalHint')}</p>
            )}

            <div className="space-y-2">
              {variants.filter((v) => !v._destroy).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">
                  {t('variants.empty')}
                </p>
              )}
              {variants.map((variant, idx) => {
                if (variant._destroy) return null;
                return (
                  <div key={variant.id ?? `new-${idx}`} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                    <div className="col-span-4 space-y-1.5">
                      <Label className="text-xs">{t('variants.name')}</Label>
                      <Input
                        value={variant.name}
                        onChange={(e) => handleVariantChange(idx, { name: e.target.value })}
                        placeholder="P / M / G"
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      <Label className="text-xs">{t('variants.sku')}</Label>
                      <Input
                        value={variant.sku ?? ''}
                        onChange={(e) => handleVariantChange(idx, { sku: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">{t('variants.priceOverride')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={variant.price_override ?? ''}
                        onChange={(e) =>
                          handleVariantChange(idx, {
                            price_override: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">{t('variants.stock')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={variant.stock_quantity ?? ''}
                        onChange={(e) =>
                          handleVariantChange(idx, {
                            stock_quantity: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVariantRemove(idx)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" size="sm" onClick={handleAddVariant}>
              <Plus className="h-4 w-4 mr-2" />
              {t('variants.add')}
            </Button>
          </TabsContent>

          <TabsContent value="labels" className="space-y-2 overflow-y-auto pt-4">
            <Label htmlFor="p-labels">{t('fields.labels')}</Label>
            <Textarea
              id="p-labels"
              rows={3}
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              placeholder={t('fields.labelsPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('fields.labelsHint')}</p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit}>
            {loading ? t('actions.saving') : isEdit ? t('actions.update') : t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
