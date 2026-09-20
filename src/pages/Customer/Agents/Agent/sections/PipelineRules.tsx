import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Button,
  Card,
  CardContent,
  Checkbox,
  Label,
} from '@evoapi/design-system';
import { GitBranch, Trash2, Plus, Info } from 'lucide-react';

export interface StageRule {
  id: string;
  stageId: string;
  stageName?: string;
  instructions: string;
}

export interface PipelineRule {
  id: string;
  pipelineId: string;
  pipelineName?: string;
  allowTasks: boolean;
  allowServices: boolean;
  generalInstructions: string;
  stages: StageRule[];
}

interface PipelineRulesProps {
  rules: PipelineRule[];
  onChange: (rules: PipelineRule[]) => void;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
}

const PipelineRules = ({ rules = [], onChange, availablePipelines = [] }: PipelineRulesProps) => {
  const { t } = useLanguage('aiAgents');

  const safeRules = rules || [];

  const handleAddPipeline = () => {
    const newRule: PipelineRule = {
      id: `pipeline_${Date.now()}`,
      pipelineId: '',
      pipelineName: '',
      allowTasks: false,
      allowServices: false,
      generalInstructions: '',
      stages: [],
    };
    onChange([...safeRules, newRule]);
  };

  const handleUpdatePipeline = (id: string, updates: Partial<PipelineRule>) => {
    onChange(
      safeRules.map(rule => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const handleRemovePipeline = (id: string) => {
    onChange(safeRules.filter(rule => rule.id !== id));
  };

  const handleAddStage = (pipelineRuleId: string) => {
    const pipelineRule = safeRules.find(r => r.id === pipelineRuleId);
    if (!pipelineRule) return;

    const newStage: StageRule = {
      id: `stage_${Date.now()}`,
      stageId: '',
      stageName: '',
      instructions: '',
    };

    handleUpdatePipeline(pipelineRuleId, {
      stages: [...pipelineRule.stages, newStage],
    });
  };

  const handleUpdateStage = (pipelineRuleId: string, stageId: string, updates: Partial<StageRule>) => {
    const pipelineRule = safeRules.find(r => r.id === pipelineRuleId);
    if (!pipelineRule) return;

    const updatedStages = pipelineRule.stages.map(stage =>
      stage.id === stageId ? { ...stage, ...updates } : stage
    );

    handleUpdatePipeline(pipelineRuleId, { stages: updatedStages });
  };

  const handleRemoveStage = (pipelineRuleId: string, stageId: string) => {
    const pipelineRule = safeRules.find(r => r.id === pipelineRuleId);
    if (!pipelineRule) return;

    const updatedStages = pipelineRule.stages.filter(stage => stage.id !== stageId);
    handleUpdatePipeline(pipelineRuleId, { stages: updatedStages });
  };

  const getSelectedPipeline = (pipelineId: string) => {
    return availablePipelines.find(p => p.id === pipelineId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[10px] border border-primary/30 bg-primary/10 p-3">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <p className="text-sm leading-[1.5] text-primary">
          {t('edit.configuration.pipelineRules.description') ||
            'Configure instruções para o agente manipular pipelines e atribuir conversas a estágios específicos.'}
        </p>
      </div>

      <div className="space-y-4">
        {safeRules.map(rule => {
          const selectedPipeline = getSelectedPipeline(rule.pipelineId);

          return (
            // `py-0` cancels the Card base `py-6`, which would stack with the CardContent.
            <Card
              key={rule.id}
              className="rounded-[14px] border-border bg-card py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <GitBranch className="h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="flex-1">
                      <Select
                        value={rule.pipelineId || ''}
                        onValueChange={value => {
                          const pipeline = availablePipelines.find(p => p.id === value);
                          handleUpdatePipeline(rule.id, {
                            pipelineId: value,
                            pipelineName: pipeline?.name,
                            stages: [], // Reset stages when pipeline changes
                          });
                        }}
                      >
                        <SelectTrigger className="w-full rounded-[9px] border-border bg-card">
                          <SelectValue
                            placeholder={
                              t('edit.configuration.pipelineRules.selectPipeline') ||
                              'Selecione o pipeline'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePipelines.map(pipeline => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemovePipeline(rule.id)}
                      className="h-auto flex-shrink-0 rounded-[9px] border-border bg-card p-[9px]"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {rule.pipelineId && selectedPipeline && (
                    // No nested box: the content runs straight in the rule card.
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`allow-tasks-${rule.id}`}
                            checked={rule.allowTasks || false}
                            onCheckedChange={(checked) =>
                              handleUpdatePipeline(rule.id, { allowTasks: !!checked })
                            }
                          />
                          <Label
                            htmlFor={`allow-tasks-${rule.id}`}
                            className="cursor-pointer text-[13.5px] text-foreground"
                          >
                            {t('edit.configuration.pipelineRules.allowTasks') ||
                              'Criar/gerenciar tarefas'}
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`allow-services-${rule.id}`}
                            checked={rule.allowServices || false}
                            onCheckedChange={(checked) =>
                              handleUpdatePipeline(rule.id, { allowServices: !!checked })
                            }
                          />
                          <Label
                            htmlFor={`allow-services-${rule.id}`}
                            className="cursor-pointer text-[13.5px] text-foreground"
                          >
                            {t('edit.configuration.pipelineRules.allowServices') ||
                              'Criar/gerenciar serviços'}
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <Label className="text-[13.5px] font-bold text-foreground">
                            {t('edit.configuration.pipelineRules.generalInstructions') ||
                              'Instruções gerais (quando e o que fazer):'}
                          </Label>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">
                            {(rule.generalInstructions?.length || 0)}/500
                          </span>
                        </div>
                        <Textarea
                          value={rule.generalInstructions || ''}
                          onChange={(e) =>
                            handleUpdatePipeline(rule.id, {
                              generalInstructions: e.target.value,
                            })
                          }
                          placeholder={
                            t('edit.configuration.pipelineRules.generalInstructionsPlaceholder') ||
                            'Defina quando o agente deve criar tarefas, adicionar serviços, ou realizar outras ações neste pipeline...'
                          }
                          maxLength={500}
                          className="min-h-[90px] rounded-[9px] border-border bg-card text-sm placeholder:text-muted-foreground/70"
                        />
                      </div>
                    </div>
                  )}

                  {rule.pipelineId && selectedPipeline && (
                    <div className="space-y-2">
                      {rule.stages.map(stage => (
                        <div
                          key={stage.id}
                          className="space-y-2 rounded-[10px] border border-border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Select
                                value={stage.stageId || ''}
                                onValueChange={value => {
                                  const stageData = selectedPipeline.stages.find(
                                    s => s.id === value
                                  );
                                  handleUpdateStage(rule.id, stage.id, {
                                    stageId: value,
                                    stageName: stageData?.name,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full rounded-[9px] border-border bg-card">
                                  <SelectValue
                                    placeholder={
                                      t('edit.configuration.pipelineRules.selectStage') ||
                                      'Selecione o estágio'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedPipeline.stages.map(stageOption => (
                                    <SelectItem key={stageOption.id} value={stageOption.id}>
                                      {stageOption.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStage(rule.id, stage.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                {t('edit.configuration.pipelineRules.instructions') ||
                                  'Regras de atribuição:'}
                              </label>
                              <span className="text-xs text-muted-foreground">
                                {(stage.instructions?.length || 0)}/255
                              </span>
                            </div>
                            <Textarea
                              value={stage.instructions || ''}
                              onChange={e =>
                                handleUpdateStage(rule.id, stage.id, {
                                  instructions: e.target.value,
                                })
                              }
                              placeholder={
                                t('edit.configuration.pipelineRules.instructionsPlaceholder') ||
                                'Quando o cliente mencionar interesse em produto X, mova para este estágio...'
                              }
                              maxLength={255}
                              className="min-h-[70px] rounded-[9px] border-border bg-card text-sm placeholder:text-muted-foreground/70"
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddStage(rule.id)}
                        className="h-auto w-full rounded-[10px] border-border bg-card py-[10px] text-[13px] font-semibold text-foreground"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('edit.configuration.pipelineRules.addStage') ||
                          'Adicionar estágio'}
                      </Button>
                    </div>
                  )}

                  {!rule.pipelineId && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('edit.configuration.pipelineRules.selectPipelineFirst') ||
                        'Selecione um pipeline para adicionar estágios'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddPipeline}
        className="h-auto w-full rounded-[12px] border-border bg-card py-[14px] text-sm font-semibold text-foreground"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('edit.configuration.pipelineRules.addPipeline') || 'Adicionar pipeline'}
      </Button>
    </div>
  );
};

export default PipelineRules;
