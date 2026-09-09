import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge, Card, CardContent } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import type { HeaderFilter } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelinesService } from '@/services/pipelines';
import TeamsService from '@/services/teams/teamsService';
import InboxesService from '@/services/channels/inboxesService';
import { usersService } from '@/services/users';
import { customerDashboardService } from '@/services/dashboard/customerDashboardService';
import type { CustomerDashboardParams, CustomerDashboardResponse } from '@/types/analytics/dashboard';
import DashboardFiltersDialog from './components/DashboardFiltersDialog';
import DashboardMetricsSection from './components/DashboardMetricsSection';
import DashboardTrendsSection from './components/DashboardTrendsSection';
import DashboardPerformanceSection from './components/DashboardPerformanceSection';
import type { DashboardFilterState, DashboardOption } from './components/types';
import { DashboardTour } from '@/tours';

const ALL_FILTER_VALUE = '__all__';

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultFilterState = (): DashboardFilterState => {
  const untilDate = new Date();
  const sinceDate = new Date();
  sinceDate.setDate(untilDate.getDate() - 29);

  return {
    pipelineId: ALL_FILTER_VALUE,
    teamId: ALL_FILTER_VALUE,
    inboxId: ALL_FILTER_VALUE,
    userId: ALL_FILTER_VALUE,
    since: toDateInputValue(sinceDate),
    until: toDateInputValue(untilDate),
  };
};

