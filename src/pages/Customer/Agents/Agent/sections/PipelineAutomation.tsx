import { useTranslation as useUiTranslation } from 'react-i18next';
import i18n from '@/i18n/config';
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
  Input,
} from '@evoapi/design-system';
import {  Info, Trash2, Plus, CheckSquare, Calendar } from 'lucide-react';
import { useState } from 'react';

export interface PipelineTask {
  id: string;
  title: string;
  taskType: 'call' | 'email' | 'meeting' | 'follow_up' | 'note' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDays?: number;
  description?: string;
}

export interface StageAutomation {
  id: string;
  stageId: string;
  stageName?: string;
  instructions: string;
  createTasks: PipelineTask[];
  notifyTeam: boolean;
}

export interface PipelineAutomationConfig {
  id?: string;
  pipelineId: string;
  pipelineName?: string;
  stageAutomations: StageAutomation[];
}

interface PipelineAutomationProps {
  rules: PipelineAutomationConfig[];
  onChange: (rules: PipelineAutomationConfig[]) => void;
  availablePipelines?: Array<{ id: string; name: string; stages: Array<{ id: string; name: string }> }>;
}

const TASK_TYPES = [
  { value: 'call', get label() { return i18n.t("pipelines:tasks.types.call"); } },
  { value: 'email', get label() { return i18n.t("pipelines:tasks.types.email"); } },
  { value: 'meeting', get label() { return i18n.t("pipelines:tasks.types.meeting"); } },
  { value: 'follow_up', get label() { return i18n.t("interface:pipelineautomation.followUp"); } },
  { value: 'note', get label() { return i18n.t("journey:panels.createPipelineTask.taskTypes.note"); } },
  { value: 'other', get label() { return i18n.t("pipelines:tasks.types.other"); } },
];

const PRIORITIES = [
  { value: 'low', get label() { return i18n.t("pipelines:tasks.priority.low"); }, color: 'text-gray-500' },
  { value: 'medium', get label() { return i18n.t("pipelines:tasks.priority.medium"); }, color: 'text-yellow-500' },
  { value: 'high', get label() { return i18n.t("pipelines:tasks.priority.high"); }, color: 'text-orange-500' },
  { value: 'urgent', get label() { return i18n.t("pipelines:tasks.priority.urgent"); }, color: 'text-red-500' },
];

