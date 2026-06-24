import { useLanguage } from '@/hooks/useLanguage';
import { Edit, Paperclip, Trash2 } from 'lucide-react';
import BaseTable from '@/components/base/BaseTable';
import { CannedResponse } from '@/types/knowledge';

interface CannedResponsesTableProps {
  cannedResponses: CannedResponse[];
  selectedCannedResponses: CannedResponse[];
  loading: boolean;
  onSelectionChange: (cannedResponses: CannedResponse[]) => void;
  onEditCannedResponse: (cannedResponse: CannedResponse) => void;
  onDeleteCannedResponse: (cannedResponse: CannedResponse) => void;
  onCreateCannedResponse: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: 'short_code' | 'created_at') => void;
}

export default function CannedResponsesTable({
  cannedResponses,
  selectedCannedResponses,
  loading,
  onSelectionChange,
  onEditCannedResponse,
  onDeleteCannedResponse,
  sortBy,
  sortOrder,
}: CannedResponsesTableProps) {
  const { t } = useLanguage('cannedResponses');

  const columns = [
    {
      key: 'short_code',
      label: t('table.columns.shortCode'),
      sortable: true,
      render: (cannedResponse: CannedResponse) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border inline-block">
            {cannedResponse.short_code}
          </span>
          {!!cannedResponse.attachments?.length && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {cannedResponse.attachments.length}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'content',
      label: t('table.columns.content'),
      render: (cannedResponse: CannedResponse) => (
        <div className="text-muted-foreground max-w-md">
          <div className="line-clamp-2 whitespace-pre-wrap">{cannedResponse.content}</div>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: (cannedResponse: CannedResponse) => (
        <div className="text-sm text-muted-foreground">
          {new Date(cannedResponse.created_at).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
  ];

  const actions = [
    {
      label: t('actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditCannedResponse,
    },
    {
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteCannedResponse,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable
      data={cannedResponses}
      columns={columns}
      actions={actions}
      loading={loading}
      getRowKey={cannedResponse => cannedResponse.id.toString()}
      selectable={true}
      selectedItems={selectedCannedResponses}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
}
