import { Edit, Trash2, Eye, Key } from 'lucide-react';
import { Badge } from '@evoapi/design-system';
import BaseTable from '@/components/base/BaseTable';
import type { AccessToken } from '@/types/auth';
import { usePermissions } from '@/contexts/PermissionsContext';
import { parseScopesFromAPI } from '@/services/auth/accessTokensService';

interface AccessTokensTableProps {
  tokens: AccessToken[];
  selectedTokens: AccessToken[];
  loading: boolean;
  onSelectionChange: (tokens: AccessToken[]) => void;
  onEditToken: (token: AccessToken) => void;
  onDeleteToken: (token: AccessToken) => void;
  onViewToken: (token: AccessToken) => void;
  onRegenerateToken: (token: AccessToken) => void;
  onCreateToken: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export default function AccessTokensTable({
  tokens,
  selectedTokens,
  loading,
  onSelectionChange,
  onEditToken,
  onDeleteToken,
  onViewToken,
  onRegenerateToken,
  onSort,
  sortBy,
  sortOrder,
}: AccessTokensTableProps) {
  const { can } = usePermissions();

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (token: AccessToken) => (
        <div>
          <div className="font-medium">{token.name}</div>
          <div className="text-xs text-muted-foreground">
            ID: {token.id}
          </div>
        </div>
      ),
    },
    {
      key: 'scopes',
      label: 'Scopes',
      render: (token: AccessToken) => {
        const scopes = parseScopesFromAPI(token.scopes);
        return (
          <div className="flex flex-wrap gap-1">
            {scopes.slice(0, 3).map((scope) => (
              <Badge key={scope} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
            {scopes.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{scopes.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'owner',
      label: 'Owner',
      render: (token: AccessToken) => (
        <div className="flex flex-col gap-1">
          <Badge variant="default" className="text-xs">
            {token.owner_type}
          </Badge>
          {token.owner_name && (
            <div className="text-xs text-muted-foreground">
              {token.owner_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Created At',
      sortable: true,
      render: (token: AccessToken) => (
        <div className="text-sm text-muted-foreground">
          {new Date(token.created_at).toLocaleDateString()}
        </div>
      ),
    },
  ];

  const actions = [
    {
      label: 'View Token',
      icon: <Eye className="h-4 w-4" />,
      onClick: onViewToken,
    },
    ...(can('access_tokens', 'update') ? [{
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditToken,
    }] : []),
    ...(can('access_tokens', 'update_token') ? [{
      label: 'Regenerate Token',
      icon: <Key className="h-4 w-4" />,
      onClick: onRegenerateToken,
    }] : []),
    ...(can('access_tokens', 'delete') ? [{
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteToken,
      variant: 'destructive' as const,
    }] : []),
  ];

  return (
    <BaseTable
      data={tokens}
      columns={columns}
      actions={actions}
      selectedItems={selectedTokens}
      onSelectionChange={onSelectionChange}
      loading={loading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={(token) => token.id}
      emptyMessage="No access tokens found"
    />
  );
}
