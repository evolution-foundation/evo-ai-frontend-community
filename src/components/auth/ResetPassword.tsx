import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@evoapi/design-system';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '@/services/auth/authService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppLogo } from '@/components/AppLogo';

const resetPasswordSchema = (t: any) => z
  .object({
    password: z
      .string()
      .min(8, t('auth.errors.password.minLength'))
      .max(128, t('auth.errors.password.maxLength'))
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/,
        t('auth.errors.password.pattern')
      ),
    password_confirmation: z.string().min(1, t('auth.errors.confirmPassword.required')),
  })
  .refine(data => data.password === data.password_confirmation, {
    message: t('auth.errors.confirmPassword.mismatch'),
    path: ['password_confirmation'],
  });

type ResetPasswordFormData = {
  password: string;
  password_confirmation: string;
};

const ResetPassword = () => {
  const { t } = useLanguage('auth');
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const [resetToken] = useState(() => searchParams.get('reset_password_token'));
  const [isInvite] = useState(() => searchParams.get('purpose') === 'invite');
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema(t)),
    defaultValues: {
      password: '',
      password_confirmation: '',
    },
  });

  useEffect(() => {
    if (!resetToken) {
      setError(t('auth.resetPassword.tokenNotFound'));
    }
  }, [resetToken, t]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!resetToken) {
      setError(t('auth.resetPassword.tokenNotFound'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword({
        reset_password_token: resetToken,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });

      toast.success(t(isInvite ? 'invitation.success' : 'auth.resetPassword.success'));
      window.location.assign('/login');
    } catch (error: any) {
      const apiError = error?.response?.data?.error;
      const detailMessages = Array.isArray(apiError?.details)
        ? apiError.details
            .map((detail: { message?: string }) => detail?.message)
            .filter(Boolean)
        : [];
      const errorMessage =
        detailMessages.join(', ') ||
        apiError?.message ||
        error?.response?.data?.message ||
        t('auth.resetPassword.error');
      const safeMessage = isInvite ? t('invitation.invalid') : errorMessage;
      setError(safeMessage);
      toast.error(safeMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background relative">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <AppLogo className="h-10 mx-auto" />
          </div>

          <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold">{t('auth.resetPassword.tokenInvalid.title')}</h2>
              <p className="text-muted-foreground mt-2">
                {t(isInvite ? 'invitation.invalid' : 'auth.resetPassword.tokenInvalid.description')}
              </p>
            </div>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {t('auth.resetPassword.tokenInvalid.alert')}
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => window.location.assign('/login')}
                className="w-full"
              >
                {t('auth.resetPassword.tokenInvalid.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background relative">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <AppLogo className="h-10 mx-auto" />
        </div>

        {/* Form */}
        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">
              {t(isInvite ? 'invitation.title' : 'auth.resetPassword.title')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('auth.resetPassword.subtitle')}
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.resetPassword.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.resetPassword.passwordPlaceholder')}
                  disabled={isLoading}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">{t('auth.resetPassword.confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('auth.resetPassword.confirmPlaceholder')}
                  disabled={isLoading}
                  {...form.register('password_confirmation')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password_confirmation && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.password_confirmation.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? t('auth.resetPassword.resetting') : t(isInvite ? 'invitation.save' : 'auth.resetPassword.button')}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => window.location.assign('/login')}
                className="text-sm"
              >
                {t('auth.resetPassword.backToLogin')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
