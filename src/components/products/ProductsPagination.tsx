import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function ProductsPagination({ page, totalPages, totalCount, onPageChange }: Props) {
  const { t } = useLanguage('products');

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-muted-foreground">
        {t('pagination.summary', { page, totalPages, totalCount })}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('pagination.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('pagination.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
