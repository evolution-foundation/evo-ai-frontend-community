import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { assetUrl } from '@/utils/assetUrl';
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
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
} from '@evoapi/design-system';
import {
  Plus,
  Trash2,
  Boxes,
  Ruler,
  Store,
  FolderPlus,
  ChevronDown,
  ImagePlus,
  ImageIcon,
  Link2,
  X,
  Search,
  PlayCircle,
  Upload,
  PackageSearch,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Product,
  ProductFormData,
  ProductVariantFormData,
  ProductKind,
  ProductItemType,
  ProductStatus,
  ProductCurrency,
  ProductMedia,
  ProductMediaKind,
  ProductIngredientFormData,
  ProductCategory,
} from '@/types/products';
import { productsService } from '@/services/products/productsService';
import { productCategoriesService } from '@/services/products/productCategoriesService';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const resolveMediaUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('//') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

type ProductFormState = Omit<ProductFormData, 'default_price'> & {
  default_price: number | null;
  item_type: ProductItemType;
  cost_price: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  supplier: string;
  material: string;
  color: string;
  size: string;
  ml_category: string;
  ml_buying_model: string;
  ml_listing_type: string;
  ml_condition: string;
  brand: string;
  model: string;
  compatible_brands: string;
  accessory_type: string;
  anatel_number: string;
  equipamento_tipo: string;
  publish_ml: boolean;
};

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
const VIDEO_RE = /^video\//i;

// Kept in step with Products::ImagePolicy on the API side.
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 10;

type RejectedFile = { name: string; reason: 'invalidType' | 'tooLarge' | 'tooMany' };

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
    item_type: 'produto',
    description: '',
    sku: '',
    default_price: null,
    cost_price: null,
    currency: 'BRL',
    purchase_url: '',
    status: 'active',
    stock_quantity: null,
    supplier: '',
    material: '',
    color: '',
    size: '',
    weight_kg: null,
    height_cm: null,
    width_cm: null,
    length_cm: null,
    ml_category: 'MLB1012',
    ml_buying_model: 'buy_it_now',
    ml_listing_type: 'gold_pro',
    ml_condition: 'new',
    brand: 'Genérico',
    model: '',
    compatible_brands: '',
    accessory_type: '',
    anatel_number: '',
    equipamento_tipo: '',
    publish_ml: false,
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

function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: ProductCategory[];
  onCreate: (name: string) => void;
}

