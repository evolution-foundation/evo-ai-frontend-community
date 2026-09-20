import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { CreateStageData } from '@/types/analytics';

interface CreateStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateStageData) => void;
  loading: boolean;
}

const getColorOptions = (t: (key: string) => string) => [
  { value: '#3B82F6', label: t('createStage.colors.blue'), color: '#3B82F6' },
  { value: '#10B981', label: t('createStage.colors.green'), color: '#10B981' },
  { value: '#F59E0B', label: t('createStage.colors.orange'), color: '#F59E0B' },
  { value: '#EF4444', label: t('createStage.colors.red'), color: '#EF4444' },
  { value: '#8B5CF6', label: t('createStage.colors.purple'), color: '#8B5CF6' },
  { value: '#F97316', label: t('createStage.colors.darkOrange'), color: '#F97316' },
  { value: '#06B6D4', label: t('createStage.colors.cyan'), color: '#06B6D4' },
  { value: '#84CC16', label: t('createStage.colors.lime'), color: '#84CC16' },
];

export default function CreateStageModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreateStageModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState<CreateStageData>({
    name: '',
    color: '#3B82F6',
    stage_type: 'active',
    automation_rules: { description: '' },
  });

  const colorOptions = getColorOptions(t);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    onSubmit(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      name: '',
      color: '#3B82F6',
      stage_type: 'active',
      automation_rules: { description: '' },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('createStage.title')}</DialogTitle>
            <DialogDescription>
              {t('createStage.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Stage Name */}
            <div className="grid gap-2">
              <Label htmlFor="stage-name">{t('createStage.name')}</Label>
              <Input
                id="stage-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('createStage.namePlaceholder')}
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="stage-description">{t('createStage.descriptionLabel')}</Label>
              <Textarea
                id="stage-description"
                value={formData.automation_rules?.description || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  automation_rules: {
                    ...formData.automation_rules,
                    description: e.target.value
                  }
                })}
                placeholder={t('createStage.descriptionPlaceholder')}
                rows={3}
                maxLength={500}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {t('createStage.characterCount', {
                  current: (formData.automation_rules?.description || '').length,
                  max: 500,
                })}
              </p>
            </div>

            {/* Color */}
            <div className="grid gap-2">
              <Label>{t('createStage.color')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`w-full h-10 rounded-lg border-2 transition-all ${
                      formData.color === colorOption.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                    onClick={() => setFormData({ ...formData, color: colorOption.value })}
                    disabled={loading}
                    title={colorOption.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: formData.color }}
                />
                {t('createStage.colorSelected')}
              </div>
            </div>

            {/* Stage Type */}
            <div className="grid gap-2">
              <Label htmlFor="stage-type">{t('createStage.stageType')}</Label>
              <Select
                value={formData.stage_type}
                onValueChange={(value: 'active' | 'completed' | 'cancelled') =>
                  setFormData({ ...formData, stage_type: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="stage-type">
                  <SelectValue placeholder={t('createStage.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('createStage.stageTypes.active')}</SelectItem>
                  <SelectItem value="completed">{t('createStage.stageTypes.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('createStage.stageTypes.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {t('createStage.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !formData.name?.trim()}>
              {loading ? t('createStage.creating') : t('createStage.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
