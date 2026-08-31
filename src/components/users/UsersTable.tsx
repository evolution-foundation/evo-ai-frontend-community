import { Avatar, AvatarFallback, Badge } from '@evoapi/design-system';
import { Edit, Trash2, Shield } from 'lucide-react';
import { User } from '@/types/users';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLanguage } from '@/hooks/useLanguage';

interface UsersTableProps {
  users: User[];
  selectedUsers: User[];
  loading?: boolean;
  onSelectionChange: (users: User[]) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onCreateUser?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  getRowKey?: (user: User) => string;
  canDeleteUser?: (user: User) => boolean;
}

export default function UsersTable({
  users,
  selectedUsers,
  loading,
  onSelectionChange,
  onEditUser,
  onDeleteUser,
  onCreateUser,
  sortBy,
  sortOrder,
  onSort,
  getRowKey,
  canDeleteUser,
}: UsersTableProps) {
  const { can } = usePermissions();
  const { t } = useLanguage('users');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'busy':
        return 'text-yellow-600';
      case 'offline':
      default:
        return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`details.status.${status}` as any) || t('details.status.offline');
  };

  const getRoleLabel = (user: User) => {
    // Priorizar role_data se disponível
    if (user.role && user.role.name) {
      return user.role.name;
    }

    return t('card.customRole');
  };

  const columns: TableColumn<User>[] = [
    {
      key: 'name',
      label: t('table.columns.user'),
      sortable: true,
      width: '300px',
      render: user => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {user.thumbnail ? (
              <img
                src={user.thumbnail}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('table.columns.role'),
      sortable: true,
      width: '150px',
      render: user => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{getRoleLabel(user)}</span>
        </div>
      ),
    },
    {
      key: 'availability_status',
      label: t('table.columns.status'),
      width: '120px',
      render: user => (
        <div>
          <Badge
            variant={user.availability === 'online' ? 'secondary' : 'outline'}
            className={`text-xs ${getStatusColor(user.availability)}`}
          >
            {getStatusLabel(user.availability)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'confirmed',
      label: t('table.columns.confirmation'),
      width: '120px',
      render: user => (
        <div>
          {user.confirmed ? (
            <Badge variant="secondary" className="text-xs text-green-600">
              {t('table.columns.confirmed')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-yellow-600">
              {t('table.columns.pending')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      label: t('table.columns.id'),
      width: '80px',
      render: user => <span className="font-mono text-xs text-muted-foreground">{user.id}</span>,
    },
  ];

  const actions: TableAction<User>[] = [
    ...(can('users', 'update')
      ? [
          {
            label: t('table.actions.edit'),
            icon: <Edit className="h-4 w-4" />,
            onClick: onEditUser,
          },
        ]
      : []),
    ...(can('users', 'delete')
      ? [
          {
            label: t('table.actions.delete'),
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onDeleteUser,
            variant: 'destructive' as const,
            show: canDeleteUser,
          },
        ]
      : []),
  ];

  return (
    <BaseTable
      data={users}
      columns={columns}
      actions={actions}
      selectedItems={selectedUsers}
      onSelectionChange={onSelectionChange}
      loading={loading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={getRowKey || ((user: User) => user.id.toString())}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateUser
          ? {
              label: t('table.empty.action'),
              onClick: onCreateUser,
            }
          : undefined
      }
    />
  );
}