function CategoryCombobox({ value, onChange, suggestions, onCreate }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const term = value.trim().toLowerCase();
  const exact = suggestions.filter((s) => s.name.toLowerCase() === term);
  const matches = suggestions.filter(
    (s) =>
      s.name.toLowerCase() !== term &&
      (term === '' || s.name.toLowerCase().includes(term)),
  );
  const showCreate = term !== '' && exact.length === 0;
  const items = [...exact, ...matches].slice(0, 12);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="p-category" className="mb-1.5 block w-full">
          Categoria
        </Label>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id="p-category"
            value={value}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setOpen(false), 120);
            }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              if (blurTimer.current) {
                window.clearTimeout(blurTimer.current);
                blurTimer.current = null;
              }
              onChange(e.target.value);
              setOpen(true);
            }}
            placeholder="Digite ou escolha uma categoria"
            className="pr-8"
          />
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Adicionar nova categoria"
          onMouseDown={(e: React.MouseEvent) => {
            e.preventDefault();
            const name = value.trim();
            if (!name) {
              toast.error('Digite o nome da nova categoria');
              return;
            }
            onCreate(name);
          }}
        >
          <FolderPlus className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {items.length === 0 && !showCreate ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">
              {suggestions.length === 0
                ? 'Nenhuma categoria cadastrada ainda.'
                : 'Nenhuma categoria correspondente.'}
            </div>
          ) : null}
          {items.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onMouseDown={(e) => {
                e.preventDefault();
                select(cat.name);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
            >
              <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
              {cat.name}
            </button>
          ))}
          {showCreate ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreate(value.trim());
              }}
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted transition-colors cursor-pointer border-t border-border flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar categoria &ldquo;{value.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface IngredientRowProps {
  value: ProductIngredientFormData;
  index: number;
  onChange: (patch: Partial<ProductIngredientFormData>) => void;
  onRemove: () => void;
}

function IngredientRow({ value, index, onChange, onRemove }: IngredientRowProps) {
  const [query, setQuery] = useState(value.name ?? '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const searchTimer = useRef<number | null>(null);

  const runSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await productsService.getProducts({ q: term.trim(), per_page: 10, status: 'active' });
      setResults(res.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (next: string) => {
    setQuery(next);
    onChange({ name: next, ingredient_product_id: value.ingredient_product_id ? '' : value.ingredient_product_id });
    setOpen(true);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => runSearch(next), 350);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center border rounded-md p-3">
      <div className={value.ingredient_product_id ? 'col-span-5' : 'col-span-5 relative'}>
        <Label htmlFor={`p-ing-${index}-name`} className="text-xs">Insumo</Label>
        {value.ingredient_product_id ? (
          <div className="flex items-center justify-between gap-1 rounded-md border border-border px-2.5 py-1.5 min-h-8">
            <span className="text-sm truncate flex items-center gap-1.5">
              <PackageSearch className="w-3.5 h-3.5 text-muted-foreground" />
              {value.name}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange({ ingredient_product_id: '', name: '' });
                setQuery('');
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Input
                id={`p-ing-${index}-name`}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => {
                  setOpen(true);
                  if (query.trim()) runSearch(query);
                }}
                onBlur={() => {
                  blurTimer.current = window.setTimeout(() => setOpen(false), 140);
                }}
                placeholder="Buscar produto do estoque..."
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            {open && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                {searching ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
                ) : (
                  results.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange({ ingredient_product_id: p.id, name: p.name });
                        setQuery(p.name);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{p.name}</span>
                      {p.stock_quantity != null && (
                        <Badge variant="outline" className="shrink-0">
                          estoque: {p.stock_quantity}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
      <div className="col-span-3 space-y-1.5">
        <Label htmlFor={`p-ing-${index}-qty`} className="text-xs">Quantidade</Label>
        <Input
          id={`p-ing-${index}-qty`}
          type="number"
          min={0}
          step="0.001"
          value={value.quantity ?? ''}
          placeholder="0"
          onChange={(e) => onChange({ quantity: toNumberOrNull(e.target.value) })}
        />
      </div>
      <div className="col-span-3 space-y-1.5">
        <Label htmlFor={`p-ing-${index}-unit`} className="text-xs">Unidade</Label>
        <Input
          id={`p-ing-${index}-unit`}
          value={value.unit}
          placeholder="Ex: un, g, kg"
          onChange={(e) => onChange({ unit: e.target.value })}
        />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remover insumo" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface MediaItemProps {
  item: ProductMedia;
  onRemove: () => void;
}

function MediaItem({ item, onRemove }: MediaItemProps) {
  const url = resolveMediaUrl(item.url);
  return (
    <div className="relative group border rounded-md overflow-hidden aspect-square">
      {item.kind === 'video' ? (
        <video src={url} className="w-full h-full object-cover" muted playsInline />
      ) : (
        <img src={url} alt={item.url} className="w-full h-full object-cover" />
      )}
      <span className="absolute top-1.5 left-1.5">
        {item.kind === 'video' ? (
          <Badge variant="secondary" className="gap-1 text-[10px] px-1.5">
            <PlayCircle className="w-3 h-3" /> vídeo
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] px-1.5">imagem</Badge>
        )}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 rounded-full bg-black/50 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        aria-label="Remover mídia"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface GalleryItem {
  url: string;
  kind: ProductMediaKind;
  source: 'gallery';
  productName?: string;
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
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs for previewing pending picks; revoked when the set changes/unmounts.
  const filePreviews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => filePreviews.forEach((p) => URL.revokeObjectURL(p.url)), [filePreviews]);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryName, setCategoryName] = useState('');

  const [media, setMedia] = useState<ProductMedia[]>([]);
  const [ingredients, setIngredients] = useState<ProductIngredientFormData[]>([]);

  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaKind, setMediaKind] = useState<ProductMediaKind>('image');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');

  const isEdit = useMemo(() => Boolean(product?.id), [product]);
  const existingImageCount = product?.images?.length ?? 0;
  const isPhysical = form.kind === 'physical';
  const isServico = form.item_type === 'servico';

  const profit = useMemo(() => {
    if (form.default_price == null || form.cost_price == null) return null;
    return form.default_price - form.cost_price;
  }, [form.default_price, form.cost_price]);

  useEffect(() => {
    if (!open) return;
    setForm(
      product
        ? {
            name: product.name,
            kind: product.kind,
            item_type: (product.item_type && ['produto', 'produto_ml', 'servico', 'insumo'].includes(product.item_type)) ? product.item_type : 'produto',
            description: product.description ?? '',
            sku: product.sku ?? '',
            default_price: product.default_price,
            cost_price: product.cost_price ?? null,
            currency: product.currency,
            purchase_url: product.purchase_url ?? '',
            status: product.status,
            stock_quantity: product.stock_quantity ?? null,
            supplier: product.supplier ?? '',
            material: product.material ?? '',
            color: product.color ?? '',
            size: product.size ?? '',
            weight_kg: product.weight_kg ?? null,
            height_cm: product.height_cm ?? null,
            width_cm: product.width_cm ?? null,
            length_cm: product.length_cm ?? null,
            ml_category: product.ml_category ?? 'MLB1012',
            ml_buying_model: product.ml_buying_model ?? 'buy_it_now',
            ml_listing_type: product.ml_listing_type ?? 'gold_pro',
            ml_condition: product.ml_condition ?? 'new',
            model: product.model ?? '',
            compatible_brands: product.compatible_brands ?? '',
            accessory_type: product.accessory_type ?? '',
            anatel_number: product.anatel_number ?? '',
            equipamento_tipo: product.equipamento_tipo ?? '',
            publish_ml: product.publish_ml ?? false,
            labels: product.labels ?? [],
            variants_attributes: [],
          }
        : emptyForm(),
    );
    setVariants(product ? (product.variants ?? []).map(variantToForm) : []);
    setLabelsText(product ? (product.labels ?? []).join(', ') : '');
    setCategoryName(product?.category_name ?? '');
    setMedia(product?.media ?? []);
    setIngredients(
      product?.ingredients?.map((i) => ({
        id: i.id,
        ingredient_product_id: i.ingredient_product_id,
        name: i.name ?? '',
        quantity: i.quantity,
        unit: i.unit,
      })) ?? [],
    );
    setMediaUrl('');
    setMediaKind('image');
    setFiles([]);
    setRejectedFiles([]);
    setTouched({});
    setSubmitAttempted(false);
    setActiveTab('general');
    setCategories([]);
    productCategoriesService
      .listCategories('')
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
  }, [open, product]);

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (c) => c && c.name && categoryName && typeof categoryName === 'string' && c.name.toLowerCase() === categoryName.trim().toLowerCase(),
      ),
    [categories, categoryName],
  );

  const clientErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!form.name || typeof form.name !== 'string' || !form.name.trim()) e.name = t('validation.nameRequired');
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
      prev
        .map((v, i) => {
          if (i !== index) return v;
          if (v.id) return { ...v, _destroy: true };
          return null as unknown as ProductVariantFormData;
        })
        .filter(Boolean) as ProductVariantFormData[],
    );
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { ingredient_product_id: '', name: '', quantity: null, unit: 'un' },
    ]);
  };

  const handleIngredientChange = (index: number, patch: Partial<ProductIngredientFormData>) => {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));
  };

  const handleIngredientRemove = (index: number) => {
    setIngredients((prev) =>
      prev
        .map((ing, i) => {
          if (i !== index) return ing;
          if (ing.id) return { ...ing, _destroy: true } as ProductIngredientFormData;
          return null as unknown as ProductIngredientFormData;
        })
        .filter(Boolean) as ProductIngredientFormData[],
    );
  };

  const handleMediaFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const res = await productsService.uploadMediaFile(file);
        const url = res.data?.file_url;
        if (url) {
          setMedia((prev) => [
            ...prev,
            {
              kind: VIDEO_RE.test(file.type) ? 'video' : 'image',
              source: 'upload',
              url,
            },
          ]);
        }
      }
      toast.success('Mídia enviada com sucesso');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar mídia');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    const url = mediaUrl.trim();
    if (!url) {
      toast.error('Informe o link da mídia');
      return;
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      toast.error('Link inválido. Use http:// ou https://');
      return;
    }
    const kind: ProductMediaKind =
      mediaKind === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(url) ? 'video' : 'image';
    setMedia((prev) => [...prev, { kind, source: 'url', url }]);
    setMediaUrl('');
  };

  const openGallery = async () => {
    setGalleryOpen(true);
    setGalleryLoading(true);
    setGalleryItems([]);
    try {
      const res = await productsService.getProducts({ per_page: 100, status: 'active' });
      const list: GalleryItem[] = [];
      (res.data ?? []).forEach((p) => {
        (p.media ?? []).forEach((m) => {
          list.push({ url: m.url, kind: m.kind, source: 'gallery', productName: p.name });
        });
        (p.images ?? []).forEach((img) => {
          list.push({ url: img.url, kind: 'image', source: 'gallery', productName: p.name });
        });
      });
      setGalleryItems(list);
    } catch (err) {
      console.error(err);
      toast.error('Falha ao carregar mídias existentes');
    } finally {
      setGalleryLoading(false);
    }
  };

  const filteredGallery = useMemo(() => {
    const term = gallerySearch.trim().toLowerCase();
    if (!term) return galleryItems;
    return galleryItems.filter((g) => (g.productName ?? '').toLowerCase().includes(term));
  }, [galleryItems, gallerySearch]);

  const handlePickGalleryItem = (item: GalleryItem) => {
    setMedia((prev) => [
      ...prev,
      { kind: item.kind, source: 'gallery', url: resolveMediaUrl(item.url) },
    ]);
    toast.success('Mídia adicionada');
    setGalleryOpen(false);
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

    const effectiveItemType: ProductItemType = form.item_type;

    let categoryId: string | null = null;
    const catName = categoryName.trim();
    if (catName) {
      if (selectedCategory) {
        categoryId = selectedCategory.id;
      } else {
        try {
          const created = await productCategoriesService.createCategory(catName);
          setCategories((prev) => [...prev, created]);
          categoryId = created.id;
        } catch {
          toast.error('Falha ao criar a categoria');
          return;
        }
      }
    }

    const payload: ProductFormData = {
      ...form,
      item_type: effectiveItemType,
      default_price: form.default_price ?? 0,
      cost_price: isServico ? form.cost_price : form.cost_price,
      stock_quantity: isServico || !isPhysical ? null : form.stock_quantity,
      material: isServico ? form.material : form.material,
      category_id: categoryId,
      labels,
      media: media.filter((m) => m.url.trim() !== ''),
      variants_attributes: isServico
        ? []
        : variants.map((v, idx) => ({
            ...v,
            stock_quantity: isPhysical ? v.stock_quantity : null,
            position: v.position ?? idx,
          })),
      product_ingredients_attributes: isServico
        ? []
        : ingredients
            .filter((ing) => ing.ingredient_product_id)
            .map((ing) => ({
              id: ing.id,
              _destroy: ing._destroy,
              ingredient_product_id: ing.ingredient_product_id,
              quantity: ing.quantity ?? 0,
              unit: ing.unit || 'un',
            })),
    };

    await onSubmit(payload, files.length ? files : undefined);
  };

  // Mirrors Products::ImagePolicy. Not a security control: it exists so a refused file
  // says why, instead of the product saving without the image.
  const handleFilesPicked = (list: FileList | null) => {
    if (!list) return;

    const rejected: RejectedFile[] = [];
    const accepted: File[] = [];
    let slots = MAX_IMAGES_PER_PRODUCT - (existingImageCount + files.length);

    Array.from(list).forEach((file) => {
      if (!file.type.startsWith('image/') || !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        rejected.push({ name: file.name, reason: 'invalidType' });
      } else if (file.size > MAX_IMAGE_BYTES) {
        rejected.push({ name: file.name, reason: 'tooLarge' });
      } else if (slots <= 0) {
        rejected.push({ name: file.name, reason: 'tooMany' });
      } else {
        accepted.push(file);
        slots -= 1;
      }
    });

    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setRejectedFiles(rejected);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    handleFilesPicked(event.dataTransfer?.files ?? null);
  };

  const numInput = (
    key: 'cost_price' | 'weight_kg' | 'height_cm' | 'width_cm' | 'length_cm',
    label: string,
    placeholder: string,
    step = '0.01',
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${key}`}>{label}</Label>
      <Input
        id={`p-${key}`}
        type="number"
        step={step}
        min={0}
        value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: toNumberOrNull(e.target.value) })}
      />
    </div>
  );

  const textInput = (
    key:
      | 'supplier'
      | 'color'
      | 'size'
      | 'ml_category'
      | 'ml_buying_model'
      | 'ml_listing_type'
      | 'ml_condition'
      | 'brand'
      | 'model'
      | 'compatible_brands'
      | 'accessory_type'
      | 'anatel_number',
    label: string,
    placeholder: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${key}`}>{label}</Label>
      <Input
        id={`p-${key}`}
        value={form[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

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
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            <TabsTrigger value="general">{t('modal.tabs.general')}</TabsTrigger>
            <TabsTrigger value="media">{t('modal.tabs.media')}</TabsTrigger>
            <TabsTrigger value="variants">{t('modal.tabs.variants')}</TabsTrigger>
            <TabsTrigger value="ingredients">Insumos</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="labels">{t('modal.tabs.labels')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 overflow-y-auto pt-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="mb-1.5 block">Tipo de Item</Label>
                  <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, item_type: 'produto', publish_ml: false })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          form.item_type === 'produto'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Boxes className="w-4 h-4" /> Produto
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, item_type: 'produto_ml', publish_ml: true })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          form.item_type === 'produto_ml'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <PackageSearch className="w-4 h-4" /> Produto (ML)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, item_type: 'insumo', publish_ml: false })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          form.item_type === 'insumo'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Boxes className="w-4 h-4" /> Insumo
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, item_type: 'servico', publish_ml: false })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          form.item_type === 'servico'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Wrench className="w-4 h-4" /> Serviço
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, item_type: 'equipamento', publish_ml: false })}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                          form.item_type === 'equipamento'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Wrench className="w-4 h-4" /> Equipamento
                      </button>
                    </div>
                  </div>

              {form.item_type === 'equipamento' && (
                <div className="col-span-2 space-y-1.5 border p-3 rounded-md bg-muted/30">
                  <Label htmlFor="p-equipamento-tipo">Tipo de Equipamento</Label>
                  <Select
                    value={form.equipamento_tipo || 'maquina'}
                    onValueChange={(v) => setForm({ ...form, equipamento_tipo: v })}
                  >
                    <SelectTrigger id="p-equipamento-tipo">
                      <SelectValue placeholder="Selecione o tipo de equipamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maquina">Máquina</SelectItem>
                      <SelectItem value="escritorio">Item de Escritório</SelectItem>
                      <SelectItem value="cozinha">Cozinha</SelectItem>
                      <SelectItem value="ti">TI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              <div className="col-span-2 relative">
                <CategoryCombobox
                  value={categoryName}
                  onChange={setCategoryName}
                  suggestions={categories}
                  onCreate={(name) => {
                    productCategoriesService
                      .createCategory(name)
                      .then((created) => {
                        setCategories((prev) => [...prev, created]);
                        setCategoryName(created.name);
                        toast.success(`Categoria "${created.name}" criada`);
                      })
                      .catch(() => toast.error('Falha ao criar a categoria'));
                  }}
                />
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
                {!isPhysical && <p className="text-xs text-muted-foreground">{t('fields.digitalNoStockHint')}</p>}
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
                <div className="col-span-1 space-y-1.5">
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
                    onChange={(e) => setForm({ ...form, default_price: toNumberOrNull(e.target.value) })}
                    onBlur={() => markTouched('default_price')}
                  />
                  {fieldError('default_price') && (
                    <p className="text-xs text-destructive">{fieldError('default_price')}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="p-cost">Custo (R$)</Label>
                  <Input
                    id="p-cost"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.cost_price ?? ''}
                    placeholder="0,00"
                    onChange={(e) => setForm({ ...form, cost_price: toNumberOrNull(e.target.value) })}
                  />
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

              {profit != null && (
                <div className="col-span-2 px-3 py-2 rounded-md bg-muted text-sm">
                  <span className="text-muted-foreground">Lucro: </span>
                  <span className={`font-semibold ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatBRL(profit)}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
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
                    onChange={(e) => setForm({ ...form, stock_quantity: toNumberOrNull(e.target.value) })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="p-supplier">Fornecedor</Label>
                <Input
                  id="p-supplier"
                  value={form.supplier ?? ''}
                  placeholder="Nome do fornecedor"
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-link">
                  {isPhysical ? 'Link do Produto' : t('fields.purchaseUrl')}
                </Label>
                <Input
                  id="p-link"
                  type="url"
                  aria-invalid={Boolean(fieldError('purchase_url'))}
                  placeholder={
                    isPhysical
                      ? 'https://exemplo.com/produto'
                      : t('fields.purchaseUrlPlaceholder')
                  }
                  value={form.purchase_url ?? ''}
                  onChange={(e) => setForm({ ...form, purchase_url: e.target.value })}
                  onBlur={() => markTouched('purchase_url')}
                />
                {fieldError('purchase_url') && (
                  <p className="text-xs text-destructive">{fieldError('purchase_url')}</p>
                )}
              </div>

              {isServico && (
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-material">Material Necessário</Label>
                  <Textarea
                    id="p-material"
                    rows={3}
                    value={form.material ?? ''}
                    onChange={(e) => setForm({ ...form, material: e.target.value })}
                    placeholder="Descreva o material necessário para o serviço"
                  />
                </div>
              )}

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
            <div
              data-testid="product-image-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
                dragging ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">{t('media.uploadHint')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('media.limits', { max: MAX_IMAGES_PER_PRODUCT, size: MAX_IMAGE_BYTES / (1024 * 1024) })}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
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

            {rejectedFiles.length > 0 && (
              <ul className="space-y-1 text-xs text-destructive" data-testid="product-image-rejections">
                {rejectedFiles.map((rejected) => (
                  <li key={`${rejected.name}-${rejected.reason}`}>
                    {t(`media.rejected.${rejected.reason}`, {
                      name: rejected.name,
                      max: MAX_IMAGES_PER_PRODUCT,
                      size: MAX_IMAGE_BYTES / (1024 * 1024),
                    })}
                  </li>
                ))}
              </ul>
            )}

            {isEdit && (product?.images?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <Label>{t('media.existing')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {product!.images.map((img) => (
                    <img
                      key={img.id}
                      src={assetUrl(img.url)}
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
                    <div key={`${preview.file.name}-${preview.file.size}-${index}`} className="relative">
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

            {/* Segunda seção da aba Mídia: biblioteca/galeria e mídia por URL
               (complementar ao upload por arquivo acima; usa o campo `media`,
               enviado à parte do multipart `images`). */}
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => handleMediaFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Enviando...' : 'Subir arquivo'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={openGallery}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Escolher das existentes
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={mediaKind} onValueChange={(v) => setMediaKind(v as ProductMediaKind)}>
                <SelectTrigger className="w-auto min-w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1 min-w-[220px]"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddMediaUrl}>
                <Plus className="h-4 w-4 mr-1" />
                <Link2 className="h-4 w-4 mr-2" />
                Adicionar Link
              </Button>
            </div>

            {media.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded">
                Nenhuma imagem ou vídeo adicionado. Use as opções acima.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {media.map((item, idx) => (
                  <MediaItem
                    key={item.id ?? `m-${idx}`}
                    item={item}
                    onRemove={() =>
                      setMedia((prev) => prev.filter((_, i) => i !== idx))
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="variants" className="space-y-3 overflow-y-auto pt-4">
            {!isPhysical && <p className="text-xs text-muted-foreground">{t('variants.digitalHint')}</p>}

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
                    <div className="col-span-2 space-y-1.5">
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

            {!isServico && (
              <Button variant="outline" size="sm" onClick={handleAddVariant}>
                <Plus className="h-4 w-4 mr-2" />
                {t('variants.add')}
              </Button>
            )}
          </TabsContent>


          <TabsContent value="ingredients" className="space-y-3 overflow-y-auto pt-4">
            {isServico ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">
                Insumos se aplicam apenas a produtos.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  O que é consumido do estoque a cada venda deste produto. Ex.: vender 1 Hambúrguer baixa
                  1 Pão, 200g de Carne, 1 Alface etc.
                </p>

                <div className="space-y-2">
                  {ingredients.filter((ing) => !ing._destroy).length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">
                      Nenhum insumo cadastrado.
                    </p>
                  )}
                  {ingredients.map((ing, idx) => {
                    if (ing._destroy) return null;
                    return (
                      <IngredientRow
                        key={ing.id ?? `ing-${idx}`}
                        index={idx}
                        value={ing}
                        onChange={(patch) => handleIngredientChange(idx, patch)}
                        onRemove={() => handleIngredientRemove(idx)}
                      />
                    );
                  })}
                </div>

                <Button variant="outline" size="sm" onClick={handleAddIngredient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar insumo
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-5 overflow-y-auto pt-4">
            {!isServico && (
              <>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-primary" /> Dimensões e Peso
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {numInput('weight_kg', 'Peso (kg)', '0,000', '0.001')}
                    {numInput('height_cm', 'Altura (cm)', '0,00')}
                    {numInput('width_cm', 'Largura (cm)', '0,00')}
                    {numInput('length_cm', 'Comprimento (cm)', '0,00')}
                    {textInput('size', 'Tamanho', 'Ex: P, M, G')}
                    {textInput('color', 'Cor', 'Ex: Preto')}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Store className="w-4 h-4 text-primary" /> Detalhes Mercado Livre
                    </h4>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="p-publish-ml" className="text-sm text-yellow-600 dark:text-yellow-400">
                        Publicar no Mercado Livre
                      </Label>
                      <Switch
                        id="p-publish-ml"
                        checked={form.publish_ml}
                        onCheckedChange={(checked) => setForm({ ...form, publish_ml: Boolean(checked) })}
                      />
                    </div>
                  </div>

                                    <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" /> Equipamento
                    </h4>
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="p-equipamento-tipo">Tipo de Equipamento</Label>
                            <Select value={form.equipamento_tipo} onValueChange={(v) => setForm({...form, equipamento_tipo: v})}>
                                <SelectTrigger id="p-equipamento-tipo"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="maquina">Máquina</SelectItem>
                                    <SelectItem value="escritorio">Item de Escritório</SelectItem>
                                    <SelectItem value="cozinha">Item de Cozinha</SelectItem>
                                    <SelectItem value="ti">Item de TI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                  </div>

                  {form.publish_ml && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border p-3">
                      {textInput('ml_category', 'Categoria ML', 'MLB1012')}
                      {textInput('ml_buying_model', 'Modelo Compra', 'buy_it_now')}
                      {textInput('ml_listing_type', 'Tipo Anúncio', 'gold_pro')}
                      {textInput('ml_condition', 'Condição', 'new')}
                      {textInput('brand', 'Marca', 'Ex: Apple')}
                      {textInput('model', 'Modelo', 'Ex: iPhone 13 Pro Max')}
                      {textInput('compatible_brands', 'Marcas Compatíveis', 'Ex: Apple')}
                      {textInput('accessory_type', 'Tipo de Acessório', 'Ex: Película')}
                      {textInput('anatel_number', 'Número Anatel', '000')}
                    </div>
                  )}
                </div>
              </>
            )}

            {isServico && (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">
                Os campos de dimensões e Mercado Livre se aplicam apenas a produtos.
              </p>
            )}
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

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Escolher mídia existente</DialogTitle>
            <DialogDescription>Selecione uma imagem ou vídeo já enviado no catálogo.</DialogDescription>
          </DialogHeader>
          <div className="mb-3">
            <Input
              value={gallerySearch}
              onChange={(e) => setGallerySearch(e.target.value)}
              placeholder="Filtrar por nome do produto..."
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {galleryLoading ? (
              <div className="text-center text-sm text-muted-foreground py-10">Carregando...</div>
            ) : filteredGallery.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded">
                Nenhuma mídia encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filteredGallery.map((item, idx) => {
                  const url = resolveMediaUrl(item.url);
                  return (
                    <button
                      type="button"
                      key={`${item.url}-${idx}`}
                      onClick={() => handlePickGalleryItem(item)}
                      className="border rounded-md overflow-hidden aspect-square group relative"
                      title={item.productName}
                    >
                      {item.kind === 'video' ? (
                        <video src={url} muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt={item.productName ?? item.url} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.productName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGalleryOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}