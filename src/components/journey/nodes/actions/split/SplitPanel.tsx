import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@evoapi/design-system';
import { Split, Plus, Trash2 } from 'lucide-react';
import { SplitNodeData, SplitVariant } from './SplitNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';

interface SplitPanelProps {
  nodeId: string;
  data: SplitNodeData;
  onUpdate: (nodeId: string, newData: SplitNodeData) => void;
  onClose: () => void;
}

export function SplitPanel({ nodeId, data, onUpdate, onClose }: SplitPanelProps) {
  const { t } = useLanguage('journey');

  const VARIANT_COLORS = [
    { value: 'blue', label: t('panels.split.colors.blue') },
    { value: 'purple', label: t('panels.split.colors.purple') },
    { value: 'green', label: t('panels.split.colors.green') },
    { value: 'orange', label: t('panels.split.colors.orange') },
    { value: 'red', label: t('panels.split.colors.red') },
    { value: 'yellow', label: t('panels.split.colors.yellow') },
  ];

  const defaultVariants = (): SplitVariant[] => [
    {
      id: uuidv4(),
      name: t('panels.split.variants.defaultNames.variantA'),
      percentage: 50,
      color: 'blue',
    },
    {
      id: uuidv4(),
      name: t('panels.split.variants.defaultNames.variantB'),
      percentage: 50,
      color: 'purple',
    },
  ];

  const [originalData] = useState<SplitNodeData>(() => ({
    ...data,
    variants: data.variants || defaultVariants(),
  }));
  const [formData, setFormData] = useState<SplitNodeData>(() => ({
    ...data,
    variants: data.variants || defaultVariants(),
  }));

  useEffect(() => {
    setFormData({
      ...data,
      variants: data.variants || defaultVariants(),
    });
  }, [data]);

  const handleSave = () => {
    const totalPercentage = formData.variants.reduce((sum, variant) => sum + variant.percentage, 0);
    const normalizedVariants = formData.variants.map(variant => ({
      ...variant,
      percentage:
        totalPercentage > 0 ? Math.round((variant.percentage / totalPercentage) * 100) : 0,
    }));

    const updatedData = {
      ...formData,
      variants: normalizedVariants,
    };
    onUpdate(nodeId, updatedData);
    onClose();
  };

  const addVariant = () => {
    const currentVariants = formData.variants || [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const variantLetter =
      letters[currentVariants.length] || `Variante ${currentVariants.length + 1}`;

    const newVariant: SplitVariant = {
      id: uuidv4(),
      name: `${t('panels.split.variants.defaultNames.variantA').replace('A', variantLetter)}`,
      percentage: 0,
      color: VARIANT_COLORS[currentVariants.length % VARIANT_COLORS.length].value,
    };

    setFormData(prev => ({
      ...prev,
      variants: [...currentVariants, newVariant],
    }));
  };

  const updateVariant = (variantId: string, updates: Partial<SplitVariant>) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map(variant =>
        variant.id === variantId ? { ...variant, ...updates } : variant,
      ),
    }));
  };

  const removeVariant = (variantId: string) => {
    if (formData.variants.length <= 2) return;

    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter(variant => variant.id !== variantId),
    }));
  };

  const distributeEqually = () => {
    const variantCount = formData.variants.length;
    const equalPercentage = Math.floor(100 / variantCount);
    const remainder = 100 - equalPercentage * variantCount;

    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((variant, index) => ({
        ...variant,
        percentage: equalPercentage + (index < remainder ? 1 : 0),
      })),
    }));
  };

  const totalPercentage = formData.variants.reduce((sum, variant) => sum + variant.percentage, 0);
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );
  const isValid = totalPercentage > 0;

  const renderVariant = (variant: SplitVariant) => (
    <div key={variant.id} className="p-4 border border-border rounded-lg bg-sidebar-accent/10 space-y-3">
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-4">
          <Label className="text-xs">{t('panels.split.variants.name')}</Label>
          <Input
            value={variant.name}
            onChange={e => updateVariant(variant.id, { name: e.target.value })}
            placeholder={t('panels.split.placeholders.variantName')}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground"
          />
        </div>

        <div className="col-span-3">
          <Label className="text-xs">{t('panels.split.variants.color')}</Label>
          <Select
            value={variant.color}
            onValueChange={value => updateVariant(variant.id, { color: value })}
          >
            <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {VARIANT_COLORS.map(option => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-sidebar-foreground"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-3">
          <Label className="text-xs">{t('panels.split.variants.percentage')}</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={variant.percentage}
            onChange={e => updateVariant(variant.id, { percentage: parseInt(e.target.value) || 0 })}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground"
          />
        </div>

        <div className="col-span-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeVariant(variant.id)}
            disabled={formData.variants.length <= 2}
            className="h-10 w-full p-0 text-flow-feedback-error-fg hover:text-flow-feedback-error-fg disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.split.title')}
      icon={<Split className="h-5 w-5 text-flow-node-condition-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.split.actions.save')}
      cancelLabel={t('panels.split.actions.cancel')}
      contentClassName="max-w-3xl"
    >
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('panels.split.configuration')}
        </Label>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={addVariant}>
            <Plus className="w-4 h-4 mr-1" />
            {t('panels.split.actions.addVariant')}
          </Button>
          <Button variant="outline" size="sm" onClick={distributeEqually}>
            {t('panels.split.actions.distributeEqually')}
          </Button>
        </div>

        <div className="space-y-3">
          {formData.variants && formData.variants.length > 0 ? (
            formData.variants.map(variant => renderVariant(variant))
          ) : (
            <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/40 text-center">
              <Split className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">{t('panels.split.messages.emptyState')}</p>
            </div>
          )}
        </div>

        <FlowFeedbackBanner variant={totalPercentage === 100 ? 'success' : 'warn'}>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {t('panels.split.status.total')}: {totalPercentage}%
            </span>
            {totalPercentage !== 100 && (
              <Badge variant="outline">
                {totalPercentage > 100
                  ? t('panels.split.status.excess')
                  : t('panels.split.status.missing')}{' '}
                {Math.abs(100 - totalPercentage)}%
              </Badge>
            )}
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs mt-1">{t('panels.split.messages.normalizePercentages')}</p>
          )}
        </FlowFeedbackBanner>

        {formData.variants && formData.variants.length > 0 && (
          <FlowFeedbackBanner variant="info">
            <Label className="text-sm font-medium mb-2 block">
              {t('panels.split.status.summary')}:
            </Label>
            <div className="space-y-1 text-sm">
              {formData.variants.map(variant => (
                <div key={variant.id}>
                  <Badge variant="outline" className="mr-2">
                    {variant.color}
                  </Badge>
                  {variant.name}: {variant.percentage}%
                </div>
              ))}
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
