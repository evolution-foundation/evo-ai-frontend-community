import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Plus, Trash2, Upload, X, ImageIcon } from 'lucide-react';
import type {
  Product,
  ProductFormData,
  ProductVariantFormData,
  ProductKind,
  ProductStatus,
  ProductCurrency,
} from '@/types/products';

// default_price is nullable in the form so an empty input stays empty (not 0),
// letting validation require an explicit price. It is coerced on submit.
type ProductFormState = Omit<ProductFormData, 'default_price'> & { default_price: number | null };

interface Props {
  open: boolean;
  product?: Product | null;
  loading: boolean;
  errors?: Record<string, string>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ProductFormData, files?: File[]) => Promise<void>;
}

const KINDS: ProductKind[] = ['physical', 'digital'];
const STATUSES: ProductStatus[] = ['active', 'inactive', 'draft'];
const CURRENCIES: ProductCurrency[] = ['BRL', 'USD', 'EUR'];
const URL_REGEX = /^https?:\/\/.+/i;

// Empty input → null; non-numeric input (e.g. a pasted string) → null instead of NaN,
// which would otherwise leak into the payload and bypass form validation.
function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    kind: 'physical',
    description: '',
    sku: '',
    default_price: null,
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

export default function ProductModal({ open, product, loading, errors, onOpenChange, onSubmit }: Props) {
  const { t } = useLanguage('products');
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [variants, setVariants] = useState<ProductVariantFormData[]>([]);
  const [labelsText, setLabelsText] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  // EVO-2226: raw image files picked in the Media tab, uploaded on submit.
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs for previewing pending picks; revoked when the set changes/unmounts.
  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => filePreviews.forEach((p) => URL.revokeObjectURL(p.url)), [filePreviews]);

  const isEdit = useMemo(() => Boolean(product?.id), [product]);
  const isPhysical = form.kind === 'physical';

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
    setFiles([]);
    setTouched({});
    setSubmitAttempted(false);
    setActiveTab('general');
  }, [open, product]);

  const clientErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t('validation.nameRequired');
    if (form.default_price == null) e.default_price = t('validation.priceRequired');
    else if (form.default_price < 0) e.default_price = t('validation.priceMin');
    if (form.purchase_url && !URL_REGEX.test(form.purchase_url)) e.purchase_url = t('validation.urlInvalid');
    return e;
  }, [form.name, form.default_price, form.purchase_url, t]);

  const fieldError = (key: string): string | undefined =>
    errors?.[key] ?? (submitAttempted || touched[key] ? clientErrors[key] : undefined);

  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));
  const canSubmit = Object.keys(clientErrors).length === 0;

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { name: '', sku: '', price_override: null, stock_quantity: null, position: prev.length, attributes_data: {} },
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

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!canSubmit) {
      setActiveTab('general');
      return;
    }

    const labels = labelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: ProductFormData = {
      ...form,
      default_price: form.default_price ?? 0,
      stock_quantity: isPhysical ? form.stock_quantity : null,
      labels,
      variants_attributes: variants.map((v, idx) => ({
        ...v,
        stock_quantity: isPhysical ? v.stock_quantity : null,
        position: v.position ?? idx,
      })),
    };

    await onSubmit(payload, files.length ? files : undefined);
  };

  const handleFilesPicked = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...picked]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
          <DialogDescription>{t('modal.subtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          {/*
            EVO-2226: Media tab restored. The backend (products_controller#attach_images)
            now accepts raw multipart uploads (validated type + size), which is what
            productsService.buildFormData already sends as product[images][].
          */}
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">{t('modal.tabs.general')}</TabsTrigger>
            <TabsTrigger value="media">{t('modal.tabs.media')}</TabsTrigger>
            <TabsTrigger value="variants">{t('modal.tabs.variants')}</TabsTrigger>
            <TabsTrigger value="labels">{t('modal.tabs.labels')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 overflow-y-auto pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-name">
                  {t('fields.name')} <span aria-hidden="true">*</span>
                </Label>
                <Input
                  id="p-name"
                  aria-required="true"
                  aria-invalid={Boolean(fieldError('name'))}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onBlur={() => markTouched('name')}
                  placeholder={t('fields.namePlaceholder')}
                />
                {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-kind">{t('fields.kind')}</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => {
                    const kind = v as ProductKind;
                    setForm({ ...form, kind, stock_quantity: kind === 'physical' ? form.stock_quantity : null });
                  }}
                >
                  <SelectTrigger id="p-kind">
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
                {!isPhysical && (
                  <p className="text-xs text-muted-foreground">{t('fields.digitalNoStockHint')}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-status">{t('fields.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}>
                  <SelectTrigger id="p-status">
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

              <div className="col-span-2 grid grid-cols-3 gap-3 items-start">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-price">
                    {t('fields.defaultPrice')} <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="p-price"
                    type="number"
                    step="0.01"
                    min={0}
                    aria-required="true"
                    aria-invalid={Boolean(fieldError('default_price'))}
                    value={form.default_price ?? ''}
                    placeholder="0,00"
                    onChange={(e) =>
                      setForm({ ...form, default_price: toNumberOrNull(e.target.value) })
                    }
                    onBlur={() => markTouched('default_price')}
                  />
                  {fieldError('default_price') && (
                    <p className="text-xs text-destructive">{fieldError('default_price')}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-currency">{t('fields.currency')}</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v as ProductCurrency })}>
                    <SelectTrigger id="p-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`currency.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={isPhysical ? 'space-y-1.5' : 'col-span-2 space-y-1.5'}>
                <Label htmlFor="p-sku">{t('fields.sku')}</Label>
                <Input
                  id="p-sku"
                  aria-invalid={Boolean(fieldError('sku'))}
                  value={form.sku ?? ''}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder={t('fields.skuPlaceholder')}
                />
                {fieldError('sku') && <p className="text-xs text-destructive">{fieldError('sku')}</p>}
              </div>

              {isPhysical && (
                <div className="space-y-1.5">
                  <Label htmlFor="p-stock">{t('fields.stockQuantity')}</Label>
                  <Input
                    id="p-stock"
                    type="number"
                    min={0}
                    value={form.stock_quantity ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, stock_quantity: toNumberOrNull(e.target.value) })
                    }
                  />
                </div>
              )}

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-url">{t('fields.purchaseUrl')}</Label>
                <Input
                  id="p-url"
                  type="url"
                  aria-invalid={Boolean(fieldError('purchase_url'))}
                  placeholder={t('fields.purchaseUrlPlaceholder')}
                  value={form.purchase_url ?? ''}
                  onChange={(e) => setForm({ ...form, purchase_url: e.target.value })}
                  onBlur={() => markTouched('purchase_url')}
                />
                {fieldError('purchase_url') && (
                  <p className="text-xs text-destructive">{fieldError('purchase_url')}</p>
                )}
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

          <TabsContent value="media" className="space-y-4 overflow-y-auto pt-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">{t('media.uploadHint')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                data-testid="product-image-input"
                onChange={(e) => handleFilesPicked(e.target.files)}
              />
              <Button type="button" variant="outline" className="mt-3" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t('media.selectFiles')}
              </Button>
            </div>

            {isEdit && (product?.images?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>{t('media.existing')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {product!.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.filename}
                      className="aspect-square w-full rounded border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {filePreviews.length > 0 && (
              <div className="space-y-2">
                <Label>{t('media.pending')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {filePreviews.map((preview, index) => (
                    <div key={preview.url} className="relative">
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        className="aspect-square w-full rounded border object-cover"
                      />
                      <button
                        type="button"
                        aria-label={t('actions.delete')}
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variants" className="space-y-3 overflow-y-auto pt-4">
            {!isPhysical && (
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
                      <Label htmlFor={`p-variant-${idx}-name`} className="text-xs">{t('variants.name')}</Label>
                      <Input
                        id={`p-variant-${idx}-name`}
                        aria-required="true"
                        value={variant.name}
                        onChange={(e) => handleVariantChange(idx, { name: e.target.value })}
                        placeholder={t('variants.namePlaceholder')}
                      />
                    </div>
                    <div className={isPhysical ? 'col-span-3 space-y-1.5' : 'col-span-5 space-y-1.5'}>
                      <Label htmlFor={`p-variant-${idx}-sku`} className="text-xs">{t('variants.sku')}</Label>
                      <Input
                        id={`p-variant-${idx}-sku`}
                        value={variant.sku ?? ''}
                        onChange={(e) => handleVariantChange(idx, { sku: e.target.value })}
                      />
                    </div>
                    <div className={isPhysical ? 'col-span-2 space-y-1.5' : 'col-span-2 space-y-1.5'}>
                      <Label htmlFor={`p-variant-${idx}-price`} className="text-xs">{t('variants.priceOverride')}</Label>
                      <Input
                        id={`p-variant-${idx}-price`}
                        type="number"
                        step="0.01"
                        min={0}
                        value={variant.price_override ?? ''}
                        onChange={(e) =>
                          handleVariantChange(idx, {
                            price_override: toNumberOrNull(e.target.value),
                          })
                        }
                      />
                    </div>
                    {isPhysical && (
                      <div className="col-span-2 space-y-1.5">
                        <Label htmlFor={`p-variant-${idx}-stock`} className="text-xs">{t('variants.stock')}</Label>
                        <Input
                          id={`p-variant-${idx}-stock`}
                          type="number"
                          min={0}
                          value={variant.stock_quantity ?? ''}
                          onChange={(e) =>
                            handleVariantChange(idx, {
                              stock_quantity: toNumberOrNull(e.target.value),
                            })
                          }
                        />
                      </div>
                    )}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVariantRemove(idx)}
                        className="text-destructive hover:text-destructive"
                        aria-label={t('actions.delete')}
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

        <DialogFooter className="pt-2 items-center">
          <p
            className={`text-xs mr-auto ${submitAttempted && !canSubmit ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {submitAttempted && !canSubmit ? t('validation.fixErrors') : t('validation.requiredLegend')}
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('actions.saving') : isEdit ? t('actions.update') : t('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
