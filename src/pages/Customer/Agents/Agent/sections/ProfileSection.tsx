import { useState } from 'react';
import { Button, Input, Label, Textarea } from '@evoapi/design-system';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { openaiService } from '@/services/integrations/openaiService';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { toast } from 'sonner';
import PromptGeneratorModal from '@/components/agents/wizard/PromptGeneratorModal';
import TaskSection from './TaskSection';
import { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';
import { isTaskAgent } from '@/utils/agents';
import AgentSummaryPanel from '../components/AgentSummaryPanel';
import type { Agent } from '@/types/agents';

interface ProfileSectionProps {
  formData: {
    name: string;
    description: string;
    role: string;
    goal: string;
    instruction: string;
  };
  onFormDataChange: (field: string, value: string) => void;
  agentType?: string;
  taskConfigData?: TaskConfigData | null;
  onTaskConfigChange?: (data: TaskConfigData) => void;
  editingAgentId?: string;
  /** Feed the Agent Summary panel on the right column. */
  agent?: Agent;
  model?: string;
  subAgentsCount?: number;
}

const ProfileSection = ({
  formData,
  onFormDataChange,
  agentType,
  taskConfigData,
  onTaskConfigChange,
  editingAgentId,
  agent,
  model,
  subAgentsCount = 0,
}: ProfileSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const { can, isReady } = usePermissions();
  const config = useGlobalConfig();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Orchestrators and external agents have no role, goal or behavior.
  const isOrchestratorType = ['sequential', 'parallel', 'loop', 'task', 'external'].includes(agentType || '');

  // AI actions hit the CRM integrations processor: they need a configured provider
  // and the integrations.execute grant.
  const showAIActions = config.openaiConfigured === true && isReady && can('integrations', 'execute');

  const handleReview = async () => {
    if (!formData.instruction || !formData.instruction.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillPromptToReview'));
      return;
    }

    setIsReviewing(true);
    try {
      const reviewedPrompt = await openaiService.processEvent({
        type: 'review_prompt',
        content: formData.instruction,
      });

      if (reviewedPrompt) {
        onFormDataChange('instruction', reviewedPrompt);
        toast.success(t('wizard.promptGenerator.messages.reviewSuccess'));
      }
    } catch (error) {
      console.error('Error reviewing prompt:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('wizard.promptGenerator.messages.reviewError');
      toast.error(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  const labelClass = 'mb-2 flex items-center gap-[5px] text-[13.5px] font-bold text-foreground';
  // Explicit `bg-card`: the Input base is `bg-transparent` and leaks the page background.
  const inputClass =
    'h-auto w-full rounded-[9px] border-border bg-card px-[13px] py-[11px] text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12';
  const hintClass = 'mt-[7px] text-[12.5px] text-muted-foreground';

  return (
    <>
      <div>
        <div>
          <h2 className="text-[22px] font-extrabold tracking-[-0.3px] text-foreground">
            {t('edit.profile.title') || 'Informações pessoais'}
          </h2>
          <p className="mb-[26px] mt-1 text-sm font-normal text-muted-foreground">
            {t('edit.profile.subtitle') || 'Configure as informações básicas do seu agente'}
          </p>
        </div>

        <div className="grid items-start gap-11 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-[22px]">
          <div>
            <Label className={labelClass}>
              {t('edit.profile.name') || 'Nome do agente'} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={e => onFormDataChange('name', e.target.value)}
              placeholder={t('edit.profile.namePlaceholder') || 'Digite o nome do agente'}
              className={inputClass}
            />
          </div>

          {!isOrchestratorType && (
            <div>
              <Label className={labelClass}>{t('edit.profile.role') || 'Papel'}</Label>
              <Input
                value={formData.role}
                onChange={e => onFormDataChange('role', e.target.value)}
                placeholder={
                  t('edit.profile.rolePlaceholder') || 'Ex: Especialista em suporte técnico'
                }
                className={inputClass}
              />
              <p className={hintClass}>
                {t('edit.profile.roleHelp') || 'O papel que o agente desempenha na conversa'}
              </p>
            </div>
          )}

          {!isOrchestratorType && (
            <div>
              <Label className={labelClass}>{t('edit.profile.goal') || 'Objetivo'}</Label>
              <Input
                value={formData.goal}
                onChange={e => onFormDataChange('goal', e.target.value)}
                placeholder={
                  t('edit.profile.goalPlaceholder') || 'Ex: Ajudar usuários com dúvidas técnicas'
                }
                className={inputClass}
              />
              <p className={hintClass}>
                {t('edit.profile.goalHelp') || 'O objetivo principal do agente'}
              </p>
            </div>
          )}

          {!isOrchestratorType && (
            <div>
              <div className="flex items-center justify-between">
                <Label className={labelClass}>
                  {t('edit.profile.instructions') || 'Comportamento'}
                </Label>
                {showAIActions && (
                  <div className="flex gap-2">
                    {formData.instruction && formData.instruction.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleReview}
                        disabled={isReviewing}
                        className="gap-2"
                      >
                        {isReviewing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('wizard.promptGenerator.buttons.reviewing')}
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 text-blue-500" />
                            {t('wizard.promptGenerator.buttons.review')}
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPromptModal(true)}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      {t('wizard.step5.generateWithAI')}
                    </Button>
                  </div>
                )}
              </div>
              <Textarea
                value={formData.instruction}
                onChange={e => onFormDataChange('instruction', e.target.value)}
                placeholder={
                  t('edit.profile.instructionsPlaceholder') ||
                  'Descreva como o agente deve se comportar durante a conversa...'
                }
                className={`${inputClass} min-h-[220px] resize-y leading-[1.6]`}
              />
              <div className={`flex justify-between gap-4 ${hintClass}`}>
                <span>
                  {t('edit.profile.instructionsHelp') ||
                    'Ex. Seja extrovertido, na primeira interação procure saber o nome do usuário.'}
                </span>
                <span className="flex-shrink-0">{formData.instruction.length}/3000</span>
              </div>
            </div>
          )}

            {isTaskAgent(agentType) && onTaskConfigChange && (
              <div className="mt-[22px] border-t border-border pt-[22px]">
                <TaskSection
                  data={taskConfigData || { tasks: [] }}
                  onChange={onTaskConfigChange}
                  editingAgentId={editingAgentId}
                  folderId={undefined}
                />
              </div>
            )}
          </div>

          {agent && (
            <AgentSummaryPanel
              agent={agent}
              model={model}
              subAgentsCount={subAgentsCount}
            />
          )}
        </div>
      </div>

      <PromptGeneratorModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        onGenerated={prompt => {
          onFormDataChange('instruction', prompt);
        }}
        initialPrompt={formData.instruction}
      />
    </>
  );
};

export default ProfileSection;
