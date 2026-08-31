import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Separator,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@evoapi/design-system';
import { Plus, Globe, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Macro, MacroAction, MACRO_ACTION_TYPES } from '@/types/automation';
import { macrosService } from '@/services/macros';
import type { MacroFormData, MacroFormDataSource } from '@/services/macros';
import MacroActionRow from './MacroActionRow';

const ALL_FORM_DATA_SOURCES: MacroFormDataSource[] = ['inboxes', 'agents', 'teams', 'labels'];

interface MacroFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  macro?: Macro | null;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  visibility: 'personal' | 'global';
  actions: MacroAction[];
}

type FormOptions = Pick<
  MacroFormData,
  'inboxes' | 'agents' | 'teams' | 'labels' | 'campaigns'
>;

const initialFormData: FormData = {
  name: '',
  visibility: 'personal',
  actions: [
    {
      action_name: 'assign_team',
      action_params: [],
    },
  ],
};

export default function MacroFormModal({ isOpen, onClose, macro, onSuccess }: MacroFormModalProps) {
  const { t } = useLanguage('macros');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formDataOptions, setFormDataOptions] = useState<FormOptions>({
    inboxes: [],
    agents: [],
    teams: [],
    labels: [],
    campaigns: [],
  });
  // Starts true: the fetch is fired by an effect, which only runs after the
  // first paint — false here shows "nothing registered" for a frame.
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<MacroFormDataSource[]>([]);

  const isEditing = !!macro;

  // Load the form option lists
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  // Load the macro being edited
  useEffect(() => {
    if (isOpen) {
      if (macro) {
        setFormData({
          name: macro.name,
          visibility: macro.visibility,
          actions: macro.actions,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, macro]);

  const loadFormData = async () => {
    setOptionsLoading(true);
    try {
      const { failedSources: failed, ...data } = await macrosService.getFormData();
      setFormDataOptions(data);
      setFailedSources(failed);
    } catch (error) {
      console.error('Failed to load the macro form data:', error);
      setFailedSources(ALL_FORM_DATA_SOURCES);
    } finally {
      setOptionsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('modal.validation.nameRequired');
    }

    if (formData.actions.length === 0) {
      newErrors.actions = t('modal.validation.actionsRequired');
    }

    // Validate actions
    formData.actions.forEach((action, index) => {
      if (!action.action_name) {
        newErrors[`action_${index}_name`] = t('modal.validation.actionTypeRequired');
      }

      // Validate params for the actions that take one
      const actionType = MACRO_ACTION_TYPES.find(type => type.key === action.action_name);
      if (actionType && actionType.inputType && actionType.inputType !== null) {
        // multi_select needs at least one item selected
        if (actionType.inputType === 'multi_select') {
          if (!action.action_params || action.action_params.length === 0) {
            newErrors[`action_${index}_params`] = t('modal.validation.selectAtLeastOne');
          }
        }
        // Every other input type needs a first param
        else if (
          !action.action_params ||
          action.action_params.length === 0 ||
          (!action.action_params[0] && action.action_params[0] !== 0)
        ) {
          newErrors[`action_${index}_params`] = t('modal.validation.fieldRequired');
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await macrosService.updateMacro(macro.id, formData);
        toast.success(t('messages.updateSuccess'));
      } else {
        await macrosService.createMacro(formData);
        toast.success(t('messages.createSuccess'));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving macro:', error);
      toast.error(isEditing ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FormData, value: FormData[keyof FormData]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear the field error
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [
        ...prev.actions,
        {
          action_name: 'assign_team',
          action_params: [],
        },
      ],
    }));
  };

  const removeAction = (index: number) => {
    if (formData.actions.length <= 1) return;

    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const updateAction = (index: number, updatedAction: MacroAction) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => (i === index ? updatedAction : action)),
    }));

    // Clear the errors tied to this action
    const newErrors = { ...errors };
    delete newErrors[`action_${index}_name`];
    delete newErrors[`action_${index}_params`];
    setErrors(newErrors);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[85vw] min-w-[700px] max-h-[90vh] overflow-y-auto bg-sidebar border-sidebar-border">
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground">
            {isEditing ? t('modal.title.edit') : t('modal.title.create')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {failedSources.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
              <div className="text-sm text-red-500">
                <p className="font-medium">{t('modal.optionsError.title')}</p>
                <p>
                  {t('modal.optionsError.description', {
                    sources: failedSources
                      .map(source => t(`modal.optionsError.sources.${source}`))
                      .join(', '),
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Basic information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sidebar-foreground">
                {t('modal.form.name')} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder={t('modal.form.namePlaceholder')}
                className={`w-full bg-sidebar border-sidebar-border text-sidebar-foreground ${
                  errors.name ? 'border-red-500' : ''
                }`}
                disabled={loading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Visibility */}
            <div className="space-y-4">
              <Label className="text-sidebar-foreground">{t('modal.form.visibility')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all ${
                    formData.visibility === 'personal'
                      ? 'border-primary bg-primary/5'
                      : 'border-sidebar-border hover:border-sidebar-accent'
                  }`}
                  onClick={() => handleFieldChange('visibility', 'personal')}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-base">
                        {t('modal.form.visibilityPersonal')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="text-sm">
                      {t('modal.form.visibilityPersonalDesc')}
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all ${
                    formData.visibility === 'global'
                      ? 'border-primary bg-primary/5'
                      : 'border-sidebar-border hover:border-sidebar-accent'
                  }`}
                  onClick={() => handleFieldChange('visibility', 'global')}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-base">
                        {t('modal.form.visibilityGlobal')}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <CardDescription className="text-sm">
                      {t('modal.form.visibilityGlobalDesc')}
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Actions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-sidebar-foreground">
                  {t('modal.form.actionsTitle')}
                </h3>
                <p className="text-sm text-sidebar-foreground/60">
                  {t('modal.form.actionsSubtitle')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAction}
                disabled={loading}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('modal.form.addAction')}
              </Button>
            </div>

            {errors.actions && <p className="text-sm text-red-500">{errors.actions}</p>}

            <div className="space-y-4">
              {formData.actions.map((action, index) => (
                <MacroActionRow
                  key={index}
                  action={action}
                  index={index}
                  options={formDataOptions}
                  onUpdate={updateAction}
                  onRemove={removeAction}
                  canRemove={formData.actions.length > 1}
                  errors={errors}
                  disabled={loading}
                  optionsLoading={optionsLoading}
                  failedSources={failedSources}
                />
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {t('modal.buttons.cancel')}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#00ffa7] hover:bg-[#00e693] text-black border-0 font-semibold"
          >
            {loading
              ? t('modal.buttons.saving')
              : isEditing
              ? t('modal.buttons.update')
              : t('modal.buttons.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
