import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Card, CardContent, Switch } from '@evoapi/design-system';
import { Check, Users, Settings, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import type { TabSaveHandle } from './tabSave';

// Services
import AgentsService from '@/services/channels/agentsService';
import InboxMembersService from '@/services/channels/inboxMembersService';
import type { AgentChannel } from '@/types/channels/inbox';

interface CollaboratorsFormProps {
  inboxId: string;
  enableAutoAssignment?: boolean;
  maxAssignmentLimit?: number | null;
  registerSave?: (handle: TabSaveHandle | null) => void;
  onAutoAssignmentChange?: (enabled: boolean, limit?: number | null) => void;
}

export default function CollaboratorsForm({
  inboxId,
  enableAutoAssignment: initialAutoAssignment = false,
  maxAssignmentLimit: initialMaxLimit = null,
  registerSave,
  onAutoAssignmentChange,
}: CollaboratorsFormProps) {
  const { t } = useLanguage('channels');
  const [agents, setAgents] = useState<AgentChannel[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<AgentChannel[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isUpdatingAgents, setIsUpdatingAgents] = useState(false);
  const [enableAutoAssignment, setEnableAutoAssignment] = useState(initialAutoAssignment);
  const [maxAssignmentLimit, setMaxAssignmentLimit] = useState<number | null>(initialMaxLimit);
  const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);

  // Load all agents and current inbox members
  const loadData = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const [allAgents, inboxMembers] = await Promise.all([
        AgentsService.getAll(),
        InboxMembersService.get(inboxId),
      ]);

      // Ensure arrays are always valid
      const validAgents = Array.isArray(allAgents) ? allAgents : [];
      const validMembers = Array.isArray(inboxMembers) ? inboxMembers : [];

      // Normalize agent IDs to strings for comparison
      const normalizedMembers = validMembers.map(member => ({
        ...member,
        id: String(member.id),
      }));

      setAgents(
        validAgents.map(agent => ({
          ...agent,
          id: String(agent.id),
        })),
      );
      setSelectedAgents(normalizedMembers);
    } catch (error) {
      console.error('Error loading collaborators data:', error);
      toast.error(t('settings.collaborators.errors.loadError'));
      // Set empty arrays on error
      setAgents([]);
      setSelectedAgents([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }, [inboxId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update state when props change (e.g., when inbox data loads)
  // Use a ref to track previous values to ensure we update even when value is null
  const prevMaxLimitRef = useRef<number | null | undefined>(initialMaxLimit);
  const prevAutoAssignmentRef = useRef<boolean>(initialAutoAssignment);

  useEffect(() => {
    // Only update if values actually changed
    if (prevAutoAssignmentRef.current !== initialAutoAssignment) {
      setEnableAutoAssignment(initialAutoAssignment);
      prevAutoAssignmentRef.current = initialAutoAssignment;
    }

    // Normalize undefined to null for comparison
    const normalizedMaxLimit = initialMaxLimit !== undefined ? initialMaxLimit : null;
    if (prevMaxLimitRef.current !== normalizedMaxLimit) {
      setMaxAssignmentLimit(normalizedMaxLimit);
      prevMaxLimitRef.current = normalizedMaxLimit;
    }
  }, [initialAutoAssignment, initialMaxLimit]);

  const handleAgentToggle = (agent: AgentChannel) => {
    setSelectedAgents(prev => {
      // Ensure prev is always an array
      const currentAgents = Array.isArray(prev) ? prev : [];
      const agentId = String(agent.id);
      const isSelected = currentAgents.some(a => String(a.id) === agentId);
      if (isSelected) {
        return currentAgents.filter(a => String(a.id) !== agentId);
      } else {
        return [...currentAgents, agent];
      }
    });
  };

  const handleUpdateAgents = async () => {
    // Allow saving even with zero agents selected
    const agents = Array.isArray(selectedAgents) ? selectedAgents : [];

    setIsUpdatingAgents(true);
    try {
      const agentIds = agents.map(agent => agent.id);
      await InboxMembersService.update(inboxId, agentIds);
      toast.success(t('settings.collaborators.success.updated'));
    } catch (error) {
      console.error('Error updating agents:', error);
      toast.error(t('settings.collaborators.errors.updateError'));
    } finally {
      setIsUpdatingAgents(false);
    }
  };

  // Expose the collaborators (agents) save to the settings sticky footer registry.
  const canSave = !isUpdatingAgents;
  const registerSaveRef = useRef(registerSave);
  registerSaveRef.current = registerSave;
  const handleUpdateAgentsRef = useRef(handleUpdateAgents);
  handleUpdateAgentsRef.current = handleUpdateAgents;
  useLayoutEffect(() => {
    registerSaveRef.current?.({ save: () => handleUpdateAgentsRef.current(), canSave });
    return () => registerSaveRef.current?.(null);
  }, [canSave]);

  const handleAutoAssignmentToggle = async (checked: boolean) => {
    setEnableAutoAssignment(checked);
    setIsUpdatingAssignment(true);

    try {
      // Call parent callback or API to update auto assignment
      if (onAutoAssignmentChange) {
        await onAutoAssignmentChange(checked, maxAssignmentLimit);
      }
      toast.success(t('settings.collaborators.autoAssignment.success.updated'));
    } catch (error) {
      console.error('Error updating auto assignment:', error);
      toast.error(t('settings.collaborators.autoAssignment.errors.updateError'));
      setEnableAutoAssignment(!checked); // Revert on error
    } finally {
      setIsUpdatingAssignment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return t('settings.collaborators.status.online');
      case 'busy':
        return t('settings.collaborators.status.busy');
      case 'offline':
        return t('settings.collaborators.status.offline');
      default:
        return t('settings.collaborators.status.unknown');
    }
  };

  // Helper to get role key from string or object
  const getRoleKey = (role: string | { name?: string; key?: string } | undefined): string => {
    if (!role) return '';
    if (typeof role === 'string') return role;
    return role.name || role.key || '';
  };

  if (isLoadingAgents) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('settings.collaborators.agents.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agents Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {t('settings.collaborators.agents.title')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.collaborators.agents.description')}
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-4">
            {/* Selected count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('settings.collaborators.agents.selectedCount', {
                  count: Array.isArray(selectedAgents) ? selectedAgents.length : 0,
                })}{' '}
                ({Array.isArray(agents) ? agents.length : 0}{' '}
                {t('settings.collaborators.agents.total')})
              </p>
            </div>

            {/* Agents List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map(agent => {
                const agentId = String(agent.id);
                const isSelected =
                  Array.isArray(selectedAgents) &&
                  selectedAgents.some(a => String(a.id) === agentId);
                return (
                  <div
                    key={agent.id}
                    onClick={() => handleAgentToggle(agent)}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {/* Selection indicator */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      {agent.avatar_url ? (
                        <img
                          src={agent.avatar_url}
                          alt={agent.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {/* Status indicator */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                          agent.availability_status,
                        )}`}
                      />
                    </div>

                    {/* Agent info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-foreground truncate">{agent.name}</h5>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            (() => {
                              const roleKey = getRoleKey(agent.role).toLowerCase();
                              return roleKey === 'account_owner';
                            })()
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {(() => {
                            const roleKey = getRoleKey(agent.role).toLowerCase();
                            return roleKey === 'account_owner'
                              ? t('settings.collaborators.agents.roles.administrator')
                              : t('settings.collaborators.agents.roles.agent');
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground truncate">{agent.email}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(agent.availability_status)}
                        </span>
                      </div>
                    </div>

                    {/* Selection feedback */}
                    {isSelected && (
                      <div className="text-primary">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {agents.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h5 className="font-medium text-foreground mb-1">
                  {t('settings.collaborators.agents.noAgents.title')}
                </h5>
                <p className="text-sm text-muted-foreground">
                  {t('settings.collaborators.agents.noAgents.description')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto Assignment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {t('settings.collaborators.autoAssignment.title')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.collaborators.autoAssignment.description')}
              </p>
            </div>
          </div>

          <div className="space-y-6 mt-4">
            {/* Auto assignment toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t('settings.collaborators.autoAssignment.enable.label')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.collaborators.autoAssignment.enable.description')}
                </p>
              </div>
              <Switch
                checked={enableAutoAssignment}
                onCheckedChange={handleAutoAssignmentToggle}
                disabled={isUpdatingAssignment}
              />
            </div>

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                  {t('settings.collaborators.autoAssignment.info.title')}
                </h6>
                <div className="text-blue-600 dark:text-blue-400 space-y-1">
                  <p>• {t('settings.collaborators.autoAssignment.info.point1')}</p>
                  <p>• {t('settings.collaborators.autoAssignment.info.point2')}</p>
                  <p>• {t('settings.collaborators.autoAssignment.info.point3')}</p>
                  <p>• {t('settings.collaborators.autoAssignment.info.point4')}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
