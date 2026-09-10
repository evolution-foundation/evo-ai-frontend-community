import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { productsService } from '@/services/products/productsService';
import { toFieldErrors } from './productErrors';
import type {
  Product,
  ProductFormData,
  ProductKind,
  ProductItemType,
  ProductStatus,
  ProductSellAffectedItem,
} from '@/types/products';
import ProductsHeader from '@/components/products/ProductsHeader';
import ProductsTable from '@/components/products/ProductsTable';
import ProductsPagination from '@/components/products/ProductsPagination';
import ProductModal from '@/components/products/ProductModal';
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
} from '@evoapi/design-system';

const DEFAULT_PAGE_SIZE = 25;
const ALL_ITEM_TYPES: ProductItemType[] = ['produto', 'produto_ml', 'servico', 'insumo'];

export default function Products() {
  const { t } = useLanguage('products');
  const { can } = usePermissions();
  const canCreate = can('products', 'create');
  const canUpdate = can('products', 'update');
  const canDelete = can('products', 'delete');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<ProductKind | 'all'>('all');
  const [itemTypesFilter, setItemTypesFilter] = useState<ProductItemType[]>(['produto', 'produto_ml', 'servico']);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [sellTarget, setSellTarget] = useState<Product | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellResult, setSellResult] = useState<ProductSellAffectedItem[] | null>(null);

  const params = useMemo(() => {
    const out: Record<string, unknown> = { page, per_page: DEFAULT_PAGE_SIZE };
    if (search.trim()) out.q = search.trim();
    if (kindFilter !== 'all') out.kind = kindFilter;
    if (itemTypesFilter.length > 0 && itemTypesFilter.length < ALL_ITEM_TYPES.length) {
      out.item_type = itemTypesFilter.join(',');
    }
    if (statusFilter !== 'all') out.status = statusFilter;
    return out;
  }, [page, search, kindFilter, itemTypesFilter, statusFilter]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getProducts(params);
      setProducts(res.data ?? []);
      const pagination = res.meta?.pagination;
      setTotalPages(pagination?.total_pages ?? 1);
      setTotalCount(pagination?.total ?? (res.data?.length ?? 0));
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (payload: ProductFormData, files?: File[]) => {
    setSaving(true);
    setFormErrors({});
    try {
      if (editing?.id) {
        await productsService.updateProduct(editing.id, payload, files);
        toast.success(t('messages.updateSuccess'));
      } else {
        await productsService.createProduct(payload, files);
        toast.success(t('messages.createSuccess'));
      }
      setModalOpen(false);
      setEditing(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      const fieldErrors = toFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors);
      } else {
        toast.error(editing ? t('messages.updateError') : t('messages.createError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await productsService.deleteProduct(confirmDelete.id);
      toast.success(t('messages.deleteSuccess'));
      setConfirmDelete(null);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const openSell = (product: Product) => {
    setSellTarget(product);
    setSellQuantity(1);
    setSellResult(null);
  };

  const handleSell = async () => {
    if (!sellTarget) return;
    setSellLoading(true);
    setSellResult(null);
    try {
      const res = await productsService.sellProduct(sellTarget.id, sellQuantity);
      setSellResult(res.data?.affected ?? []);
      toast.success('Venda registrada e estoque atualizado');
      fetchProducts();
    } catch (error) {
      console.error(error);
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message;
      toast.error(message || 'Falha ao registrar a venda');
    } finally {
      setSellLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/cardapio-digital" target="_blank" rel="noopener noreferrer">
            Ver cardápio digital
          </a>
        </Button>
      </div>

      <ProductsHeader
        search={search}
        kindFilter={kindFilter}
        itemTypesFilter={itemTypesFilter}
        statusFilter={statusFilter}
        canCreate={canCreate}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onKindChange={(v) => {
          setKindFilter(v);
          setPage(1);
        }}
        onItemTypesChange={(v) => {
          setItemTypesFilter(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        onCreate={openCreate}
      />

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-10">{t('page.loading')}</div>
      ) : (
        <ProductsTable
          products={products}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canSell={canUpdate}
          onEdit={openEdit}
          onDelete={(p) => setConfirmDelete(p)}
          onSell={openSell}
        />
      )}

      <ProductsPagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
      />

      <ProductModal
        open={modalOpen}
        product={editing}
        loading={saving}
        errors={formErrors}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete.title')}</DialogTitle>
            <DialogDescription>
              {t('confirmDelete.description', { name: confirmDelete?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? t('actions.deleting') : t('actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(sellTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setSellTarget(null);
            setSellResult(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
            <DialogDescription>
              {sellTarget ? `Vender "${sellTarget.name}"` : ''}. O estoque do produto e dos
              insumos cadastrados será baixado.
            </DialogDescription>
          </DialogHeader>

          {sellResult ? (
            <div className="space-y-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                Venda registrada com sucesso!
              </p>
              <div className="rounded-md border border-border text-sm divide-y">
                {(sellResult ?? []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2">
                    <span>{item.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      estoque: {item.stock_quantity}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Itens com estoque atualizado acima.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="sell-qty">Quantidade</Label>
                <Input
                  id="sell-qty"
                  type="number"
                  min={1}
                  value={sellQuantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSellQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </div>
              {(sellTarget?.ingredients?.length ?? 0) > 0 && (
                <div className="text-xs text-muted-foreground">
                  Cada venda consome:
                  <ul className="mt-1 list-disc pl-5">
                    {(sellTarget?.ingredients ?? []).map((ing) => (
                      <li key={ing.id}>
                        {ing.quantity} {ing.unit} de {ing.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSellTarget(null);
                setSellResult(null);
              }}
              disabled={sellLoading}
            >
              {sellResult ? 'Fechar' : 'Cancelar'}
            </Button>
            {!sellResult && (
              <Button onClick={handleSell} disabled={sellLoading}>
                {sellLoading ? 'Registrando...' : 'Confirmar venda'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
