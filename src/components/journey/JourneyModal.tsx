import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Switch,
  Label,
} from '@evoapi/design-system';
import { journeyService } from '@/services';
import { Journey, TriggerType } from '@/types/automation';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface JourneyModalProps {
  open: boolean;
  onClose: () => void;
  journey?: Journey | null;
  onSave: () => void;
}

export default function JourneyModal({ open, onClose, journey, onSave }: JourneyModalProps) {
  const { t } = useLanguage('journey');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    if (journey) {
      setFormData({
        name: journey.name || '',
        description: journey.description || '',
        isActive: journey.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
  }, [journey]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('modal.fields.name.required'));
      return;
    }

    try {
      setLoading(true);

      const basePayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      if (journey?.id) {
        // Metadata-only edit: never resend flowData/flowTriggers — the backend
        // replaces the stored flow wholesale, so a trigger-only payload would
        // wipe the flow built in the editor (EVO-1745).
        await journeyService.updateJourney(journey.id, basePayload);
        toast.success(t('modal.messages.updateSuccess'));
      } else {
        const createPayload = {
          ...basePayload,
          flowData: {
            nodes: [
              {
                id: 'journey-trigger-node',
                type: 'journey-trigger-node',
                position: { x: -100, y: 100 },
                data: {
                  label: t('modal.defaultTrigger.label'),
                  description: t('modal.defaultTrigger.description'),
                  triggerType: 'manual',
                  conditions: [],
                },
              },
            ],
            edges: [],
            variables: [],
          },
          flowTriggers: [
            {
              id: 'default-trigger',
              type: TriggerType.Manual,
              name: t('modal.defaultTrigger.name'),
              enabled: true,
            },
          ],
        };
        await journeyService.createJourney(createPayload);
        toast.success(t('modal.messages.createSuccess'));
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar jornada:', error);
      toast.error(t('modal.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-sidebar border-sidebar-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground">
            {journey ? t('modal.edit.title') : t('modal.create.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sidebar-foreground">
              {t('modal.fields.name.label')} *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder={t('modal.fields.name.placeholder')}
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sidebar-foreground">
              {t('modal.fields.description.label')}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder={t('modal.fields.description.placeholder')}
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={value => handleInputChange('isActive', value)}
            />
            <Label htmlFor="isActive" className="text-sidebar-foreground">
              {t('modal.fields.isActive')}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border-sidebar-border"
          >
            {t('modal.actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading
              ? t('modal.actions.saving')
              : journey
              ? t('modal.edit.button')
              : t('modal.create.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
