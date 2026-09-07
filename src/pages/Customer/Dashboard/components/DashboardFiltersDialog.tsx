import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import type { DashboardFilterState, DashboardOption } from './types';

interface DashboardFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftFilters: DashboardFilterState;
  onFiltersChange: (changes: Partial<DashboardFilterState>) => void;
  onApply: () => void;
  onClear: () => void;
  pipelines: DashboardOption[];
  teams: DashboardOption[];
  inboxes: DashboardOption[];
  users: DashboardOption[];
  allValue: string;
  t: (key: string) => string;
}

const DashboardFiltersDialog = ({
  open,
  onOpenChange,
  draftFilters,
  onFiltersChange,
  onApply,
  onClear,
  pipelines,
  teams,
  inboxes,
  users,
  allValue,
  t,
}: DashboardFiltersDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('dashboard.filters.title')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.filters.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dashboard-pipeline-filter">{t('dashboard.filters.pipeline')}</Label>
            <Select value={draftFilters.pipelineId} onValueChange={value => onFiltersChange({ pipelineId: value })}>
              <SelectTrigger id="dashboard-pipeline-filter">
                <SelectValue placeholder={t('dashboard.filters.allPipelines')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>{t('dashboard.filters.allPipelines')}</SelectItem>
                {pipelines.map(pipeline => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-team-filter">{t('dashboard.filters.team')}</Label>
            <Select value={draftFilters.teamId} onValueChange={value => onFiltersChange({ teamId: value })}>
              <SelectTrigger id="dashboard-team-filter">
                <SelectValue placeholder={t('dashboard.filters.allTeams')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>{t('dashboard.filters.allTeams')}</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-inbox-filter">{t('dashboard.filters.channel')}</Label>
            <Select value={draftFilters.inboxId} onValueChange={value => onFiltersChange({ inboxId: value })}>
              <SelectTrigger id="dashboard-inbox-filter">
                <SelectValue placeholder={t('dashboard.filters.allChannels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>{t('dashboard.filters.allChannels')}</SelectItem>
                {inboxes.map(inbox => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-user-filter">{t('dashboard.filters.user')}</Label>
            <Select value={draftFilters.userId} onValueChange={value => onFiltersChange({ userId: value })}>
              <SelectTrigger id="dashboard-user-filter">
                <SelectValue placeholder={t('dashboard.filters.allUsers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>{t('dashboard.filters.allUsers')}</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-since-filter">{t('dashboard.filters.since')}</Label>
            <Input
              id="dashboard-since-filter"
              type="date"
              value={draftFilters.since}
              onChange={event => onFiltersChange({ since: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dashboard-until-filter">{t('dashboard.filters.until')}</Label>
            <Input
              id="dashboard-until-filter"
              type="date"
              value={draftFilters.until}
              onChange={event => onFiltersChange({ until: event.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClear}>
            {t('dashboard.filters.clear')}
          </Button>
          <Button onClick={onApply}>{t('dashboard.filters.apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardFiltersDialog;
