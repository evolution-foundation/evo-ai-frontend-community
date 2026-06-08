import { useEffect, useMemo, useState } from 'react';
import { Label, Textarea, Checkbox } from '@evoapi/design-system';
import { Mail } from 'lucide-react';
import { SendEmailTeamNodeData } from './SendEmailTeamNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface SendEmailTeamPanelProps {
  nodeId: string;
  data: SendEmailTeamNodeData;
  onUpdate: (nodeId: string, newData: SendEmailTeamNodeData) => void;
  onClose: () => void;
}

export function SendEmailTeamPanel({ nodeId, data, onUpdate, onClose }: SendEmailTeamPanelProps) {
  const { t } = useLanguage('journey');
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    data.team_ids?.map(id => id.toString()) || [],
  );
  const [message, setMessage] = useState<string>(data.message || '');
  const [originalSnapshot] = useState(() => ({
    selectedTeams: (data.team_ids?.map(id => id.toString()) || []).slice().sort().join(','),
    message: data.message || '',
  }));
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
        console.error(t('panels.sendEmailTeam.loadError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  const handleSave = () => {
    const selectedTeamObjects = formDataOptions.teams.filter(team =>
      selectedTeams.includes(team.id.toString()),
    );

    const updatedData: SendEmailTeamNodeData = {
      ...data,
      team_ids: selectedTeams,
      team_names: selectedTeamObjects.map(team => team.name),
      message: message.trim(),
      formDataOptions,
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.teams.length > 0) {
      const updatedData: SendEmailTeamNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const getCharacterCount = () => message.length;

  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 500) return 'text-flow-feedback-error-fg';
    if (count > 400) return 'text-flow-feedback-warn-fg';
    return 'text-sidebar-foreground/60';
  };

  const isValid = selectedTeams.length > 0 && message.trim().length > 0 && getCharacterCount() <= 500;
  const dirty = useMemo(() => {
    const currentTeamsKey = selectedTeams.slice().sort().join(',');
    return currentTeamsKey !== originalSnapshot.selectedTeams || message !== originalSnapshot.message;
  }, [selectedTeams, message, originalSnapshot]);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.sendEmailTeam.title')}
      icon={<Mail className="h-5 w-5 text-flow-node-action-message-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('actions.save')}
      cancelLabel={t('actions.cancel')}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.sendEmailTeam.teams')}
          </Label>

          {loading ? (
            <div className="text-sm text-sidebar-foreground/60">
              {t('panels.sendEmailTeam.loadingTeams')}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formDataOptions.teams.length === 0 ? (
                <p className="text-sm text-sidebar-foreground/60">
                  {t('panels.sendEmailTeam.noTeamsFound')}
                </p>
              ) : (
                formDataOptions.teams.map(team => (
                  <div
                    key={team.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer"
                    onClick={() => handleTeamToggle(team.id.toString())}
                  >
                    <Checkbox
                      checked={selectedTeams.includes(team.id.toString())}
                      onCheckedChange={() => handleTeamToggle(team.id.toString())}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-full bg-flow-node-action-message-bg text-flow-node-action-message-fg flex items-center justify-center text-xs font-medium">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sidebar-foreground">{team.name}</div>
                        <div className="text-xs text-sidebar-foreground/60">
                          {team.description || t('panels.sendEmailTeam.node.defaultTeamDescription')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.sendEmailTeam.messageLabel')}
          </Label>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('panels.sendEmailTeam.messagePlaceholder')}
            className="min-h-[100px] resize-none bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
            disabled={loading}
          />

          <div className="flex justify-between items-center text-xs">
            <span className="text-sidebar-foreground/50">
              {t('panels.sendEmailTeam.messageHelp')}
            </span>
            <span className={getCharacterCountColor()}>
              {t('panels.sendEmailTeam.characterCount', { count: getCharacterCount() })}
            </span>
          </div>
        </div>

        {selectedTeams.length > 0 && (
          <FlowFeedbackBanner variant="info">
            <div className="font-medium mb-1">
              {t('panels.sendEmailTeam.preview.title')}{' '}
              {selectedTeams.length === 1
                ? t('panels.sendEmailTeam.preview.oneTeam')
                : t('panels.sendEmailTeam.preview.multipleTeams', { count: selectedTeams.length })}
              :
            </div>
            <div className="space-y-1 text-xs">
              {selectedTeams.slice(0, 3).map(teamId => {
                const team = formDataOptions.teams.find(team => team.id.toString() === teamId);
                return (
                  <div key={teamId}>📧 {team?.name || `Equipe #${teamId}`}</div>
                );
              })}
              {selectedTeams.length > 3 && (
                <div className="text-xs">
                  {t('panels.sendEmailTeam.preview.moreTeams', { count: selectedTeams.length - 3 })}
                </div>
              )}
            </div>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-1">{t('panels.sendEmailTeam.info.title')}</div>
          <div className="space-y-1 text-xs">
            <div>{t('panels.sendEmailTeam.info.point1')}</div>
            <div>{t('panels.sendEmailTeam.info.point2')}</div>
            <div>{t('panels.sendEmailTeam.info.point3')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
