import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Button, Input } from '@evoapi/design-system';
import { useNavigate } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useLanguage } from '@/hooks/useLanguage';

import { AppLogo } from '@/components/AppLogo';

const ChangePassword = () => {
  const { t } = useLanguage('changePassword');

  const loginSchema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(1, { message: t("changePassword.validation.password.required") })
          .min(8, { message: t("changePassword.validation.password.minLength") }),
        confirmPassword: z
          .string()
          .min(1, { message: t("changePassword.validation.confirmPassword.required") })
          .min(8, { message: t("changePassword.validation.confirmPassword.minLength") }),
      }),
    [t],
  );

  type FormData = z.infer<typeof loginSchema>;

  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const {
    formState: { errors },
    control,
    handleSubmit,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  const onSubmit = (data: FormData) => {
    setIsLoading(true);

    setTimeout(() => {
      console.log('Form data:', data);
      localStorage.setItem('token', 'teste1');
      navigate('/');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background com gradiente */}
      <div
        className="absolute inset-0 z-0 bg-default"
        // style={{
        //   background:
        //     'linear-gradient(to bottom, #fff 40%, #dddddd 60%, #54e0bb 90%, #0ca87c 100%)',
        // }}
      ></div>

      {/* Overlay com padrão de pontos ou grid (opcional) */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_#10b981_1px,_transparent_1px)] bg-[size:24px_24px] z-0"></div>

      {/* Overlay com tom verde sutil */}
      <div className="absolute inset-0 bg-emerald-900/20 z-0"></div>

      {/* Conteúdo */}
      <div className="z-10 flex flex-col items-center justify-center w-full p-2">
        {/* Logo */}
        <div className="mb-4">
          <AppLogo className="h-16" />
        </div>

        {/* Formulário */}
        <div className="w-full max-w-2xl bg-neutral-surface-default rounded-xl border border-neutral-surface-disabled p-8">
          <h1 className="text-3xl font-bold text-center mb-3">{t("changePassword.title")}</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* E-mail */}
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    {t("changePassword.form.password.label")}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t("changePassword.form.password.placeholder")}
                    {...field}
                    disabled={isLoading}
                  />
                </div>
              )}
            />
            {errors.password && (
              <p className="text-danger-foreground-high text-xs">{errors.password.message}</p>
            )}

            {/* Confirmar senha */}
            <div className="pb-4">
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                      {t("changePassword.form.confirmPassword.label")}
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("changePassword.form.confirmPassword.placeholder")}
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                )}
              />
              {errors.confirmPassword && (
                <p className="text-danger-foreground-high text-xs">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Botão de criar conta */}
            <Button
              type="submit"
              disabled={isLoading || !passwordValue || !confirmPasswordValue}
              className="w-full"
              size="lg"
            >
              {isLoading
                ? t("changePassword.form.submit.loading")
                : t("changePassword.form.submit.idle")}
            </Button>
          </form>

          {/* Link para login */}
          <p className="text-sm text-center mt-4">
            <Link to="/login" className="text-primary-interaction-default hover:underline">
              {t("changePassword.links.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
