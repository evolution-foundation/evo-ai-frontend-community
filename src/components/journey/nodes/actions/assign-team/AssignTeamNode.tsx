import { Users, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface AssignTeamNodeData {
  label: string;
  description?: string;
  team_id?: string;
  team_name?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    teams: any[];
  };
}

export interface AssignTeamNodeType {
  id: string;
  type: 'assign-team-node';
  position: { x: number; y: number };
  data: AssignTeamNodeData;
}

interface AssignTeamNodeProps {
  selected: boolean;
  data: AssignTeamNodeData;
  id: string;
}

export function AssignTeamNode({ selected, data, id }: AssignTeamNodeProps) {
  const { t } = useLanguage('journey');

  // Encontrar a equipe selecionada
  const getTeamName = () => {
    if (data.team_name) return data.team_name;

    if (data.team_id && data.formDataOptions?.teams) {
      const team = data.formDataOptions.teams.find((t: any) =>
        t.id.toString() === data.team_id?.toString()
      );
      return team?.name || t('flowEditor.nodes.assignTeam.teamNumber', { teamId: data.team_id });
    }

    return t('flowEditor.nodes.assignTeam.selectTeam');
  };

  const teamName = getTeamName();
  const hasTeamSelected = !!data.team_id;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="indigo"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="assign-team-output"
      targetHandleId="assign-team-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.assignTeam.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação da equipe selecionada */}
        <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/30">
          <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            {hasTeamSelected ? (
              <>{t('flowEditor.nodes.assignTeam.assignTo')} <strong>{teamName}</strong></>
            ) : (
              t('flowEditor.nodes.assignTeam.noTeamSelected')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}