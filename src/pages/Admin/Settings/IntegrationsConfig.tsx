import { useState, useEffect, useCallback } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Input,
  Label,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, Lock, LockOpen, X, Check, ChevronRight, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';
import { INTEGRATIONS, type IntegrationDef } from './integrationsCatalog';
import FrontendServicesSection from './FrontendServicesSection';

// --- Schema ---

const integrationSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional().nullable(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function isConfigured(data: AdminConfigData, def: IntegrationDef): boolean {
  const id = data[def.clientIdKey];
  return (typeof id === 'string' && id.length > 0) || isSecretMasked(data[def.clientSecretKey]);
}

function buildFormValues(data: AdminConfigData, def: IntegrationDef): IntegrationFormData {
  const secretValue = data[def.clientSecretKey];
  return {
    clientId: (data[def.clientIdKey] as string) ?? '',
    clientSecret: isSecretMasked(secretValue) ? '' : ((secretValue as string) ?? ''),
  };
}

function emptyData(def: IntegrationDef): AdminConfigData {
  return { [def.clientIdKey]: '', [def.clientSecretKey]: null };
}

// Brand accent per integration — drives the monogram tile (no logo assets shipped).
const ACCENT: Record<string, string> = {
  linear: 'bg-indigo-500',
  hubspot: 'bg-orange-500',
  shopify: 'bg-green-600',
  slack: 'bg-purple-600',
  github: 'bg-neutral-800',
  notion: 'bg-neutral-900',
  asana: 'bg-rose-500',
  canva: 'bg-sky-500',
  google_calendar: 'bg-blue-500',
  google_sheets: 'bg-emerald-600',
  monday: 'bg-red-500',
  paypal: 'bg-blue-700',
  atlassian: 'bg-blue-600',
};

function accent(key: string): string {
  return ACCENT[key] ?? 'bg-primary';
}

function monogram(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

// Brand logo (simple-icons via BrandIcon) with a monogram-tile fallback for any
// integration that has no glyph in the brand set.
function IntegrationLogo({ integrationKey, title }: { integrationKey: string; title: string }) {
  const box = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg';
  if (getBrandIcon(integrationKey)) {
    return (
      <span className={`${box} bg-muted`} aria-hidden="true">
        <BrandIcon id={integrationKey} size={22} />
      </span>
    );
  }
  return (
    <span className={`${box} text-sm font-semibold text-white ${accent(integrationKey)}`} aria-hidden="true">
      {monogram(title)}
    </span>
  );
}

// --- SecretField subcomponent ---

interface SecretFieldProps {
  label: string;
  placeholder: string;
  register: UseFormRegister<IntegrationFormData>;
  secretModified: boolean;
  onSecretModifiedChange: (modified: boolean) => void;
  secretConfigured: boolean;
  onClear: () => void;
  sectionKey: string;
  t: (key: string) => string;
}

function SecretField({
  label,
  placeholder,
  register,
  secretModified,
  onSecretModifiedChange,
  secretConfigured,
  onClear,
  sectionKey,
  t,
}: SecretFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${sectionKey}-clientSecret`}>{label}</Label>
        {!secretModified && (
          secretConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Lock className="h-3 w-3" />
              {t('integrations.secretConfigured')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
              <LockOpen className="h-3 w-3" />
              {t('integrations.secretNotConfigured')}
            </span>
          )
        )}
      </div>
      <div className="relative">
        <Input
          id={`${sectionKey}-clientSecret`}
          type="password"
          // new-password (not "off"): Chrome ignores "off" on password inputs and
          // fills saved credentials anyway. See the decoy pair in the form too.
          autoComplete="new-password"
          placeholder={placeholder}
          {...register('clientSecret', {
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              onSecretModifiedChange(e.target.value.length > 0),
          })}
        />
        {secretConfigured && !secretModified && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground"
            title={t('integrations.clearSecret')}
            aria-label={t('integrations.clearSecret')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// --- Configure dialog (mounted only for the open integration) ---

interface IntegrationDialogProps {
  def: IntegrationDef;
  initialData: AdminConfigData;
  onClose: () => void;
  onSaved: (updated: AdminConfigData) => void;
  t: (key: string) => string;
}

function IntegrationDialogContent({ def, initialData, onClose, onSaved, t }: IntegrationDialogProps) {
  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: buildFormValues(initialData, def),
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [secretModified, setSecretModified] = useState(false);
  const secretConfigured = isSecretMasked(initialData[def.clientSecretKey]);
  const configured = isConfigured(initialData, def);
  const title = t(`integrations.${def.key}.cardTitle`);

  const onSave = async (formData: IntegrationFormData) => {
    setSaving(true);
    try {
      const payload: AdminConfigData = { [def.clientIdKey]: formData.clientId ?? '' };
      payload[def.clientSecretKey] =
        !secretModified || formData.clientSecret === '' ? null : formData.clientSecret;

      const data = await adminConfigService.saveConfig(def.configType, payload);
      onSaved(data);
      toast.success(t(`integrations.${def.key}.saveSuccess`));
      onClose();
    } catch (error) {
      toast.error(t(`integrations.${def.key}.saveError`), {
        description: extractError(error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setRemoving(true);
    try {
      await adminConfigService.clearConfig(def.configType);
      onSaved(emptyData(def));
      toast.success(t('integrations.removeSuccess'));
      onClose();
    } catch (error) {
      toast.error(t('integrations.removeError'), { description: extractError(error).message });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <IntegrationLogo integrationKey={def.key} title={title} />
          <div className="space-y-1 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t('integrations.dialogSubtitle')}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form
        data-testid={`${def.key}-form`}
        onSubmit={form.handleSubmit(onSave)}
        autoComplete="off"
        className="space-y-5"
      >
        {/* Decoy credential pair: absorbs the browser's autofill so the real
            Client ID / Secret fields are left untouched. Off-screen, not focusable. */}
        <input type="text" name="_decoy_user" autoComplete="username" tabIndex={-1} aria-hidden="true" className="absolute h-0 w-0 opacity-0" />
        <input type="password" name="_decoy_pass" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="absolute h-0 w-0 opacity-0" />

        <div className="space-y-2">
          <Label htmlFor={`${def.key}-clientId`}>{t(`integrations.${def.key}.fields.clientId`)}</Label>
          <Input
            id={`${def.key}-clientId`}
            autoComplete="off"
            placeholder={t(`integrations.${def.key}.placeholders.clientId`)}
            {...form.register('clientId')}
          />
        </div>

        <SecretField
          label={t(`integrations.${def.key}.fields.clientSecret`)}
          placeholder={t(`integrations.${def.key}.placeholders.clientSecret`)}
          register={form.register}
          secretModified={secretModified}
          onSecretModifiedChange={setSecretModified}
          secretConfigured={secretConfigured}
          onClear={() => {
            form.setValue('clientSecret', '');
            setSecretModified(true);
          }}
          sectionKey={def.key}
          t={t}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          {configured ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              disabled={removing || saving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {removing ? t('integrations.removing') : t('integrations.remove')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving || removing}>
              {t('integrations.cancel')}
            </Button>
            <Button type="submit" disabled={saving || removing}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? t('integrations.saving') : t('integrations.save')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// --- Main component ---

export default function IntegrationsConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, AdminConfigData>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        INTEGRATIONS.map((def) => adminConfigService.getConfig(def.configType)),
      );
      const next: Record<string, AdminConfigData> = {};
      INTEGRATIONS.forEach((def, i) => {
        next[def.key] = results[i];
      });
      setConfigs(next);
    } catch {
      toast.error(t('integrations.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeDef = activeKey ? INTEGRATIONS.find((d) => d.key === activeKey) ?? null : null;
  const activeData = activeDef ? configs[activeDef.key] : undefined;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-sidebar-foreground">{t('integrations.title')}</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{t('integrations.description')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((def) => {
          const data = configs[def.key];
          if (!data) return null;
          const configured = isConfigured(data, def);
          const title = t(`integrations.${def.key}.cardTitle`);
          return (
            <button
              key={def.key}
              type="button"
              data-testid={`${def.key}-card`}
              onClick={() => setActiveKey(def.key)}
              className="group flex items-center gap-3 rounded-lg border border-sidebar-border bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-sm"
            >
              <IntegrationLogo integrationKey={def.key} title={title} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-foreground">{title}</span>
                {configured ? (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    {t('integrations.statusConfigured')}
                  </span>
                ) : (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-sidebar-foreground/50">
                    {t('integrations.statusNotConfigured')}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/30 transition group-hover:text-sidebar-foreground/60" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!activeDef} onOpenChange={(open) => { if (!open) setActiveKey(null); }}>
        {activeDef && activeData && (
          <IntegrationDialogContent
            key={activeDef.key}
            def={activeDef}
            initialData={activeData}
            onClose={() => setActiveKey(null)}
            onSaved={(updated) => setConfigs((prev) => ({ ...prev, [activeDef.key]: updated }))}
            t={t}
          />
        )}
      </Dialog>

      {/* Non-OAuth front-end service keys (reCAPTCHA, Clarity) — own section, not
          part of the OAuth catalog above. Self-loads its own config. */}
      <div className="mt-8">
        <FrontendServicesSection />
      </div>
    </div>
  );
}