const parseDateToUnix = (value: string, endOfDay: boolean) => {
  if (!value) return undefined;
  const datetime = endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`;
  const timestamp = new Date(datetime).getTime();
  if (Number.isNaN(timestamp)) return undefined;
  return Math.floor(timestamp / 1000);
};

const normalizeDateRange = (filters: DashboardFilterState): DashboardFilterState => {
  if (!filters.since || !filters.until) return filters;
  if (filters.since <= filters.until) return filters;

  return {
    ...filters,
    since: filters.until,
    until: filters.since,
  };
};

const buildDashboardParams = (filters: DashboardFilterState): CustomerDashboardParams => {
  const params: CustomerDashboardParams = {};

  if (filters.pipelineId && filters.pipelineId !== ALL_FILTER_VALUE) params.pipeline_id = filters.pipelineId;
  if (filters.teamId && filters.teamId !== ALL_FILTER_VALUE) params.team_id = filters.teamId;
  if (filters.inboxId && filters.inboxId !== ALL_FILTER_VALUE) params.inbox_id = filters.inboxId;
  if (filters.userId && filters.userId !== ALL_FILTER_VALUE) params.user_id = filters.userId;

  const since = parseDateToUnix(filters.since, false);
  const until = parseDateToUnix(filters.until, true);

  if (since) params.since = since;
  if (until) params.until = until;

  return params;
};

const formatDateLabel = (value: string) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const CustomerDashboardPage = () => {
  const { t } = useLanguage('customerDashboard');
  const [defaultFilters] = useState<DashboardFilterState>(() => getDefaultFilterState());
  const [data, setData] = useState<CustomerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<DashboardFilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilterState>(defaultFilters);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [pipelines, setPipelines] = useState<DashboardOption[]>([]);
  const [teams, setTeams] = useState<DashboardOption[]>([]);
  const [inboxes, setInboxes] = useState<DashboardOption[]>([]);
  const [users, setUsers] = useState<DashboardOption[]>([]);

  const loadDashboard = useCallback(async (filters: DashboardFilterState) => {
    setLoading(true);
    setError(null);

    try {
      const response = await customerDashboardService.getCustomerDashboard(buildDashboardParams(filters));
      setData(response);
    } catch (err) {
      console.error('Error loading customer dashboard:', err);
      setError(t('dashboard.error') || 'Falha ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboard(appliedFilters);
  }, [appliedFilters, loadDashboard]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [pipelinesResponse, teamsResponse, inboxesResponse, usersResponse] = await Promise.all([
          pipelinesService.getPipelines({ page: 1, per_page: 100, sort: 'name', order: 'asc' }),
          TeamsService.getTeams({ page: 1, per_page: 100, sort: 'name', order: 'asc' }),
          InboxesService.list(),
          usersService.getAccountUsers({ sort: 'name', order: 'asc' }),
        ]);

        setPipelines((pipelinesResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setTeams((teamsResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setInboxes((inboxesResponse.data || []).map(item => ({ id: item.id, name: item.name })));
        setUsers(usersResponse.map(item => ({ id: item.id, name: item.available_name || item.name })));
      } catch (err) {
        console.error('Error loading dashboard filter options:', err);
      }
    };

    loadFilterOptions();
  }, []);

  const normalizeAndSetDraft = (changes: Partial<DashboardFilterState>) => {
    setDraftFilters(prev => ({ ...prev, ...changes }));
  };

  const handleOpenFilter = () => {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    const normalized = normalizeDateRange(draftFilters);
    setDraftFilters(normalized);
    setAppliedFilters(normalized);
    setFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setFilterModalOpen(false);
  };

  const appliedHeaderFilters = useMemo<HeaderFilter[]>(() => {
    const filters: HeaderFilter[] = [];
    const pipeline = pipelines.find(item => item.id === appliedFilters.pipelineId);
    const team = teams.find(item => item.id === appliedFilters.teamId);
    const inbox = inboxes.find(item => item.id === appliedFilters.inboxId);
    const user = users.find(item => item.id === appliedFilters.userId);
    const hasCustomPeriod = appliedFilters.since !== defaultFilters.since || appliedFilters.until !== defaultFilters.until;

    if (pipeline) {
      filters.push({
        label: t('dashboard.filters.pipeline') || 'Pipeline',
        value: pipeline.name,
        onRemove: () => setAppliedFilters(prev => ({ ...prev, pipelineId: ALL_FILTER_VALUE })),
      });
    }

    if (team) {
      filters.push({
        label: t('dashboard.filters.team') || 'Equipe',
        value: team.name,
        onRemove: () => setAppliedFilters(prev => ({ ...prev, teamId: ALL_FILTER_VALUE })),
      });
    }

    if (inbox) {
      filters.push({
        label: t('dashboard.filters.channel') || 'Canal',
        value: inbox.name,
        onRemove: () => setAppliedFilters(prev => ({ ...prev, inboxId: ALL_FILTER_VALUE })),
      });
    }

    if (user) {
      filters.push({
        label: t('dashboard.filters.user') || 'Usuário',
        value: user.name,
        onRemove: () => setAppliedFilters(prev => ({ ...prev, userId: ALL_FILTER_VALUE })),
      });
    }

    if (hasCustomPeriod) {
      filters.push({
        label: t('dashboard.filters.period') || 'Período',
        value: `${formatDateLabel(appliedFilters.since)} - ${formatDateLabel(appliedFilters.until)}`,
        onRemove: () => setAppliedFilters(prev => ({ ...prev, since: defaultFilters.since, until: defaultFilters.until })),
      });
    }

    return filters;
  }, [appliedFilters, defaultFilters.since, defaultFilters.until, inboxes, pipelines, t, teams, users]);

  useEffect(() => {
    setDraftFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    setAppliedFilters(prev => ({
      ...prev,
      pipelineId: prev.pipelineId !== ALL_FILTER_VALUE && !pipelines.some(item => item.id === prev.pipelineId)
        ? ALL_FILTER_VALUE
        : prev.pipelineId,
      teamId: prev.teamId !== ALL_FILTER_VALUE && !teams.some(item => item.id === prev.teamId)
        ? ALL_FILTER_VALUE
        : prev.teamId,
      inboxId: prev.inboxId !== ALL_FILTER_VALUE && !inboxes.some(item => item.id === prev.inboxId)
        ? ALL_FILTER_VALUE
        : prev.inboxId,
      userId: prev.userId !== ALL_FILTER_VALUE && !users.some(item => item.id === prev.userId)
        ? ALL_FILTER_VALUE
        : prev.userId,
    }));
  }, [inboxes, pipelines, teams, users]);

  const currentPeriodLabel = useMemo(() => {
    return `${formatDateLabel(appliedFilters.since)} - ${formatDateLabel(appliedFilters.until)}`;
  }, [appliedFilters.since, appliedFilters.until]);

  const channelShareData = useMemo(() => {
    if (!data) return [];

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

    return data.channels.map((channel, index) => ({
      name: channel.name,
      value: Number(channel.percentage.toFixed(2)),
      color: colors[index % colors.length],
    }));
  }, [data]);

  if (loading) {
    return <div className="p-4">{t('dashboard.loading') || 'Carregando dashboard...'}</div>;
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {error || (t('dashboard.error') || 'Falha ao carregar dashboard')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <DashboardTour />
      <div data-tour="dashboard-header">
        <BaseHeader
          title={t('dashboard.title')}
          subtitle={t('dashboard.subtitle')}
          filters={appliedHeaderFilters}
          onFilterClick={handleOpenFilter}
          showFilters
          filterButtonDataTour="dashboard-filter-button"
        />
      </div>

      <div className="-mt-3 flex justify-end" data-tour="dashboard-period-badge">
        <Badge variant="secondary">
          {currentPeriodLabel} ({data.period.days} dias)
        </Badge>
      </div>

      <div data-tour="dashboard-metrics">
        <DashboardMetricsSection data={data} t={t} />
      </div>
      <div data-tour="dashboard-trends">
        <DashboardTrendsSection data={data} t={t} channelShareData={channelShareData} />
      </div>
      <div data-tour="dashboard-performance">
        <DashboardPerformanceSection data={data} t={t} />
      </div>

      <DashboardFiltersDialog
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        draftFilters={draftFilters}
        onFiltersChange={normalizeAndSetDraft}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        pipelines={pipelines}
        teams={teams}
        inboxes={inboxes}
        users={users}
        allValue={ALL_FILTER_VALUE}
        t={t}
      />
    </div>
  );
};

export default CustomerDashboardPage;
