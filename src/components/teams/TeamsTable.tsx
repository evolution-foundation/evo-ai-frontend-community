import { Avatar, AvatarFallback, Badge } from '@evoapi/design-system';
import { Users, Edit, Trash2 } from 'lucide-react';
import { Team } from '@/types/users';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';

interface TeamsTableProps {
  teams: Team[];
  selectedTeams: Team[];
  loading?: boolean;
  onSelectionChange: (teams: Team[]) => void;
  onTeamClick: (team: Team) => void;
  onManageUsers: (team: Team) => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onCreateTeam?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  getRowKey?: (team: Team) => string;
}

export default function TeamsTable({
  teams,
  selectedTeams,
  loading,
  onSelectionChange,

  onManageUsers,
  onEditTeam,
  onDeleteTeam,
  onCreateTeam,
  sortBy,
  sortOrder,
  onSort,
  getRowKey,
}: TeamsTableProps) {
  const { t } = useLanguage('teams');
  const { can, isReady } = usePermissions();

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const columns: TableColumn<Team>[] = [
    {
      key: 'name',
      label: t('table.columns.team'),
      sortable: true,
      width: '300px',
      render: (team) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {getInitials(team.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">
              {team.name}
            </div>
            {team.description && (
              <div className="text-xs text-muted-foreground truncate">
                {team.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'members_count',
      label: t('table.columns.members'),
      sortable: true,
      width: '100px',
      render: (team) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">
            {team.members_count || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'allow_auto_assign',
      label: t('table.columns.autoAssign'),
      width: '150px',
      render: (team) => (
        <div>
          {team.allow_auto_assign ? (
            <Badge variant="secondary" className="text-xs">
              {t('table.columns.enabled')}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {t('table.columns.disabled')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      label: t('table.columns.id'),
      sortable: true,
      width: '80px',
      render: (team) => (
        <span className="font-mono text-xs text-muted-foreground">
          {team.id}
        </span>
      ),
    },
  ];

  const actions: TableAction<Team>[] = [
    {
      label: t('table.actions.manageUsers'),
      icon: <Users className="h-4 w-4" />,
      onClick: onManageUsers,
      show: () => isReady && can('teams', 'update'),
    },
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditTeam,
      show: () => isReady && can('teams', 'update'),
    },
    {
      label: t('table.actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteTeam,
      variant: 'destructive',
      show: () => isReady && can('teams', 'delete'),
    },
  ];

  return (
    <BaseTable
      data={teams}
      columns={columns}
      actions={actions}
      selectedItems={selectedTeams}
      onSelectionChange={onSelectionChange}
      loading={loading}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      getRowKey={getRowKey || ((team: Team) => team.id.toString())}
      emptyTitle={t("empty.title")}
      emptyDescription={t("empty.description")}
      emptyAction={onCreateTeam && isReady && can('teams', 'create') ? {
        label: t("empty.action"),
        onClick: onCreateTeam,
      } : undefined}
    />
  );
}
