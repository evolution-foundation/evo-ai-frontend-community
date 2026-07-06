import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, Globe } from 'lucide-react';

import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';

import { useLanguage } from '@/hooks/useLanguage';
import { type Locale } from '@/i18n/config';
import {
  setupService,
  type BootstrapPayload,
} from '@/services/setup/setupService';
import { clearSetupCache } from '@/contexts/GlobalConfigContext';
import {
  PluginSlot,
  type SetupHostContextValue,
  type SetupCredentials,
} from '@/plugin-host';

import { AppLogo } from '@/components/AppLogo';

type SetupFormData = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

// The wizard shell is community-owned. Phase 2 is plugin-provided (a
// `setup.steps` slot contribution) — the community knows nothing about its
// content; it only advances to it when the server reports extra setup steps.
type Step = 'account' | 'extension';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage, changeLanguage } = useLanguage('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Whether a consumer contributes extra setup steps. When true the wizard
  // advances to the plugin-provided step before finishing; a community-pure
  // install skips straight to bootstrap.
  const [hasExtraSteps, setHasExtraSteps] = useState(false);
  const [step, setStep] = useState<Step>('account');
  const [account, setAccount] = useState<SetupFormData | null>(null);

  useEffect(() => {
    let mounted = true;
    setupService
      .getStatus()
      .then(status => {
        if (mounted) setHasExtraSteps(status.extra_setup_steps === true);
      })
      .catch(() => {
        // Fail soft: if the status probe fails, hide the extra step rather
        // than advancing to a slot that would never render.
        if (mounted) setHasExtraSteps(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setupSchema = useMemo(() => z
    .object({
      first_name: z
        .string()
        .min(1, { message: t('form.firstName.errors.required') })
        .min(2, { message: t('form.firstName.errors.minLength') }),
      last_name: z
        .string()
        .min(1, { message: t('form.lastName.errors.required') })
        .min(2, { message: t('form.lastName.errors.minLength') }),
      email: z
        .string()
        .min(1, { message: t('form.email.errors.required') })
        .email({ message: t('form.email.errors.invalid') }),
      password: z
        .string()
        .min(1, { message: t('form.password.errors.required') })
        .min(8, { message: t('form.password.errors.minLength') })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/, {
          message: t('form.password.errors.complexity'),
        }),
      password_confirmation: z
        .string()
        .min(1, { message: t('form.confirmPassword.errors.required') }),
    })
    .refine(data => data.password === data.password_confirmation, {
      message: t('form.confirmPassword.errors.mismatch'),
      path: ['password_confirmation'],
    }), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  // Runs the actual install. The host owns the single /setup/bootstrap call. A
  // contributed step may supply an opaque `extensionPayload` (merged under
  // `extension_payload`) and a post-bootstrap callback; the community assigns
  // no meaning to either.
  const runBootstrap = async (
    data: SetupFormData,
    extensionPayload?: Record<string, unknown>,
    afterBootstrap?: (c: SetupCredentials) => Promise<void>,
  ) => {
    setIsLoading(true);
    setError('');

    try {
      const payload: BootstrapPayload = { ...data };
      if (extensionPayload && Object.keys(extensionPayload).length > 0) {
        payload.extension_payload = extensionPayload;
      }

      const result = await setupService.bootstrap(payload);

      clearSetupCache();

      if (afterBootstrap) {
        try {
          await afterBootstrap({ email: data.email, password: data.password });
        } catch {
          // Post-bootstrap side effects never block finishing the install.
        }
      }

      toast.success(t('success.title'), {
        description: t('success.description'),
      });

      if (result.survey_token) {
        sessionStorage.setItem('survey_token', result.survey_token);
        navigate('/setup/onboarding', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || t('error.generic');

      if (err?.response?.status === 409) {
        setError(t('error.alreadySetup'));
      } else {
        setError(message);
      }
      // Surface the error on the account step so it is always visible.
      setStep('account');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 submit: advance to the plugin-provided step when the box contributes
  // extra setup steps, otherwise bootstrap immediately (community behavior).
  const onAccountSubmit = (data: SetupFormData) => {
    if (hasExtraSteps) {
      setAccount(data);
      setError('');
      setStep('extension');
    } else {
      runBootstrap(data);
    }
  };

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng as Locale);
  };

  // Generic wizard controls handed to the contributed step. The host exposes no
  // brand-specific knowledge — just loading/error state and the finish/back
  // actions.
  const hostValue: SetupHostContextValue = {
    isLoading,
    error,
    goBack: () => {
      setError('');
      setStep('account');
    },
    submit: (extensionPayload, afterBootstrap) => {
      if (account) runBootstrap(account, extensionPayload, afterBootstrap);
    },
  };

  const languageSelector = (
    <div className="absolute top-4 right-4">
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger>
          <Globe className="h-4 w-4 text-primary" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt-BR">{t('language.portuguese')}</SelectItem>
          <SelectItem value="en">{t('language.english')}</SelectItem>
          <SelectItem value="es">{t('language.spanish')}</SelectItem>
          <SelectItem value="fr">{t('language.french')}</SelectItem>
          <SelectItem value="it">{t('language.italian')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background">
      {languageSelector}

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <AppLogo className="h-10" />
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'account' ? (
            <form onSubmit={handleSubmit(onAccountSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t('form.firstName.label')}</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder={t('form.firstName.placeholder')}
                    disabled={isLoading}
                    {...register('first_name')}
                  />
                  {errors.first_name && (
                    <p className="text-destructive text-sm">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">{t('form.lastName.label')}</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder={t('form.lastName.placeholder')}
                    disabled={isLoading}
                    {...register('last_name')}
                  />
                  {errors.last_name && (
                    <p className="text-destructive text-sm">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('form.email.label')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('form.email.placeholder')}
                  disabled={isLoading}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('form.password.label')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('form.password.placeholder')}
                  disabled={isLoading}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation">{t('form.confirmPassword.label')}</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder={t('form.confirmPassword.placeholder')}
                  disabled={isLoading}
                  {...register('password_confirmation')}
                />
                {errors.password_confirmation && (
                  <p className="text-destructive text-sm">{errors.password_confirmation.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading
                  ? t('form.submit.loading')
                  : hasExtraSteps
                    ? t('form.submit.continue')
                    : t('form.submit.idle')}
              </Button>
            </form>
          ) : (
            <PluginSlot
              id="setup.steps"
              componentProps={{ setupHost: hostValue }}
              // Recovery for the flag/plugin mismatch (server reports extra
              // steps but no contribution is registered — e.g. version skew).
              // Without this the operator lands on a blank card with no way
              // back; the contributed step renders its own controls instead.
              fallback={
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t('extension.unavailable')}</AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={hostValue.goBack}
                  >
                    {t('extension.back')}
                  </Button>
                </div>
              }
            />
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>{t('footer')}</p>
        </div>
      </div>
    </div>
  );
};

export default Setup;
