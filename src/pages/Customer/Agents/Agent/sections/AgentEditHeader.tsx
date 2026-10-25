import { Button } from '@evoapi/design-system';
import { ArrowLeft, Save, Loader2, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { getAgentTypeLabel } from '@/utils/agents';

interface AgentEditHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onTestAgent?: () => void;
  isDirty: boolean;
  isSaving: boolean;
  agentName?: string;
  agentType?: string;
}

const AgentEditHeader = ({
  onBack,
  onSave,
  onTestAgent,
  isDirty,
  isSaving,
  agentName,
  agentType,
}: AgentEditHeaderProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-2 border-b border-border bg-card px-6">
      {/* Back and name wrap as one unit, so a narrow page truncates the name instead of stacking three rows. */}
      <div className="flex min-w-0 flex-[1_1_16rem] items-center gap-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-auto gap-2 px-2 py-0 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
          {t('actions.back') || 'Voltar'}
        </Button>

        {agentName && (
          <div className="flex min-w-0 items-center gap-3 px-4 py-[14px]">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] border border-primary/30 bg-primary/10">
              <span className="text-base font-extrabold text-primary">
                {agentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-bold text-foreground">{agentName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">
                {getAgentTypeLabel(agentType || 'llm', t)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-[14px] py-2">
        {onTestAgent && (
          <Button
            variant="outline"
            onClick={onTestAgent}
            className="h-auto gap-2 rounded-[9px] border-border bg-card px-4 py-[9px] text-sm font-semibold text-foreground"
          >
            <MessageSquare className="h-4 w-4" />
            {t('actions.testAgent') || 'Teste seu agente'}
          </Button>
        )}
        <Button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="h-auto gap-2 rounded-[9px] bg-primary px-5 py-[9px] text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-55"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('messages.saving') || 'Salvando...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {t('actions.save') || 'Salvar'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AgentEditHeader;
