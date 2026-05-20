import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from '@evoapi/design-system';
import { Users } from 'lucide-react';
import { AssignTeamNodeData } from './AssignTeamNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
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
  const [formDataOptions, setFormDataOptions] = useState<{
    teams: any[];
  }>({
    teams: [],
  });
  const [loading, setLoading] = useState(true);

  // Load form data options on mount
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

  // Update node with form data when available
  useEffect(() => {
    if (formDataOptions.teams.length > 0) {
      const updatedData: AssignTeamNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  return (
    <BaseFlowPanel
      title={t('panels.assignTeam.title')}
      icon={<Users className="w-5 h-5 text-indigo-500" />}
      onClose={onClose}
      width="w-[420px]"
    >
      {/* Seleção de Equipe */}
      <div className="space-y-2">
        <Label className="text-sidebar-foreground font-medium">{t('panels.assignTeam.team')}</Label>
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
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
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

      {/* Preview da ação */}
      {teamId && (
        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-800 dark:text-indigo-200">
              {t('panels.assignTeam.conversationWillBeAssigned')}{' '}
              <strong>
                {formDataOptions.teams.find(t => t.id.toString() === teamId)?.name ||
                  `${t('panels.assignTeam.team')} #${teamId}`}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!teamId || loading}>
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
