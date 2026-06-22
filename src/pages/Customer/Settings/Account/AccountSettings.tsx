import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { type Locale } from '@/i18n/config';
import {
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Switch,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCurrentUser } from '@/utils/auth';
import { isAdminRole } from '@/constants/roles';
import BaseHeader from '@/components/base/BaseHeader';
import { accountService } from '@/services/account/accountService';
import { useAppDataStore } from '@/store/appDataStore';
import type { Account, FormDataOptions } from '@/types/settings';
import { Copy } from 'lucide-react';

import { SettingsTour } from '@/tours';

// Componente para seção
interface SectionLayoutProps {
  title: string;
  description: string;
  withBorder?: boolean;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

function SectionLayout({
  title,
  description,
  withBorder = false,
  children,
  headerActions,
}: SectionLayoutProps) {
  return (
    <section className={`pt-8 ${withBorder ? 'border-t border-sidebar-border' : ''} pb-8`}>
      <div className="grid grid-cols-4 gap-5 mb-5">
        <div className="col-span-3">
          <h4 className="text-lg font-medium text-sidebar-foreground mb-2">{title}</h4>
          <p className="text-sidebar-foreground/70 text-sm">{description}</p>
        </div>
        <div className="col-span-1 flex justify-end">{headerActions}</div>
      </div>
      <div className="text-sidebar-foreground">{children}</div>
    </section>
  );
}

export default function AccountSettings() {
  const { t, changeLanguage } = useLanguage('accountSettings');
  const { can, isReady: permissionsReady } = useUserPermissions();
  const currentUser = useCurrentUser();
  const isAdmin = !!currentUser?.role?.key && isAdminRole(currentUser.role.key);
  const normalizeAccountLocale = (locale?: string | null): string => {
    if (!locale) return 'pt-BR';
    const normalized = locale.replace('_', '-');
    if (normalized.toLowerCase() === 'pt-br') return 'pt-BR';
    return normalized;
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    locale: 'pt-BR',
    domain: '',
    supportEmail: '',
    autoResolveAfter: 0,
    autoResolveMessage: '',
    autoResolveIgnoreWaiting: false,
    autoResolveLabel: 'none',
    audioTranscriptions: false,
    autoResolveEnabled: false,
    maskContactPii: false,
  });
  const [formDataOptions, setFormDataOptions] = useState<FormDataOptions>({
    inboxes: [],
    agents: [],
    teams: [],
    labels: [],
  });
  const [globalConfig, setGlobalConfig] = useState<{
    gitSha?: string;
    appVersion?: string;
    isOnEvolutionCloud?: boolean;
  }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Linguagens disponíveis - baseado no LANGUAGES_CONFIG do Evolution
  // Apenas idiomas com enabled: true e que estão em SUPPORTED_LOCALES
  const languages = [
    { code: 'en', name: 'English (en)' },
    { code: 'fr', name: 'Français (fr)' },
    { code: 'it', name: 'Italiano (it)' },
    { code: 'es', name: 'Español (es)' },
    { code: 'pt', name: 'Português (pt)' },
    { code: 'pt-BR', name: 'Português Brasileiro (pt-BR)' },
  ];

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadAccountData();
  }, [permissionsReady]);

  const loadAccountData = async () => {
    if (!can('accounts', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }
    try {
      setLoading(true);
      const [accountData, formDataRes, configRes] = await Promise.all([
        accountService.getAccount(),
        accountService.getFormData(),
        accountService.getGlobalConfig(),
      ]);

      setAccount(accountData);
      setFormDataOptions(formDataRes);
      setGlobalConfig(configRes);

      // Inicializar o form com dados da conta
      const settings = accountData.settings || {};
      setFormData({
        name: accountData.name || '',
        locale: normalizeAccountLocale(accountData.locale || 'pt-BR'),
        domain: accountData.domain || '',
        supportEmail: accountData.support_email || '',
        autoResolveAfter: settings.auto_resolve_after || 0,
        autoResolveMessage: settings.auto_resolve_message || '',
        autoResolveIgnoreWaiting: settings.auto_resolve_ignore_waiting || false,
        autoResolveLabel: settings.auto_resolve_label || 'none',
        audioTranscriptions: settings.audio_transcriptions || false,
        autoResolveEnabled: !!settings.auto_resolve_after,
        maskContactPii: settings.mask_contact_pii || false,
      });
    } catch (error) {
      console.error('Erro ao carregar dados da conta:', error);
      toast.error(t('messages.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired');
    }

    if (!formData.locale) {
      newErrors.locale = t('validation.localeRequired');
    }

    if (formData.autoResolveEnabled && formData.autoResolveAfter < 10) {
      newErrors.autoResolveAfter = t('validation.minAutoResolveTime');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('accounts', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    try {
      const normalizedLocale = normalizeAccountLocale(formData.locale);
      await accountService.updateAccount({
        name: formData.name,
        locale: normalizedLocale,
        domain: formData.domain,
        support_email: formData.supportEmail,
      });

      changeLanguage(normalizedLocale as Locale);

      toast.success(t('messages.success.generalUpdated'));
      await loadAccountData(); // Recarregar dados
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      toast.error((error as Error).message || t('messages.error.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAutoResolveSubmit = async () => {
    if (!formData.autoResolveEnabled) {
      // Desabilitar auto-resolve
      try {
        setSaving(true);
        await accountService.updateAccount({
          auto_resolve_after: null,
          auto_resolve_message: '',
          auto_resolve_ignore_waiting: false,
          auto_resolve_label: null,
        });
        toast.success(t('messages.success.autoResolveDisabled'));
        await loadAccountData();
      } catch (error: unknown) {
        toast.error((error as Error).message || t('messages.error.autoResolveDisableFailed'));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (formData.autoResolveAfter < 10) {
      toast.error(t('messages.error.minTime'));
      return;
    }

    try {
      setSaving(true);
      await accountService.updateAccount({
        auto_resolve_after: formData.autoResolveAfter,
        auto_resolve_message: formData.autoResolveMessage,
        auto_resolve_ignore_waiting: formData.autoResolveIgnoreWaiting,
        auto_resolve_label: formData.autoResolveLabel === 'none' ? null : formData.autoResolveLabel,
      });
      toast.success(t('messages.success.autoResolveUpdated'));
      await loadAccountData();
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.autoResolveSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAudioTranscriptionToggle = async (enabled: boolean) => {
    try {
      const updated = await accountService.updateAccount({
        settings: {
          ...(account?.settings ?? {}),
          audio_transcriptions: enabled,
        },
      });
      setAccount(updated);
      setFormData(prev => ({ ...prev, audioTranscriptions: enabled }));
      try {
        await useAppDataStore.getState().fetchAccount(true);
      } catch (cacheError) {
        console.warn('Failed to refresh appDataStore.account cache:', cacheError);
      }
      toast.success(
        enabled
          ? t('messages.success.audioTranscriptionEnabled')
          : t('messages.success.audioTranscriptionDisabled'),
      );
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.audioTranscriptionFailed'));
    }
  };

  const handleMaskContactPiiToggle = async (enabled: boolean) => {
    try {
      const updated = await accountService.updateAccount({
        settings: {
          ...(account?.settings ?? {}),
          mask_contact_pii: enabled,
        },
      });
      setAccount(updated);
      setFormData(prev => ({ ...prev, maskContactPii: enabled }));
      try {
        await useAppDataStore.getState().fetchAccount(true);
      } catch (cacheError) {
        console.warn('Failed to refresh appDataStore.account cache:', cacheError);
      }
      toast.success(
        enabled
          ? t('messages.success.maskPiiEnabled')
          : t('messages.success.maskPiiDisabled'),
      );
    } catch (error: unknown) {
      toast.error((error as Error).message || t('messages.error.maskPiiFailed'));
    }
  };

  const copyAccountId = () => {
    if (account?.id) {
      navigator.clipboard.writeText(account.id.toString());
      toast.success(t('messages.success.accountIdCopied'));
    }
  };

  const isOnEvolutionCloud = globalConfig.isOnEvolutionCloud;


  if (loading) {
    return (
      <div className="h-full flex flex-col p-4">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sidebar-foreground/60">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <SettingsTour />
      <div data-tour="settings-header">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl w-full mx-auto">
          {/* Configurações Gerais */}
          <div data-tour="settings-general">
          <SectionLayout
            title={t('sections.general.title')}
            description={t('sections.general.description')}
          >
            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('fields.name.label')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  placeholder={t('fields.name.placeholder')}
                  className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  disabled={saving}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locale">{t('fields.locale.label')}</Label>
                <Select
                  value={formData.locale}
                  onValueChange={value => handleFieldChange('locale', value)}
                >
                  <SelectTrigger
                    className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                      errors.locale ? 'border-red-500' : ''
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locale && <p className="text-sm text-red-500">{errors.locale}</p>}
              </div>

              {account?.features?.custom_reply_domain && (
                <div className="space-y-2">
                  <Label htmlFor="domain">{t('fields.domain.label')}</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={e => handleFieldChange('domain', e.target.value)}
                    placeholder={t('fields.domain.placeholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                    disabled={saving}
                  />
                  <p className="text-xs text-sidebar-foreground/60">
                    {t('fields.domain.description')}
                  </p>
                </div>
              )}

              {account?.features?.custom_reply_email && (
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">{t('fields.supportEmail.label')}</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={formData.supportEmail}
                    onChange={e => handleFieldChange('supportEmail', e.target.value)}
                    placeholder={t('fields.supportEmail.placeholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                    disabled={saving}
                  />
                </div>
              )}

              <div>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold">
                  {saving ? t('buttons.saving') : t('buttons.save')}
                </Button>
              </div>
            </form>
          </SectionLayout>
          </div>

          {/* Auto-Resolução */}
          <div data-tour="settings-auto-resolve">
          <SectionLayout
            title={t('sections.autoResolve.title')}
            description={t('sections.autoResolve.description')}
            withBorder
            headerActions={
              <Switch
                checked={formData.autoResolveEnabled}
                onCheckedChange={checked => {
                  handleFieldChange('autoResolveEnabled', checked);
                  if (!checked) {
                    handleAutoResolveSubmit();
                  }
                }}
              />
            }
          >
            {formData.autoResolveEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('fields.autoResolveTime.label')}</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="10"
                      max="1438560"
                      value={formData.autoResolveAfter}
                      onChange={e =>
                        handleFieldChange('autoResolveAfter', parseInt(e.target.value) || 0)
                      }
                      className={`w-32 bg-sidebar border-sidebar-border text-sidebar-foreground ${
                        errors.autoResolveAfter ? 'border-red-500' : ''
                      }`}
                    />
                    <span className="text-sm text-sidebar-foreground/60">
                      {t('fields.autoResolveTime.unit')}
                    </span>
                  </div>
                  {errors.autoResolveAfter && (
                    <p className="text-sm text-red-500">{errors.autoResolveAfter}</p>
                  )}
                  <p className="text-xs text-sidebar-foreground/60">
                    {t('fields.autoResolveTime.description')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('fields.autoResolveMessage.label')}</Label>
                  <Textarea
                    value={formData.autoResolveMessage}
                    onChange={e => handleFieldChange('autoResolveMessage', e.target.value)}
                    placeholder={t('fields.autoResolveMessage.placeholder')}
                    className="bg-sidebar border-sidebar-border text-sidebar-foreground"
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <div className="bg-sidebar-accent/30 border border-sidebar-border rounded-lg divide-y divide-sidebar-border">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-sm">{t('fields.ignoreWaiting.label')}</span>
                      <Switch
                        checked={formData.autoResolveIgnoreWaiting}
                        onCheckedChange={checked =>
                          handleFieldChange('autoResolveIgnoreWaiting', checked)
                        }
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-sm">{t('fields.applyLabel.label')}</span>
                      <Select
                        value={formData.autoResolveLabel}
                        onValueChange={value => handleFieldChange('autoResolveLabel', value)}
                      >
                        <SelectTrigger className="w-40 bg-sidebar border-sidebar-border text-sidebar-foreground">
                          <SelectValue placeholder={t('fields.applyLabel.placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('fields.applyLabel.none')}</SelectItem>
                          {formDataOptions.labels.map((label: any) => (
                            <SelectItem key={label.title} value={label.title}>
                              {label.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={handleAutoResolveSubmit}
                    disabled={saving}
                    className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold"
                  >
                    {saving ? t('buttons.saving') : t('buttons.updateAutoResolve')}
                  </Button>
                </div>
              </div>
            )}
          </SectionLayout>
          </div>

          {/* Transcrição de Áudio */}
          {isOnEvolutionCloud && (
            <SectionLayout
              title={t('sections.audioTranscription.title')}
              description={t('sections.audioTranscription.description')}
              withBorder
              headerActions={
                <Switch
                  checked={formData.audioTranscriptions}
                  onCheckedChange={handleAudioTranscriptionToggle}
                />
              }
            >
              <></>
            </SectionLayout>
          )}

          {/* Mascaramento de PII dos Contatos — admin tiers only (super_admin / account_owner / administrator). */}
          {isAdmin && (
            <SectionLayout
              title={t('sections.maskContactPii.title')}
              description={t('sections.maskContactPii.description')}
              withBorder
              headerActions={
                <Switch
                  checked={formData.maskContactPii}
                  onCheckedChange={handleMaskContactPiiToggle}
                />
              }
            >
              <></>
            </SectionLayout>
          )}

          {/* ID da Conta */}
          <div data-tour="settings-account-id">
          <SectionLayout
            title={t('sections.accountId.title')}
            description={t('sections.accountId.description')}
            withBorder
          >
            <div className="flex items-center gap-2 p-3 bg-sidebar-accent/30 border border-sidebar-border rounded-lg font-mono text-sm">
              <span className="text-sidebar-foreground">{account?.id}</span>
              <Button size="sm" variant="ghost" onClick={copyAccountId} className="ml-auto">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </SectionLayout>
          </div>

          {/* Informações de Build */}
          <div className="text-center py-4 text-sm text-sidebar-foreground/60 border-t border-sidebar-border">
            <div className="flex items-center justify-center gap-4">
              <span>v{globalConfig.appVersion || '1.0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
