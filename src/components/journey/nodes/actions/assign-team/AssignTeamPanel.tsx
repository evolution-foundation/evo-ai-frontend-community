import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { Users } from 'lucide-react';
import { AssignTeamNodeData } from './AssignTeamNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface AssignTeamPanelProps {
  nodeId: string;
  data: AssignTeamNodeData;
  onUpdate: (nodeId: string, newData: AssignTeamNodeData) => void;
  onClose: () => void;
}

export function AssignTeamPanel({ nodeId, data, onUpdate, onClose }: AssignTeamPanelProps) {
  const { t } = useLanguage('journey');
  const [teamId, setTeamId] = useState<string>(data.team_id?.toString() || '');
  const [originalTeamId] = useState<string>(() => data.team_id?.toString() || '');
  const [formDataOptions, setFormDataOptions] = useState<{
    teams: any[];
  }>({
    teams: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formData = await automationService.getFormData();
        setFormDataOptions({
          teams: formData.teams || [],
        });
      } catch (error) {
        console.error(t('panels.assignTeam.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const selectedTeam = formDataOptions.teams.find(team => team.id.toString() === teamId);

    const updatedData: AssignTeamNodeData = {
      ...data,
      team_id: teamId || '',
      team_name: selectedTeam?.name || '',
      formDataOptions,
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.teams.length > 0) {
      const updatedData: AssignTeamNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const dirty = useMemo(() => teamId !== originalTeamId, [teamId, originalTeamId]);
  const isValid = Boolean(teamId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.assignTeam.title')}
      icon={<Users className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.assignTeam.team')}
          </Label>
          <Select value={teamId} onValueChange={setTeamId} disabled={loading}>
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue
                placeholder={
                  loading ? t('panels.assignTeam.loadingTeams') : t('panels.assignTeam.selectTeam')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {formDataOptions.teams.map(team => (
                <SelectItem
                  key={team.id}
                  value={team.id.toString()}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-flow-node-action-pipeline-bg text-flow-node-action-pipeline-fg flex items-center justify-center text-xs font-medium">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-xs text-sidebar-foreground/60">
                        {team.description || t('panels.assignTeam.defaultDescription')}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!loading && formDataOptions.teams.length === 0 && (
            <p className="text-sm text-sidebar-foreground/60">
              {t('panels.assignTeam.noTeamsFound')}
            </p>
          )}
        </div>

        {teamId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {t('panels.assignTeam.conversationWillBeAssigned')}{' '}
                <strong>
                  {formDataOptions.teams.find(team => team.id.toString() === teamId)?.name ||
                    `${t('panels.assignTeam.team')} #${teamId}`}
                </strong>
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
