import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Button,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
} from '@evoapi/design-system';
import { Star, Info, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import type { TabSaveHandle } from './tabSave';
import CSATDisplayTypeSelector from './CSATDisplayTypeSelector';
import {
  CSATDisplayType,
  CSATConfig,
  CSAT_DISPLAY_TYPES,
  getSurveyRuleOperators,
  DEFAULT_CSAT_CONFIG,
  CSATTrigger,
} from './helpers/csatConstants';
import { labelsService } from '@/services/contacts/labelsService';
import { Label } from '@/types/settings';
import { pipelinesService } from '@/services/pipelines';
import type { Pipeline, PipelineStage } from '@/types/analytics/pipelines';
import { Input } from '@evoapi/design-system/input';

// API response type
export interface APICSATConfig {
  display_type: string;
  message: string;
  survey_rules: {
    triggers: Array<{
      type: string;
      operator?: string;
      values?: string[];
      stage_ids?: string[];
      stage_names?: string[];
      pattern?: string;
      field?: string;
      days?: string[];
      time?: string;
      minutes?: number;
    }>;
  };
}

// Internal trigger item with ID for management
interface TriggerItem {
  id: string;
  type: 'label' | 'stage' | 'regex' | 'inactivity';
  operator?: string;
  values?: string[];
  stage_ids?: string[];
  stage_names?: string[];
  pattern?: string;
  field?: string;
  minutes?: number;
}

// Normalize API config to internal format
function normalizeCSATConfig(config?: APICSATConfig): CSATConfig {
  if (!config?.survey_rules?.triggers) {
    return DEFAULT_CSAT_CONFIG;
  }

  const triggers: CSATTrigger[] = (config.survey_rules.triggers || []).map(trigger => {
    const normalized: any = {
      type: trigger.type,
    };
    
    if (trigger.operator) normalized.operator = trigger.operator;
    if (trigger.values !== undefined) normalized.values = Array.isArray(trigger.values) ? trigger.values : [];
    if (trigger.stage_ids !== undefined) normalized.stage_ids = Array.isArray(trigger.stage_ids) ? trigger.stage_ids : [];
    if (trigger.stage_names !== undefined) normalized.stage_names = Array.isArray(trigger.stage_names) ? trigger.stage_names : [];
    if (trigger.pattern !== undefined) normalized.pattern = trigger.pattern;
    if (trigger.field !== undefined) normalized.field = trigger.field;
    if (trigger.minutes !== undefined) normalized.minutes = trigger.minutes;
    
    return normalized as CSATTrigger;
  });

  return {
    display_type: (config.display_type as CSATDisplayType) || CSAT_DISPLAY_TYPES.EMOJI,
    message: config.message || '',
    survey_rules: {
      triggers: triggers as CSATTrigger[],
    },
  };
}

interface CSATFormProps {
  inboxId: string;
  csatSurveyEnabled?: boolean;
  csatConfig?: APICSATConfig;
  registerSave?: (handle: TabSaveHandle | null) => void;
  onUpdate?: (data: { csat_survey_enabled: boolean; csat_config: CSATConfig }) => Promise<void>;
}

export default function CSATForm({
  csatSurveyEnabled = false,
  csatConfig,
  registerSave,
  onUpdate,
}: CSATFormProps) {
  const { t } = useLanguage('channels');
  const normalizedConfig = normalizeCSATConfig(csatConfig);

  const [isSurveyEnabled, setIsSurveyEnabled] = useState(csatSurveyEnabled);
  const [displayType, setDisplayType] = useState<CSATDisplayType>(
    normalizedConfig.display_type,
  );
  const [message, setMessage] = useState(normalizedConfig.message || '');
  const [triggers, setTriggers] = useState<TriggerItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Data sources
  const [labels, setLabels] = useState<Label[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [availableStages, setAvailableStages] = useState<Record<string, PipelineStage[]>>({});

  // Load labels from API
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await labelsService.getLabels();
        const labelsData = response.data || [];
        setLabels(labelsData);
      } catch (error) {
        console.error('Error loading labels:', error);
        toast.error(t('settings.csat.errors.loadLabelsError'));
        setLabels([]);
      }
    };

    loadLabels();
  }, [t]);

  // Load pipelines from API
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const response = await pipelinesService.getPipelines();
        const pipelinesData = response.data || [];
        setPipelines(pipelinesData);
      } catch (error) {
        console.error('Error loading pipelines:', error);
        setPipelines([]);
      }
    };

    loadPipelines();
  }, []);

  // Load stages for a specific pipeline
  const loadStagesForPipeline = useCallback(async (pipelineId: string): Promise<void> => {
    if (!pipelineId) return;
    
    // Always load, even if already cached, to ensure fresh data
    try {
      const response = await pipelinesService.getPipelineStages(pipelineId);
      const stagesData = response.data || [];
      setAvailableStages(prev => ({ ...prev, [pipelineId]: stagesData }));
    } catch (error) {
      console.error('Error loading stages:', error);
      toast.error(t('settings.csat.errors.loadStagesError', { default: 'Error loading pipeline stages' }));
      throw error;
    }
  }, [t]);

  // Initialize triggers from config
  useEffect(() => {
    const config = normalizeCSATConfig(csatConfig);
    setIsSurveyEnabled(csatSurveyEnabled);
    setDisplayType(config.display_type);
    setMessage(config.message || '');

    // Convert triggers to TriggerItem format with IDs
    const triggerItems: TriggerItem[] = config.survey_rules.triggers.map((trigger, index) => ({
      id: `trigger-${Date.now()}-${index}`,
      type: trigger.type as TriggerItem['type'],
      operator: trigger.operator,
      values: trigger.values,
      stage_ids: trigger.stage_ids,
      stage_names: trigger.stage_names,
      pattern: trigger.pattern,
      field: trigger.field || 'message_content',
      minutes: trigger.minutes,
    }));

    setTriggers(triggerItems);

    // Preload stages for stage triggers
    triggerItems.forEach(trigger => {
      if (trigger.type === 'stage' && trigger.stage_ids && trigger.stage_ids.length > 0) {
        const pipeline = pipelines.find(p => 
          p.stages?.some(s => s.id.toString() === trigger.stage_ids?.[0])
        );
        if (pipeline) {
          loadStagesForPipeline(pipeline.id);
        }
      }
    });
  }, [csatSurveyEnabled, csatConfig, pipelines, loadStagesForPipeline]);

  // Add new trigger
  const handleAddTrigger = (type: TriggerItem['type']) => {
    const newTrigger: TriggerItem = {
      id: `trigger-${Date.now()}-${Math.random()}`,
      type,
      operator: type === 'label' ? 'contains' : type === 'stage' ? 'equals' : undefined,
      field: type === 'regex' ? 'message_content' : undefined,
      values: type === 'label' ? [] : undefined,
      stage_ids: type === 'stage' ? [] : undefined,
    };
    setTriggers(prev => [...prev, newTrigger]);
  };

  // Remove trigger
  const handleRemoveTrigger = (id: string) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
  };

  // Update trigger
  const handleUpdateTrigger = (id: string, updates: Partial<TriggerItem>) => {
    setTriggers(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Get all trigger types with labels
  const getAllTriggerTypes = (): Array<{ value: TriggerItem['type']; label: string }> => {
    return [
      { value: 'label', label: t('settings.csat.triggerTypes.label', { default: 'Label' }) },
      { value: 'stage', label: t('settings.csat.triggerTypes.stage', { default: 'Pipeline Stage' }) },
      { value: 'regex', label: t('settings.csat.triggerTypes.regex', { default: 'Regex Pattern' }) },
      { value: 'inactivity', label: t('settings.csat.triggerTypes.inactivity', { default: 'Inactivity' }) },
    ];
  };

  // Get trigger type label
  const getTriggerTypeLabel = (type: TriggerItem['type']): string => {
    return getAllTriggerTypes().find(t => t.value === type)?.label || type;
  };

  // Get available trigger types (excluding already added ones)
  const getAvailableTriggerTypes = (): Array<{ value: TriggerItem['type']; label: string }> => {
    const allTypes = getAllTriggerTypes();
    
    // Get types that are already in use
    const usedTypes = new Set(triggers.map(t => t.type));
    
    // Filter out types that are already used
    return allTypes.filter(type => !usedTypes.has(type.value));
  };

  // Handle form submission
  const handleSaveSettings = async () => {
    setIsUpdating(true);
    try {
      const triggerData: CSATTrigger[] = triggers.map(trigger => {
        const base: any = { type: trigger.type };
        
        // Always include operator for label and stage triggers
        if (trigger.type === 'label' || trigger.type === 'stage') {
          base.operator = trigger.operator || (trigger.type === 'label' ? 'contains' : 'equals');
        }
        
        if (trigger.values && trigger.values.length > 0) base.values = trigger.values;
        if (trigger.stage_ids && trigger.stage_ids.length > 0) {
          base.stage_ids = trigger.stage_ids;
          // Ensure operator is set for stage triggers
          if (trigger.type === 'stage' && !base.operator) {
            base.operator = 'equals';
          }
        }
        if (trigger.pattern) base.pattern = trigger.pattern;
        if (trigger.field) base.field = trigger.field;
        if (trigger.minutes) base.minutes = trigger.minutes;
        
        return base;
      }).filter(trigger => {
        // Filter out incomplete triggers
        if (trigger.type === 'label' && (!trigger.values || trigger.values.length === 0)) return false;
        if (trigger.type === 'stage' && (!trigger.stage_ids || trigger.stage_ids.length === 0)) return false;
        if (trigger.type === 'regex' && !trigger.pattern) return false;
        if (trigger.type === 'inactivity' && !trigger.minutes) return false;
        return true;
      });

      const csatConfigData: CSATConfig = {
        display_type: displayType,
        message,
        survey_rules: {
          triggers: triggerData as CSATTrigger[],
        },
      };

      const updateData = {
        csat_survey_enabled: isSurveyEnabled,
        csat_config: csatConfigData,
      };

      if (onUpdate) {
        await onUpdate(updateData);
      }

      toast.success(t('settings.csat.success.updated'));
    } catch (error) {
      console.error('Error updating CSAT settings:', error);
      toast.error(t('settings.csat.errors.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Expose the save to the settings sticky footer registry.
  const canSave = !isUpdating;
  const registerSaveRef = useRef(registerSave);
  registerSaveRef.current = registerSave;
  const handleSaveRef = useRef(handleSaveSettings);
  handleSaveRef.current = handleSaveSettings;
  useLayoutEffect(() => {
    registerSaveRef.current?.({ save: () => handleSaveRef.current(), canSave });
    return () => registerSaveRef.current?.(null);
  }, [canSave]);

  // Render trigger form based on type
  const renderTriggerForm = (trigger: TriggerItem) => {
    switch (trigger.type) {
      case 'label':
        return (
          <LabelTriggerForm
            trigger={trigger}
            labels={labels}
            onUpdate={(updates) => handleUpdateTrigger(trigger.id, updates)}
          />
        );
      case 'stage':
        return (
          <StageTriggerForm
            trigger={trigger}
            pipelines={pipelines}
            availableStages={availableStages}
            onLoadStages={loadStagesForPipeline}
            onUpdate={(updates) => handleUpdateTrigger(trigger.id, updates)}
          />
        );
      case 'regex':
        return (
          <RegexTriggerForm
            trigger={trigger}
            onUpdate={(updates) => handleUpdateTrigger(trigger.id, updates)}
          />
        );
      case 'inactivity':
        return (
          <InactivityTriggerForm
            trigger={trigger}
            onUpdate={(updates) => handleUpdateTrigger(trigger.id, updates)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{t('settings.csat.title')}</h4>
                <p className="text-sm text-muted-foreground">{t('settings.csat.description')}</p>
              </div>
            </div>
            <Switch checked={isSurveyEnabled} onCheckedChange={setIsSurveyEnabled} />
          </div>

          {/* CSAT Configuration */}
          {isSurveyEnabled && (
            <div className="space-y-6 mt-6">
              {/* Display Type Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.csat.displayType.label')}
                </label>
                <CSATDisplayTypeSelector selectedType={displayType} onUpdate={setDisplayType} />
                <p className="text-xs text-muted-foreground">
                  {t('settings.csat.displayType.help')}
                </p>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.csat.message.label')}
                </label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('settings.csat.message.placeholder')}
                  className="min-h-[80px]"
                  maxLength={200}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('settings.csat.message.help')}</span>
                  <span>{message.length}/200</span>
                </div>
              </div>

              {/* Triggers Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {t('settings.csat.surveyRules.label')}
                  </label>
                  <Select
                    value=""
                    onValueChange={(value) => handleAddTrigger(value as TriggerItem['type'])}
                    disabled={getAvailableTriggerTypes().length === 0}
                  >
                    <SelectTrigger className="w-auto" disabled={getAvailableTriggerTypes().length === 0}>
                      <SelectValue 
                        placeholder={
                          getAvailableTriggerTypes().length === 0
                            ? t('settings.csat.allTriggersAdded', { default: 'All trigger types have been added' })
                            : t('settings.csat.addTrigger', { default: 'Add Trigger' })
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTriggerTypes().map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {triggers.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('settings.csat.noTriggers', { default: 'No triggers configured. Add a trigger to get started.' })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triggers.map(trigger => (
                      <Card key={trigger.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex flex-col gap-1">
                              <h5 className="text-sm font-semibold text-foreground">
                                {getTriggerTypeLabel(trigger.type)}
                              </h5>
                              <Badge variant="secondary" className="w-fit">
                                {getTriggerTypeLabel(trigger.type)}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTrigger(trigger.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {renderTriggerForm(trigger)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('settings.csat.info.title')}
                  </h6>
                  <div className="text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• {t('settings.csat.info.point1')}</p>
                    <p>• {t('settings.csat.info.point2')}</p>
                    <p>• {t('settings.csat.info.point3')}</p>
                    <p>• {t('settings.csat.info.point4')}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Disabled State */}
          {!isSurveyEnabled && (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h5 className="font-medium text-foreground mb-1">
                {t('settings.csat.disabled.title')}
              </h5>
              <p className="text-sm text-muted-foreground">
                {t('settings.csat.disabled.description')}
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border mt-6">
            <Button onClick={handleSaveSettings} disabled={isUpdating} className="min-w-32">
              {isUpdating ? t('settings.csat.buttons.saving') : t('settings.csat.buttons.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Label Trigger Form Component
interface LabelTriggerFormProps {
  trigger: TriggerItem;
  labels: Label[];
  onUpdate: (updates: Partial<TriggerItem>) => void;
}

function LabelTriggerForm({ trigger, labels, onUpdate }: LabelTriggerFormProps) {
  const { t } = useLanguage('channels');
  const selectedLabels = trigger.values || [];
  const availableLabels = labels.filter(label => !selectedLabels.includes(label.title));

  const handleLabelSelect = (labelTitle: string) => {
    if (!labelTitle || selectedLabels.includes(labelTitle)) return;
    onUpdate({ values: [...selectedLabels, labelTitle] });
  };

  const handleLabelRemove = (labelTitle: string) => {
    onUpdate({ values: selectedLabels.filter(l => l !== labelTitle) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
        <span>{t('settings.csat.surveyRules.description1')}</span>
        <Select
          value={trigger.operator || 'contains'}
          onValueChange={(value) => onUpdate({ operator: value })}
        >
          <SelectTrigger className="w-auto min-w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getSurveyRuleOperators().map(operator => (
              <SelectItem key={operator.value} value={operator.value}>
                {operator.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>{t('settings.csat.surveyRules.description2')}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedLabels.map(labelTitle => {
          const label = labels.find(l => l.title === labelTitle);
          return (
            <Badge
              key={labelTitle}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
              style={{
                backgroundColor: label?.color ? label.color + '20' : undefined,
                color: label?.color,
              }}
            >
              {labelTitle}
              <button
                onClick={() => handleLabelRemove(labelTitle)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}

        {availableLabels.length > 0 && (
          <Select value="" onValueChange={handleLabelSelect}>
            <SelectTrigger className="w-auto min-w-32">
              <SelectValue placeholder={t('settings.csat.surveyRules.addLabel')} />
            </SelectTrigger>
            <SelectContent>
              {availableLabels.map(label => (
                <SelectItem key={label.id} value={label.title}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedLabels.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          {t('settings.csat.surveyRules.noLabelsSelected')}
        </p>
      )}
    </div>
  );
}

// Stage Trigger Form Component
interface StageTriggerFormProps {
  trigger: TriggerItem;
  pipelines: Pipeline[];
  availableStages: Record<string, PipelineStage[]>;
  onLoadStages: (pipelineId: string) => Promise<void>;
  onUpdate: (updates: Partial<TriggerItem>) => void;
}

function StageTriggerForm({
  trigger,
  pipelines,
  availableStages,
  onLoadStages,
  onUpdate,
}: StageTriggerFormProps) {
  const { t } = useLanguage('channels');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  
  // Find pipeline that contains the selected stages on mount or when stage_ids change
  useEffect(() => {
    if (trigger.stage_ids && trigger.stage_ids.length > 0) {
      // Try to find pipeline by checking stages
      const pipeline = pipelines.find(p => {
        if (p.stages && p.stages.length > 0) {
          return trigger.stage_ids?.some(stageId =>
            p.stages?.some(s => s.id.toString() === stageId)
          );
        }
        return false;
      });
      
      if (pipeline) {
        setSelectedPipelineId(pipeline.id);
        // Load stages if not already loaded
        if (!availableStages[pipeline.id]) {
          setIsLoadingStages(true);
          (async () => {
            try {
              await onLoadStages(pipeline.id);
            } finally {
              setIsLoadingStages(false);
            }
          })();
        }
      }
    }
  }, [trigger.stage_ids, pipelines, availableStages, onLoadStages]);
  
  const stages = selectedPipelineId ? availableStages[selectedPipelineId] || [] : [];
  const selectedStageIds = trigger.stage_ids || [];

  const handlePipelineChange = async (pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
    setIsLoadingStages(true);
    try {
      await onLoadStages(pipelineId);
      // Clear selected stages when pipeline changes
      onUpdate({ stage_ids: [], operator: 'equals' });
    } finally {
      setIsLoadingStages(false);
    }
  };

  const handleStageToggle = (stageId: string) => {
    const current = selectedStageIds;
    if (current.includes(stageId)) {
      onUpdate({ stage_ids: current.filter(id => id !== stageId) });
    } else {
      onUpdate({ stage_ids: [...current, stageId] });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('settings.csat.stageTrigger.selectPipeline')}
        </label>
        <Select value={selectedPipelineId} onValueChange={handlePipelineChange} disabled={isLoadingStages}>
          <SelectTrigger>
            <SelectValue placeholder={t('settings.csat.stageTrigger.selectPipeline')} />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map(pipeline => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingStages && (
        <p className="text-xs text-muted-foreground">
          {t('settings.csat.stageTrigger.loadingStages', { default: 'Loading stages...' })}
        </p>
      )}

      {selectedPipelineId && !isLoadingStages && stages.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            {t('settings.csat.stageTrigger.selectStages')}
          </label>
          <div className="flex flex-wrap gap-2">
            {stages.map(stage => {
              const stageIdStr = stage.id.toString();
              const isSelected = selectedStageIds.includes(stageIdStr);
              return (
                <Badge
                  key={stage.id}
                  variant={isSelected ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => handleStageToggle(stageIdStr)}
                  style={{
                    backgroundColor: isSelected ? (stage.color || '#6366F1') : undefined,
                    color: isSelected ? '#fff' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color || '#6366F1' }}
                    />
                    {stage.name}
                  </div>
                </Badge>
              );
            })}
          </div>
          {selectedStageIds.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              {t('settings.csat.stageTrigger.noStagesSelected', { default: 'No stages selected' })}
            </p>
          )}
        </div>
      )}

      {selectedPipelineId && !isLoadingStages && stages.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('settings.csat.stageTrigger.noStagesAvailable', { default: 'No stages available for this pipeline' })}
        </p>
      )}
    </div>
  );
}

// Regex Trigger Form Component
interface RegexTriggerFormProps {
  trigger: TriggerItem;
  onUpdate: (updates: Partial<TriggerItem>) => void;
}

function RegexTriggerForm({ trigger, onUpdate }: RegexTriggerFormProps) {
  const { t } = useLanguage('channels');

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('settings.csat.regexTrigger.field')}
        </label>
        <Select
          value={trigger.field || 'message_content'}
          onValueChange={(value) => onUpdate({ field: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message_content">
              {t('settings.csat.regexTrigger.fieldMessageContent')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('settings.csat.regexTrigger.pattern')}
        </label>
        <Input
          value={trigger.pattern || ''}
          onChange={(e) => onUpdate({ pattern: e.target.value })}
          placeholder={t('settings.csat.regexTrigger.patternPlaceholder')}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.csat.regexTrigger.help')}
        </p>
      </div>
    </div>
  );
}

// Inactivity Trigger Form Component
interface InactivityTriggerFormProps {
  trigger: TriggerItem;
  onUpdate: (updates: Partial<TriggerItem>) => void;
}

function InactivityTriggerForm({ trigger, onUpdate }: InactivityTriggerFormProps) {
  const { t } = useLanguage('channels');

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          {t('settings.csat.inactivityTrigger.minutes')}
        </label>
        <Input
          type="number"
          value={trigger.minutes || ''}
          onChange={(e) => {
            const value = e.target.value;
            onUpdate({ minutes: value === '' ? undefined : Number(value) });
          }}
          placeholder={t('settings.csat.inactivityTrigger.placeholder')}
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.csat.inactivityTrigger.help')}
        </p>
      </div>
    </div>
  );
}
