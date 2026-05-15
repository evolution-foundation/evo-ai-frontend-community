import BasePagination from '@/components/base/BasePagination';

interface Props {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  loading?: boolean;
}

export default function AutomationsPagination({
  currentPage,
  totalPages,
  totalCount,
  perPage,
  onPageChange,
  onPerPageChange,
  loading,
}: Props) {
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
