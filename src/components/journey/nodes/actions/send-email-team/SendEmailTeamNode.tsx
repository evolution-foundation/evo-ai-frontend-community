import { Mail, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface SendEmailTeamNodeData {
  label: string;
  description?: string;
  team_ids?: string[] | number[];
  team_names?: string[];
  message?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    teams: any[];
  };
}

export interface SendEmailTeamNodeType {
  id: string;
  type: 'send-email-team-node';
  position: { x: number; y: number };
  data: SendEmailTeamNodeData;
}

interface SendEmailTeamNodeProps {
  selected: boolean;
  data: SendEmailTeamNodeData;
  id: string;
}

export function SendEmailTeamNode({ selected, data, id }: SendEmailTeamNodeProps) {
  const { t } = useLanguage('journey');

  const getTeamNames = () => {
    if (data.team_names && data.team_names.length > 0) {
      return data.team_names;
    }

    if (data.team_ids && data.formDataOptions?.teams) {
      const teamNames = data.team_ids.map((teamId: any) => {
        const team = data.formDataOptions!.teams.find((t: any) =>
          t.id.toString() === teamId.toString()
        );
        return team?.name || `${t('panels.sendEmailTeam.node.teamSelected')} #${teamId}`;
      });
      return teamNames;
    }

    return [];
  };

  const teamNames = getTeamNames();
  const hasTeamsSelected = teamNames.length > 0;
  const hasMessage = !!(data.message && data.message.trim());

  const getDisplayText = () => {
    if (!hasTeamsSelected) {
      return t('panels.sendEmailTeam.node.noTeamsSelected');
    }

    if (!hasMessage) {
      return `${teamNames.length === 1 ? t('panels.sendEmailTeam.node.teamSelected') : t('panels.sendEmailTeam.node.teamsSelected', { count: teamNames.length })} - ${t('panels.sendEmailTeam.node.noMessage')}`;
    }

    if (teamNames.length === 1) {
      return t('panels.sendEmailTeam.node.emailTo', { teamName: teamNames[0] });
    }

    return t('panels.sendEmailTeam.node.emailToMultiple', { count: teamNames.length });
  };

  const getMessagePreview = () => {
    if (!hasMessage) return null;
    
    const message = data.message!.trim();
    const maxLength = 40;
    
    if (message.length <= maxLength) {
      return `"${message}"`;
    }
    
    return `"${message.substring(0, maxLength)}..."`;
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="purple"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="send-email-team-output"
      targetHandleId="send-email-team-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.sendEmailTeam.node.title')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação das equipes e mensagem */}
        <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
          <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
            {getDisplayText()}
          </p>
          
          {/* Preview da mensagem se configurada */}
          {hasMessage && (
            <div className="mt-1 pt-1 border-t border-purple-200/50 dark:border-purple-700/50">
              <p className="text-xs text-purple-700 dark:text-purple-300 italic">
                {getMessagePreview()}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}