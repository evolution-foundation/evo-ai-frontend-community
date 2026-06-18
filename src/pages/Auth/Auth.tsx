import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertTitle,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { login, register, forgotPassword } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useLanguage } from '@/hooks/useLanguage';
import MfaVerification from '@/components/auth/MfaVerification';
import { twoFactorService } from '@/services/profile/twoFactorService';
import { isKeycloakEnabled, buildKeycloakAuthUrl } from '@/services/auth/keycloakService';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Globe } from 'lucide-react';

import { ApiError } from '@/types/auth';
import { type Locale } from '@/i18n/config';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

import { AppLogo } from '@/components/AppLogo';

export const Auth: React.FC = () => {
  const { login: authLogin, mfaState, verifyMfaCode, clearMfaState, setMfaRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { executeRecaptcha } = useRecaptcha({
    autoLoad: false,
  });

  const { t, currentLanguage, changeLanguage } = useLanguage('auth');
  const globalConfig = useGlobalConfig();

  // Verificar se signup está habilitado (padrão: false se não especificado)
  // Signup só é habilitado se explicitamente configurado como true
  const enableAccountSignup = globalConfig.enableAccountSignup === true;

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [isKeycloakLoading, setIsKeycloakLoading] = useState(false);

  // Ref para controlar se o toast de sessão expirada já foi mostrado
  const sessionExpiredToastShown = useRef(false);

  const handleKeycloakLogin = async () => {
    setIsKeycloakLoading(true);
    const redirectUri = `${window.location.origin}/keycloak/callback`;
    const url = await buildKeycloakAuthUrl(redirectUri);
    window.location.href = url;
  }
  // Se signup estiver desabilitado e activeTab for 'register', mudar para 'login'
  useEffect(() => {
    if (!enableAccountSignup && activeTab === 'register') {
      setActiveTab('login');
    }
  }, [enableAccountSignup, activeTab]);

  // Detectar se a sessão expirou e mostrar notificação
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    // Session expired notification
    if (urlParams.get('session_expired') === 'true' && !sessionExpiredToastShown.current) {
      sessionExpiredToastShown.current = true;

      toast.error(t('auth.sessionExpired.title'), {
        description: t('auth.sessionExpired.description'),
      });

      // Limpar o parâmetro da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Registration confirmation success
    if (urlParams.get('confirmation_success') === 'true') {
      toast.success(t('auth.register.confirmationSuccess'), {
        description: t('auth.register.confirmationSuccessDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle access denied error
    if (urlParams.get('error') === 'access-denied') {
      toast.error(t('auth.errors.accessDenied'), {
        description: t('auth.errors.accessDeniedDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle confirmation error
    if (urlParams.get('confirmation_error') === 'true') {
      toast.error(t('auth.errors.confirmationError'), {
        description: t('auth.errors.confirmationErrorDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, t]);

  // Schema de validação para login
  const loginSchema = z.object({
    email: z
      .string()
      .min(1, { message: t('auth.errors.email.required') })
      .email({ message: t('auth.errors.email.invalid') }),
    password: z
      .string()
      .min(1, { message: t('auth.errors.password.required') })
      .min(8, { message: t('auth.errors.password.minLength') }),
  });

  // Schema de validação para cadastro
  const registerSchema = z
    .object({
      fullName: z
        .string()
        .min(1, { message: t('auth.errors.fullName.required') })
        .min(2, { message: t('auth.errors.fullName.minLength') }),
      email: z
        .string()
        .min(1, { message: t('auth.errors.email.required') })
        .email({ message: t('auth.errors.email.invalid') }),
      password: z
        .string()
        .min(1, { message: t('auth.errors.password.required') })
        .min(8, { message: t('auth.errors.password.minLength') })
        .max(128, { message: t('auth.errors.password.maxLength') })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/, {
          message: t('auth.errors.password.pattern'),
        }),
      confirmPassword: z.string().min(1, { message: t('auth.errors.confirmPassword.required') }),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: t('auth.errors.confirmPassword.mismatch'),
      path: ['confirmPassword'],
    });

  // Schema de validação para esqueci minha senha
  const forgotPasswordSchema = z.object({
    email: z
      .string()
      .min(1, { message: t('auth.errors.email.required') })
      .email({ message: t('auth.errors.email.invalid') }),
  });

  type LoginFormData = z.infer<typeof loginSchema>;
  type RegisterFormData = z.infer<typeof registerSchema>;
  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  // Formulário de login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Formulário de cadastro
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Formulário de esqueci minha senha
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError('');

    try {
      // Get reCAPTCHA token before login
      const recaptchaToken = await executeRecaptcha('login');

      const result = await login({
        email: data.email,
        password: data.password,
        recaptcha_token: recaptchaToken || undefined,
      });

      // Check if MFA is required
      if (result.requiresMfa && result.mfaData) {
        const mfaData = result.mfaData as {
          method: 'totp' | 'email';
          tempToken: string;
          email: string;
        };
        setMfaRequired({
          required: true,
          method: mfaData.method,
          tempToken: mfaData.tempToken,
          email: mfaData.email,
        });
        return;
      }
      
      // Normal login without MFA
      await authLogin(result.response.data.user, { access_token: result.response.data.token?.access_token || result.response.data.token?.token?.access_token });

      const { validityCheck } = useAuthStore.getState();
      await validityCheck();

      // Verificar se há returnUrl nos parâmetros de query
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl');

      if (returnUrl) {
        // Redirecionar de volta para o OAuth flow
        window.location.href = returnUrl;
      } else {
        // Navegar para a rota raiz, que será redirecionada pelo SmartRedirect
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.detail ||
        t('auth.notifications.loginError');

      // Toast de erro para credenciais inválidas
      toast.error(t('auth.login.invalidCredentials'), {
        description: errorMessage,
      });

      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setRegisterError('');

    try {
      // Get reCAPTCHA token before registration
      const recaptchaToken = await executeRecaptcha('register');

      await register({
        email: data.email,
        password: data.password,
        password_confirmation: data.confirmPassword,
        name: data.fullName,
        recaptcha_token: recaptchaToken || undefined,
      });

      toast.success(t('auth.register.registrationSuccessful'));
      setActiveTab('login');
    } catch (error) {
      console.error('Erro ao fazer cadastro:', error);
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.detail ||
        t('auth.notifications.registerError');

      // Toast de erro para cadastro
      toast.error(t('auth.notifications.registerError'), {
        description: errorMessage,
      });

      setRegisterError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setForgotPasswordError('');

    try {
      // Get reCAPTCHA token before forgot password request
      const recaptchaToken = await executeRecaptcha('forgot_password');

      await forgotPassword({
        email: data.email,
        recaptcha_token: recaptchaToken || undefined,
      });

      toast.success(t('auth.forgotPassword.emailSent'));
      setActiveTab('login');
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      const apiError = error as ApiError & {
        response?: {
          status?: number;
          data?: {
            error?: string;
            message?: string;
            detail?: string;
            code?: string;
          };
        };
      };

      const isServiceError =
        apiError?.response?.status === 503 ||
        apiError?.response?.data?.code === 'email_delivery_failed';

      const errorMessage =
        apiError?.response?.data?.error ||
        apiError?.response?.data?.message ||
        apiError?.response?.data?.detail ||
        t('auth.notifications.forgotPasswordError');

      toast.error(
        isServiceError
          ? t('auth.forgotPassword.serviceUnavailable')
          : t('auth.notifications.forgotPasswordError'),
        {
          description: errorMessage,
        },
      );

      setForgotPasswordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    // Não permitir mudar para 'register' se signup estiver desabilitado
    if (value === 'register' && !enableAccountSignup) {
      return;
    }
    setActiveTab(value as 'login' | 'register' | 'forgot');
  };

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng as Locale);
  };

  const handleMfaVerification = async (code: string) => {
    await verifyMfaCode(code);

    // Verificar se há returnUrl nos parâmetros de query
    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get('returnUrl');

    if (returnUrl) {
      // Redirecionar de volta para o OAuth flow
      window.location.href = returnUrl;
    } else {
      // Redirecionar para / por padrão
      navigate('/', { replace: true });
    }
  };

  const handleMfaResendEmailCode = async () => {
    if (mfaState?.method === 'email') {
      await twoFactorService.sendEmailCode();
    }
  };

  const handleMfaBack = () => {
    clearMfaState();
    setIsLoading(false);
  };

  // Show MFA verification if required
  if (mfaState?.required) {
    return (
      <>
        <MfaVerification
          email={mfaState.email}
          method={mfaState.method}
          tempToken={mfaState.tempToken}
          onVerificationSuccess={handleMfaVerification}
          onResendEmailCode={mfaState.method === 'email' ? handleMfaResendEmailCode : undefined}
          onBack={handleMfaBack}
          isLoading={isLoading}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-t from-primary/20 via-background/95 to-background relative">
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Seletor de idiomas no canto superior direito */}
        <div className="absolute top-4 right-4 z-10">
          <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <Globe className="h-4 w-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">{t('language.selector.portuguese')}</SelectItem>
              <SelectItem value="en">{t('language.selector.english')}</SelectItem>
              <SelectItem value="es">{t('language.selector.spanish')}</SelectItem>
              <SelectItem value="fr">{t('language.selector.french')}</SelectItem>
              <SelectItem value="it">{t('language.selector.italian')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <AppLogo className="h-10 mx-auto" />
          </div>

          {/* Formulário */}
          <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className={`grid w-full ${enableAccountSignup ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="login">{t('auth.tabs.login')}</TabsTrigger>
                {enableAccountSignup && (
                  <TabsTrigger value="register">{t('auth.tabs.register')}</TabsTrigger>
                )}
                <TabsTrigger value="forgot">{t('auth.tabs.forgot')}</TabsTrigger>
              </TabsList>

              {/* Aba de Login */}
              <TabsContent value="login" className="mt-6">
                <div className="space-y-2 mb-6">
                  <h2 className="text-2xl font-bold">{t('auth.login.title')}</h2>
                  <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
                </div>

                {/* Mostrar mensagem de erro da aba login */}
                {loginError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('auth.errors.title')}</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.login.email')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('auth.login.email')}
                      disabled={isLoading}
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-destructive text-sm">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.login.password')}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t('auth.login.password')}
                      disabled={isLoading}
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-destructive text-sm">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    <p>{t('auth.login.protectedByRecaptcha')}</p>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? t('auth.login.signingIn') : t('auth.login.signIn')}
                  </Button>
                </form>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot')}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('auth.login.forgotPasswordLink')}
                  </button>
                </div>

                {isKeycloakEnabled() && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t"/>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {t('auth.login.orContinueWith')}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isKeycloakLoading}
                      onClick={handleKeycloakLogin}
                    >
                      {isKeycloakLoading ? t('auth.login.signingIn') : 'Keycloak'}
                    </Button>
                  </>
                )}
              </TabsContent>

              {/* Aba de Cadastro - apenas se signup estiver habilitado */}
              {enableAccountSignup && (
                <TabsContent value="register" className="mt-6">
                  <div className="space-y-2 mb-6">
                    <h2 className="text-2xl font-bold">{t('auth.register.title')}</h2>
                    <p className="text-muted-foreground">{t('auth.register.subtitle')}</p>
                  </div>

                  {/* Mostrar mensagem de erro da aba cadastro */}
                  {registerError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t('auth.errors.title')}</AlertTitle>
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-fullName">{t('auth.register.fullName')}</Label>
                      <Input
                        id="register-fullName"
                        type="text"
                        placeholder={t('auth.register.fullName')}
                        disabled={isLoading}
                        {...registerForm.register('fullName')}
                      />
                      {registerForm.formState.errors.fullName && (
                        <p className="text-destructive text-sm">
                          {registerForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('auth.register.email')}</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t('auth.register.email')}
                        disabled={isLoading}
                        {...registerForm.register('email')}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-destructive text-sm">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('auth.register.password')}</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder={t('auth.register.password')}
                        disabled={isLoading}
                        {...registerForm.register('password')}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-destructive text-xs">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirmPassword">
                        {t('auth.register.confirmPassword')}
                      </Label>
                      <Input
                        id="register-confirmPassword"
                        type="password"
                        placeholder={t('auth.register.confirmPassword')}
                        disabled={isLoading}
                        {...registerForm.register('confirmPassword')}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-destructive text-sm">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>{t('auth.register.protectedByRecaptcha')}</p>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? t('auth.register.registering') : t('auth.register.createAccount')}
                    </Button>
                  </form>
                </TabsContent>
              )}

              {/* Aba de Esqueci Minha Senha */}
              <TabsContent value="forgot" className="mt-6">
                <div className="space-y-2 mb-6">
                  <h2 className="text-2xl font-bold">{t('auth.forgotPassword.title')}</h2>
                  <p className="text-muted-foreground">{t('auth.forgotPassword.subtitle')}</p>
                </div>

                {/* Mostrar mensagem de erro da aba recuperação */}
                {forgotPasswordError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('auth.errors.title')}</AlertTitle>
                    <AlertDescription>{forgotPasswordError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{t('auth.forgotPassword.email')}</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder={t('auth.forgotPassword.email')}
                        disabled={isLoading}
                        {...forgotPasswordForm.register('email')}
                      />
                      {forgotPasswordForm.formState.errors.email && (
                        <p className="text-destructive text-sm">
                          {forgotPasswordForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <p>{t('auth.forgotPassword.protectedByRecaptcha')}</p>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading
                        ? t('auth.forgotPassword.sending')
                        : t('auth.forgotPassword.sendInstructions')}
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
