import BasePagination from '@/components/base/BasePagination';

interface LabelsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  loading?: boolean;
}

export default function LabelsPagination({
  currentPage,
  totalPages,
  onPageChange,
  onPerPageChange,
  totalCount,
  perPage,
  loading,
}: LabelsPaginationProps) {
  return (
    <BasePagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalCount}
      itemsPerPage={perPage}
      onPageChange={onPageChange}
      onItemsPerPageChange={onPerPageChange}
      disabled={loading}
    />
  );
}
