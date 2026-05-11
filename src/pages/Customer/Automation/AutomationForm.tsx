import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Textarea,
  Switch,
} from '@evoapi/design-system';
import { ArrowLeft } from 'lucide-react';
import { automationService } from '@/services/automation/automationService';
import {
  automationRuleSchema,
  type AutomationRuleFormData,
} from '@/pages/Customer/Automation/registries';
import {
  EventSelector,
  ConditionsBuilder,
  ActionsBuilder,
} from '@/components/automation';
import { useAutomationFormData } from '@/hooks/automation/useAutomationFormData';

const DEFAULTS: AutomationRuleFormData = {
  name: '',
  description: '',
  event_name: 'conversation_created',
  active: true,
  mode: 'simple',
  conditions: [],
  actions: [{ action_name: 'send_message', action_params: [''] }],
};

interface Props {
  mode: 'create' | 'edit';
}

export default function AutomationForm({ mode }: Props) {
  const { t } = useLanguage('automation');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: formData, isLoading: formDataLoading } = useAutomationFormData();

  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');

  const methods = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: DEFAULTS,
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await automationService.getAutomation(id);
        const rule = (response as unknown as { data?: AutomationRuleFormData }).data;
        if (!cancelled && rule) {
          reset({
            name: rule.name,
            description: rule.description ?? '',
            event_name: rule.event_name,
            active: rule.active ?? true,
            mode: 'simple',
            conditions: rule.conditions ?? [],
            actions: rule.actions ?? DEFAULTS.actions,
          });
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const i18nKey = status === 404 ? 'messages.ruleNotFound' : 'messages.loadError';
        console.error('Error loading automation:', error);
        toast.error(t(i18nKey));
        navigate('/automation');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id, navigate, reset, t]);

  const onSubmit = handleSubmit(async (data) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Cast: AutomationCondition.values is typed as string[] | number[] (homogeneous)
      // but the Zod schema produces (string | number)[]. Backend accepts mixed; the
      // type cleanup is deferred per Story 1 audit findings.
      const payload = data as unknown as Parameters<typeof automationService.createAutomation>[0];
      if (mode === 'create') {
        await automationService.createAutomation(payload);
        toast.success(t('messages.createSuccess'));
      } else if (id) {
        await automationService.updateAutomation(id, { ...payload, id });
        toast.success(t('messages.updateSuccess'));
      }
      navigate('/automation');
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error(
        mode === 'create' ? t('messages.createError') : t('messages.updateError'),
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (loadingExisting || formDataLoading) {
    return <div className="p-4 text-muted-foreground">{t('page.loading')}</div>;
  }

  return (
    <FormProvider {...methods}>
    <div className="h-full flex flex-col p-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/automation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">
          {mode === 'create' ? t('form.title.create') : t('form.title.edit')}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 flex-1">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            {t('form.fields.name')} *
          </label>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                id="name"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('form.fields.namePlaceholder')}
                disabled={submitting}
              />
            )}
          />
          {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="description">
            {t('form.fields.description')}
          </label>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Textarea
                id="description"
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('form.fields.descriptionPlaceholder')}
                rows={2}
                disabled={submitting}
              />
            )}
          />
        </div>

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={submitting}
              />
              <label className="text-sm font-medium">{t('form.fields.active')}</label>
            </div>
          )}
        />

        <EventSelector control={control} disabled={submitting} />
        <p className="text-xs text-muted-foreground">{t('form.fields.event.hint')}</p>

        <ConditionsBuilder control={control} formData={formData} />

        <ActionsBuilder control={control} formData={formData} />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/automation')}
            disabled={submitting}
          >
            {t('form.buttons.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t('form.buttons.saving')
              : mode === 'create'
                ? t('form.buttons.create')
                : t('form.buttons.update')}
          </Button>
        </div>
      </form>
    </div>
    </FormProvider>
  );
}
