import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { productsService } from '@/services/products/productsService';
import { extractError } from '@/utils/apiHelpers';
import type {
  Product,
  ProductFormData,
  ProductKind,
  ProductStatus,
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
} from '@evoapi/design-system';

const DEFAULT_PAGE_SIZE = 25;

// Maps a 422 validation error into a { field: message } map so the modal can
// show server errors (e.g. SKU uniqueness) inline. Returns {} for non-field errors.
function toFieldErrors(error: unknown): Record<string, string> {
  const { details } = extractError(error);
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    details.forEach((d) => {
      if (d && typeof d === 'object' && 'field' in d) {
        const detail = d as { field: string; message?: string };
        out[detail.field] = detail.message ?? '';
      }
    });
  } else if (details && typeof details === 'object') {
    Object.entries(details as Record<string, unknown>).forEach(([field, msgs]) => {
      out[field] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
    });
  }
  return out;
}

export default function Products() {
  const { t } = useLanguage('products');
  const { can } = useUserPermissions();
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
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const params = useMemo(() => {
    const out: Record<string, unknown> = { page, per_page: DEFAULT_PAGE_SIZE };
    if (search.trim()) out.q = search.trim();
    if (kindFilter !== 'all') out.kind = kindFilter;
    if (statusFilter !== 'all') out.status = statusFilter;
    return out;
  }, [page, search, kindFilter, statusFilter]);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
      </div>

      <ProductsHeader
        search={search}
        kindFilter={kindFilter}
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
          onEdit={openEdit}
          onDelete={(p) => setConfirmDelete(p)}
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
    </div>
  );
}
