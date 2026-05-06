import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { PipelineStage } from '@/types/analytics';
import type { StageAutomationRule } from '@/types/analytics/pipelines';
import { LocalAttributeDefinition, LocalAttributeDefinitionPayload } from '@/types/pipelines/localAttributeDefinition';
import PipelineStageCustomAttributes from './PipelineStageCustomAttributes';
import StageAutomationRules from './StageAutomationRules';

// Cores predefinidas para as etapas
const getStageColors = (t: (key: string) => string) => [
  { value: '#EF4444', label: t('editStage.colors.red') },
  { value: '#F59E0B', label: t('editStage.colors.orange') },
  { value: '#10B981', label: t('editStage.colors.green') },
  { value: '#3B82F6', label: t('editStage.colors.blue') },
  { value: '#8B5CF6', label: t('editStage.colors.purple') },
  { value: '#F97316', label: t('editStage.colors.darkOrange') },
  { value: '#06B6D4', label: t('editStage.colors.cyan') },
  { value: '#84CC16', label: t('editStage.colors.lime') },
  { value: '#EC4899', label: t('editStage.colors.pink') },
  { value: '#6B7280', label: t('editStage.colors.gray') },
];

interface Agent {
  id: string;
  name: string;
}

interface EditStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PipelineStage | null;
  onSubmit: (data: {
    name: string;
    color: string;
    stage_type: string;
    automation_rules?: { description?: string; rules?: StageAutomationRule[] };
    custom_fields?: Record<string, unknown> & {
      attributes?: string[];
    };
  }) => void;
  loading: boolean;
  stages?: PipelineStage[];
  agents?: Agent[];
}

export default function EditStageModal({
  open,
  onOpenChange,
  stage,
  onSubmit,
  loading,
  stages = [],
  agents = [],
}: EditStageModalProps) {
  const { t } = useLanguage('pipelines');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [stageType, setStageType] = useState('active');
  const [description, setDescription] = useState('');
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [automationRules, setAutomationRules] = useState<StageAutomationRule[]>([]);

  const stageColors = getStageColors(t);

  // Initialize form when modal opens or stage changes
  useEffect(() => {
    if (open && stage) {
      setName(stage.name);
      setColor(stage.color);
      setStageType(stage.stage_type || 'active');
      setDescription(stage.automation_rules?.description || stage.description || '');
      setAutomationRules(stage.automation_rules?.rules || []);
      // Load attributes array from custom_fields.attributes
      // Structure: custom_fields = { attributes: ["key1", "key2", ...] }
      const attributesArray = (stage.custom_fields?.attributes as string[]) || [];
      const localDefinitions =
        (stage.custom_fields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) || {};
      const createdAttributes: Record<string, unknown> = {};
      attributesArray.forEach(key => {
        const localDefinition = localDefinitions[key];
        createdAttributes[key] = localDefinition
          ? {
              __local_definition: true,
              ...localDefinition,
            }
          : null;
      });
      Object.entries(localDefinitions).forEach(([key, definition]) => {
        if (!createdAttributes[key]) {
          createdAttributes[key] = {
            __local_definition: true,
            ...definition,
          };
        }
      });
      setCustomAttributes(createdAttributes);
    }
  }, [open, stage]);

  const handleSubmit = () => {
    if (!name.trim() || !stage) return;
    
    const automationRulesPayload: { description?: string; rules?: StageAutomationRule[] } = {};
    if (description) automationRulesPayload.description = description;
    if (automationRules.length > 0) automationRulesPayload.rules = automationRules;
    
    const attributeKeys = Object.keys(customAttributes);
    const attributeDefinitions = Object.entries(customAttributes).reduce(
      (acc, [key, value]) => {
        if (value && typeof value === 'object' && (value as LocalAttributeDefinition).__local_definition) {
          const localDefinition = value as LocalAttributeDefinition;
          acc[key] = {
            attribute_display_name: localDefinition.attribute_display_name,
            attribute_display_type: localDefinition.attribute_display_type,
            ...(localDefinition.attribute_values?.length
              ? { attribute_values: localDefinition.attribute_values }
              : {}),
          };
        }
        return acc;
      },
      {} as Record<string, LocalAttributeDefinitionPayload>,
    );

    const existingCustomFields = { ...(stage.custom_fields || {}) };
    delete (existingCustomFields as Record<string, unknown>).attributes;
    delete (existingCustomFields as Record<string, unknown>).attribute_definitions;

    onSubmit({
      name: name.trim(),
      color,
      stage_type: stageType,
      automation_rules: Object.keys(automationRulesPayload).length > 0 ? automationRulesPayload : undefined,
      custom_fields: attributeKeys.length > 0
        ? {
            ...existingCustomFields,
            attributes: attributeKeys,
            ...(Object.keys(attributeDefinitions).length > 0
              ? { attribute_definitions: attributeDefinitions }
              : {}),
          }
        : undefined,
    });
  };

  const canSubmit = name.trim().length > 0;

  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('editStage.title')}</DialogTitle>
          <DialogDescription>
            {t('editStage.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('editStage.details')}</TabsTrigger>
            <TabsTrigger value="automation">{t('editStage.automation')}</TabsTrigger>
            <TabsTrigger value="attributes">{t('editStage.customAttributes')}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="py-4 space-y-4 overflow-y-auto flex-1">
          {/* Stage Name */}
          <div className="grid gap-2">
            <Label htmlFor="stage-name">{t('editStage.name')}</Label>
            <Input
              id="stage-name"
              placeholder={t('editStage.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Stage Color */}
          <div className="grid gap-2">
            <Label>{t('editStage.color')}</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                    {stageColors.find(c => c.value === color)?.label || t('editStage.customColor')}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {stageColors.map((colorOption) => (
                  <SelectItem key={colorOption.value} value={colorOption.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: colorOption.value }}
                      />
                      {colorOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage Type */}
          <div className="grid gap-2">
            <Label>{t('editStage.stageType')}</Label>
            <Select value={stageType} onValueChange={setStageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('editStage.stageTypes.active')}</SelectItem>
                <SelectItem value="completed">{t('editStage.stageTypes.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('editStage.stageTypes.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="stage-description">{t('editStage.descriptionLabel')}</Label>
            <Textarea
              id="stage-description"
              placeholder={t('editStage.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {t('editStage.characterCount', { current: description.length, max: 500 })}
            </p>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>{t('editStage.preview')}</Label>
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {name || t('editStage.name')}
                  </h4>
                  {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="automation" className="py-4 overflow-y-auto flex-1">
            <StageAutomationRules
              rules={automationRules}
              onChange={setAutomationRules}
              disabled={loading}
              currentStageId={stage?.id}
              stages={stages}
              agents={agents}
            />
          </TabsContent>

          <TabsContent value="attributes" className="py-4 overflow-y-auto flex-1">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{t('editStage.customAttributes')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('editStage.attributesDescription')}
              </p>
            </div>
            <PipelineStageCustomAttributes
              attributes={customAttributes}
              onAttributesChange={setCustomAttributes}
              disabled={loading}
              pipelineId={stage.pipeline_id}
              stageId={stage.id}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('editStage.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? t('editStage.saving') : t('editStage.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