const PipelineAutomation = ({ rules, onChange, availablePipelines = [] }: PipelineAutomationProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const handleAddRule = () => {
    const newRule: PipelineAutomationConfig = {
      id: `pipeline_${Date.now()}`,
      pipelineId: '',
      stageAutomations: [],
    };
    onChange([...rules, newRule]);
    setExpandedRule(newRule.id || null);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<PipelineAutomationConfig>) => {
    onChange(
      rules.map(rule => {
        if (rule.id === ruleId) {
          const updatedRule = { ...rule, ...updates };
          // Se mudou o pipeline, limpa as automações
          if (updates.pipelineId && updates.pipelineId !== rule.pipelineId) {
            updatedRule.stageAutomations = [];
          }
          return updatedRule;
        }
        return rule;
      })
    );
  };

  const handleRemoveRule = (ruleId: string) => {
    onChange(rules.filter(rule => rule.id !== ruleId));
  };

  const handleAddStageAutomation = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newStageAutomation: StageAutomation = {
      id: `stage_${Date.now()}`,
      stageId: '',
      instructions: '',
      createTasks: [],
      notifyTeam: false,
    };

    handleUpdateRule(ruleId, {
      stageAutomations: [...rule.stageAutomations, newStageAutomation],
    });
    setExpandedStage(newStageAutomation.id);
  };

  const handleUpdateStageAutomation = (
    ruleId: string,
    stageId: string,
    updates: Partial<StageAutomation>
  ) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    handleUpdateRule(ruleId, {
      stageAutomations: rule.stageAutomations.map(stage =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      ),
    });
  };

  const handleRemoveStageAutomation = (ruleId: string, stageId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    handleUpdateRule(ruleId, {
      stageAutomations: rule.stageAutomations.filter(stage => stage.id !== stageId),
    });
  };

  const handleAddTask = (ruleId: string, stageId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    const stage = rule?.stageAutomations.find(s => s.id === stageId);
    if (!rule || !stage) return;

    const newTask: PipelineTask = {
      id: `task_${Date.now()}`,
      title: '',
      taskType: 'call',
      priority: 'medium',
    };

    handleUpdateStageAutomation(ruleId, stageId, {
      createTasks: [...stage.createTasks, newTask],
    });
  };

  const handleUpdateTask = (
    ruleId: string,
    stageId: string,
    taskId: string,
    updates: Partial<PipelineTask>
  ) => {
    const rule = rules.find(r => r.id === ruleId);
    const stage = rule?.stageAutomations.find(s => s.id === stageId);
    if (!rule || !stage) return;

    handleUpdateStageAutomation(ruleId, stageId, {
      createTasks: stage.createTasks.map(task => (task.id === taskId ? { ...task, ...updates } : task)),
    });
  };

  const handleRemoveTask = (ruleId: string, stageId: string, taskId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    const stage = rule?.stageAutomations.find(s => s.id === stageId);
    if (!rule || !stage) return;

    handleUpdateStageAutomation(ruleId, stageId, {
      createTasks: stage.createTasks.filter(task => task.id !== taskId),
    });
  };

  const getSelectedPipeline = (pipelineId: string) => {
    return availablePipelines.find(p => p.id === pipelineId);
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          {t('edit.configuration.pipelineAutomation.description')}
        </p>
      </div>

      {/* Pipeline Rules List */}
      <div className="space-y-4">
        {rules.map(rule => {
          const selectedPipeline = getSelectedPipeline(rule.pipelineId);
          const isExpanded = expandedRule === rule.id;

          return (
            <Card key={rule.id} className="bg-card">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Select
                        value={rule.pipelineId}
                        onValueChange={value => {
                          const pipeline = availablePipelines.find(p => p.id === value);
                          handleUpdateRule(rule.id || '', {
                            pipelineId: value,
                            pipelineName: pipeline?.name,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full max-w-md">
                          <SelectValue
                            placeholder={
                              t('edit.configuration.pipelineAutomation.selectPipeline')
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
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRule(isExpanded ? null : rule.id || null)}
                      >
                        {isExpanded ? tUi("pipelines:tasks.actions.collapse") : tUi("pipelines:tasks.actions.expand")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(rule.id || '')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Stage Automations */}
                  {isExpanded && selectedPipeline && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {t('edit.configuration.pipelineAutomation.stageAutomations')}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => rule.id && handleAddStageAutomation(rule.id)}
                          disabled={!rule.id}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('edit.configuration.pipelineAutomation.addStage')}
                        </Button>
                      </div>

                      {rule.stageAutomations.map(stageAuto => {
                        const isStageExpanded = expandedStage === stageAuto.id;

                        return (
                          <Card key={stageAuto.id} className="bg-muted/30">
                            <CardContent className="p-3 space-y-3">
                              {/* Stage Selection */}
                              <div className="flex items-center gap-3">
                                <Select
                                  value={stageAuto.stageId}
                                  onValueChange={value => {
                                    const stage = selectedPipeline.stages.find(s => s.id === value);
                                    if (rule.id) {
                                      handleUpdateStageAutomation(rule.id, stageAuto.id, {
                                        stageId: value,
                                        stageName: stage?.name,
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue
                                      placeholder={
                                        t('edit.configuration.pipelineAutomation.selectStage')
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedPipeline.stages.map(stage => (
                                      <SelectItem key={stage.id} value={stage.id}>
                                        {stage.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedStage(isStageExpanded ? null : stageAuto.id)
                                  }
                                >
                                  {isStageExpanded ? tUi("pipelines:tasks.actions.collapse") : tUi("integrations:configure")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => rule.id && handleRemoveStageAutomation(rule.id, stageAuto.id)}
                                  disabled={!rule.id}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>

                              {/* Stage Configuration */}
                              {isStageExpanded && (
                                <div className="space-y-4 pl-3 border-l-2 border-primary/20">
                                  {/* Instructions */}
                                  <div className="space-y-2">
                                    <Label className="text-sm">
                                      {t('edit.configuration.pipelineAutomation.whenToMove')}
                                    </Label>
                                    <Textarea
                                      value={stageAuto.instructions || ''}
                                      onChange={e =>
                                        rule.id &&
                                        handleUpdateStageAutomation(rule.id, stageAuto.id, {
                                          instructions: e.target.value,
                                        })
                                      }
                                      placeholder={
                                        t(
                                          'edit.configuration.pipelineAutomation.instructionsPlaceholder'
                                        )
                                      }
                                      maxLength={300}
                                      className="min-h-[80px]"
                                    />
                                  </div>

                                  {/* Notify Team */}
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`notify-${stageAuto.id}`}
                                      checked={stageAuto.notifyTeam}
                                      onCheckedChange={checked =>
                                        rule.id &&
                                        handleUpdateStageAutomation(rule.id, stageAuto.id, {
                                          notifyTeam: !!checked,
                                        })
                                      }
                                    />
                                    <label
                                      htmlFor={`notify-${stageAuto.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      {t('edit.configuration.pipelineAutomation.notifyTeam')}
                                    </label>
                                  </div>

                                  {/* Tasks */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-sm flex items-center gap-2">
                                        <CheckSquare className="h-4 w-4" />
                                        {t('edit.configuration.pipelineAutomation.autoTasks')}
                                      </Label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => rule.id && handleAddTask(rule.id, stageAuto.id)}
                                        disabled={!rule.id}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {t('edit.configuration.pipelineAutomation.addTask')}
                                      </Button>
                                    </div>

                                    {stageAuto.createTasks.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">
                                        {t('edit.configuration.pipelineAutomation.noTasks')}
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {stageAuto.createTasks.map(task => (
                                          <Card key={task.id} className="bg-background">
                                            <CardContent className="p-3 space-y-2">
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  value={task.title}
                                                  onChange={e =>
                                                    rule.id &&
                                                    handleUpdateTask(rule.id, stageAuto.id, task.id, {
                                                      title: e.target.value,
                                                    })
                                                  }
                                                  placeholder={
                                                    t(
                                                      'edit.configuration.pipelineAutomation.taskTitle'
                                                    )
                                                  }
                                                  className="flex-1"
                                                />
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    rule.id && handleRemoveTask(rule.id, stageAuto.id, task.id)
                                                  }
                                                  disabled={!rule.id}
                                                >
                                                  <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                              </div>

                                              <div className="grid grid-cols-3 gap-2">
                                                <Select
                                                  value={task.taskType}
                                                  onValueChange={value =>
                                                    rule.id &&
                                                    handleUpdateTask(rule.id, stageAuto.id, task.id, {
                                                      taskType: value as PipelineTask['taskType'],
                                                    })
                                                  }
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {TASK_TYPES.map(type => (
                                                      <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>

                                                <Select
                                                  value={task.priority}
                                                  onValueChange={value =>
                                                    rule.id &&
                                                    handleUpdateTask(rule.id, stageAuto.id, task.id, {
                                                      priority: value as PipelineTask['priority'],
                                                    })
                                                  }
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {PRIORITIES.map(priority => (
                                                      <SelectItem
                                                        key={priority.value}
                                                        value={priority.value}
                                                      >
                                                        <span className={priority.color}>
                                                          {priority.label}
                                                        </span>
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-1">
                                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                                  <Input
                                                    type="number"
                                                    value={task.dueDays || ''}
                                                    onChange={e =>
                                                      rule.id &&
                                                      handleUpdateTask(rule.id, stageAuto.id, task.id, {
                                                        dueDays: parseInt(e.target.value) || undefined,
                                                      })
                                                    }
                                                    placeholder={tUi("segments:conditionEditor.timeUnits.days")}
                                                    className="text-xs"
                                                    min="0"
                                                  />
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}

                      {rule.stageAutomations.length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4">
                          {t('edit.configuration.pipelineAutomation.noStagesConfigured')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Rule Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddRule}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('edit.configuration.pipelineAutomation.addPipeline')}
      </Button>
    </div>
  );
};

export default PipelineAutomation;
