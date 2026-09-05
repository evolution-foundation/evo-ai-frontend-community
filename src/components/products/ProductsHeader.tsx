import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from '@evoapi/design-system';
import { PlusIcon, Search, Upload, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductKind, ProductItemType, ProductStatus } from '@/types/products';

interface Props {
  search: string;
  kindFilter: ProductKind | 'all';
  itemTypesFilter: ProductItemType[];
  statusFilter: ProductStatus | 'all';
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onKindChange: (value: ProductKind | 'all') => void;
  onItemTypesChange: (value: ProductItemType[]) => void;
  onStatusChange: (value: ProductStatus | 'all') => void;
  onCreate: () => void;
}

const ALL_ITEM_TYPES: ProductItemType[] = ['produto', 'produto_ml', 'servico', 'insumo', 'equipamento'];
const ITEM_TYPE_LABELS: Record<ProductItemType, string> = {
  produto: 'Produto',
  produto_ml: 'Produto (ML)',
  servico: 'Serviço',
  insumo: 'Insumo',
  equipamento: 'Equipamento',
};

export default function ProductsHeader({
  search,
  kindFilter,
  itemTypesFilter,
  statusFilter,
  canCreate,
  onSearchChange,
  onKindChange,
  onItemTypesChange,
  onStatusChange,
  onCreate,
}: Props) {
  const { t } = useLanguage('products');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = ALL_ITEM_TYPES.every((type) => itemTypesFilter.includes(type));

  const toggleType = (type: ProductItemType) => {
    if (itemTypesFilter.includes(type)) {
      if (itemTypesFilter.length === 1) return; // Keep at least one or allow empty? Better allow unchecking all which means all items.
      onItemTypesChange(itemTypesFilter.filter((t) => t !== type));
    } else {
      onItemTypesChange([...itemTypesFilter, type]);
    }
  };

  const toggleAll = () => {
    if (isAllSelected) {
      onItemTypesChange([]);
    } else {
      onItemTypesChange([...ALL_ITEM_TYPES]);
    }
  };

  const getLabel = () => {
    if (itemTypesFilter.length === 0 || isAllSelected) {
      return 'Todos os tipos';
    }
    if (itemTypesFilter.length === 1) {
      return ITEM_TYPE_LABELS[itemTypesFilter[0]];
    }
    return `${itemTypesFilter.length} tipos selecionados`;
  };

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

        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            className="w-[200px] justify-between font-normal"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="truncate">{getLabel()}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>

          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-[220px] rounded-md border bg-card p-2 shadow-lg space-y-1">
              <div
                className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                onClick={toggleAll}
              >
                <Checkbox checked={isAllSelected} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">Todos</span>
              </div>
              <div className="h-px bg-border my-1" />
              {ALL_ITEM_TYPES.map((type) => {
                const checked = itemTypesFilter.includes(type);
                return (
                  <div
                    key={type}
                    className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-muted cursor-pointer"
                    onClick={() => toggleType(type)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleType(type)} />
                    <span className="text-sm">{ITEM_TYPE_LABELS[type]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
