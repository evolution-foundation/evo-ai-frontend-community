import { useState, useEffect } from 'react';
import { Button, Label, Textarea, Checkbox } from '@evoapi/design-system';
import { Mail } from 'lucide-react';
import { SendEmailTeamNodeData } from './SendEmailTeamNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
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

  // Update node with form data when available
  useEffect(() => {
    if (formDataOptions.teams.length > 0) {
      const updatedData: SendEmailTeamNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const getCharacterCount = () => {
    return message.length;
  };

  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 500) return 'text-red-600';
    if (count > 400) return 'text-orange-600';
    return 'text-sidebar-foreground/60';
  };

  return (
    <BaseFlowPanel
      title={t('panels.sendEmailTeam.title')}
      icon={<Mail className="w-5 h-5 text-purple-500" />}
      onClose={onClose}
      width="w-[420px]"
    >
      {/* Seleção de Equipes */}
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
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
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

      {/* Campo de Mensagem */}
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

        {/* Contador de caracteres */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-sidebar-foreground/50">
            {t('panels.sendEmailTeam.messageHelp')}
          </span>
          <span className={getCharacterCountColor()}>
            {t('panels.sendEmailTeam.characterCount', { count: getCharacterCount() })}
          </span>
        </div>
      </div>

      {/* Preview das equipes selecionadas */}
      {selectedTeams.length > 0 && (
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <div className="text-sm text-purple-800 dark:text-purple-200">
            <div className="font-medium mb-1">
              {t('panels.sendEmailTeam.preview.title')}{' '}
              {selectedTeams.length === 1
                ? t('panels.sendEmailTeam.preview.oneTeam')
                : t('panels.sendEmailTeam.preview.multipleTeams', { count: selectedTeams.length })}
              :
            </div>
            <div className="space-y-1">
              {selectedTeams.slice(0, 3).map(teamId => {
                const team = formDataOptions.teams.find(t => t.id.toString() === teamId);
                return (
                  <div key={teamId} className="text-xs">
                    📧 {team?.name || `Equipe #${teamId}`}
                  </div>
                );
              })}
              {selectedTeams.length > 3 && (
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  {t('panels.sendEmailTeam.preview.moreTeams', { count: selectedTeams.length - 3 })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre o email */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <div className="font-medium mb-1">{t('panels.sendEmailTeam.info.title')}</div>
          <div className="space-y-1">
            <div>{t('panels.sendEmailTeam.info.point1')}</div>
            <div>{t('panels.sendEmailTeam.info.point2')}</div>
            <div>{t('panels.sendEmailTeam.info.point3')}</div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1 h-10"
          disabled={
            selectedTeams.length === 0 || !message.trim() || loading || getCharacterCount() > 500
          }
        >
          {t('actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
