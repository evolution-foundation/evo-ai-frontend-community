import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { PlusIcon, Search, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductKind, ProductStatus } from '@/types/products';

interface Props {
  search: string;
  kindFilter: ProductKind | 'all';
  statusFilter: ProductStatus | 'all';
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onKindChange: (value: ProductKind | 'all') => void;
  onStatusChange: (value: ProductStatus | 'all') => void;
  onCreate: () => void;
}

export default function ProductsHeader({
  search,
  kindFilter,
  statusFilter,
  canCreate,
  onSearchChange,
  onKindChange,
  onStatusChange,
  onCreate,
}: Props) {
  const { t } = useLanguage('products');

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('header.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={kindFilter} onValueChange={(v) => onKindChange(v as ProductKind | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('header.filters.kindAll')}</SelectItem>
            <SelectItem value="physical">{t('kind.physical')}</SelectItem>
            <SelectItem value="digital">{t('kind.digital')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as ProductStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('header.filters.statusAll')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
            <SelectItem value="draft">{t('status.draft')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        {canCreate && (
          <Button variant="outline" asChild>
            <Link to="/products/import">
              <Upload className="h-4 w-4 mr-2" />
              {t('header.import')}
            </Link>
          </Button>
        )}
        <Button onClick={onCreate} disabled={!canCreate}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('header.new')}
        </Button>
      </div>
    </div>
  );
}
