import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Label,
  Separator,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Checkbox,
} from '@evoapi/design-system';
import { AlertTriangle, Mail, Volume2, Bell, Keyboard, Play, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import {
  profileService,
  type ProfileUpdateData,
  type PasswordChangeData,
} from '@/services/profile/profileService';
import { extractError } from '@/utils/apiHelpers';
import notificationSettingsService from '@/services/notifications/NotificationSettingsService';
import { getAudioSettings, playNotificationSoundPreview } from '@/utils/audioNotificationUtils';
import { getModifierKey } from '@/utils/platform';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';
import { ProfilePhotoUploader, TwoFactorSetup } from '@/components/shared/profile';

const SECTION_TO_TAB: Record<string, string> = {
  'personal-data': 'dados',
  'interface': 'interface',
  'notifications': 'notificacoes',
  'security': 'seguranca',
};

const TAB_TO_SECTION: Record<string, string> = {
  'dados': 'personal-data',
  'interface': 'interface',
  'notificacoes': 'notifications',
  'seguranca': 'security',
};

const Profile = () => {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useLanguage('profile');
  const normalizedUserAvatar = normalizeAvatarUrl(user?.avatar_url);
  const modifierKey = getModifierKey(); // 'Cmd' on Mac, 'Ctrl' on others
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const initialTab = (section && SECTION_TO_TAB[section]) || 'dados';
  const [activeTab, setActiveTab] = useState(initialTab);

  // H1: sync tab when browser back/forward changes the section param without remount
  useEffect(() => {
    const tab = (section && SECTION_TO_TAB[section]) || 'dados';
    setActiveTab(tab);
  }, [section]);

  // M1: canonicalize the URL — /profile → /profile/personal-data; invalid sections → same
  useEffect(() => {
    if (!section || !SECTION_TO_TAB[section]) {
      navigate('/profile/personal-data', { replace: true });
    }
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    navigate(`/profile/${TAB_TO_SECTION[tab]}`, { replace: true });
  }, [navigate]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Dados pessoais - inicializados com dados reais do usuário
  const [userData, setUserData] = useState({
    name: '',
    display_name: '',
    email: '',
    unconfirmed_email: null as string | null,
    message_signature: '',
    avatar: null as File | null,
    avatar_url: '',
    // api_access_token: '',
  });

  // Senha
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  // Configurações de interface
  const [uiSettings, setUiSettings] = useState({
    font_size: 'medium' as 'small' | 'medium' | 'large',
    editor_message_key: 'enter' as 'enter' | 'cmd_enter',
  });

  // Configurações de notificação - agora dinâmico baseado no backend
  const [notificationSettings, setNotificationSettings] = useState<{
    email_notifications: Record<string, boolean>;
    push_notifications: Record<string, boolean>;
    browser_push_enabled: boolean;
    available_types: string[]; // Tipos disponíveis do backend
  }>({
    email_notifications: {},
    push_notifications: {},
    browser_push_enabled: false,
    available_types: [],
  });

  // Configurações de áudio
  const [audioSettings, setAudioSettings] = useState(() => {
    // Load from localStorage on mount
    try {
      return getAudioSettings();
    } catch {
      return {
        enable_audio_alerts: false,
        notification_tone: 'ding' as const,
        always_play_audio_alert: false,
        alert_if_unread_assigned_conversation_exist: false,
      };
    }
  });

  // Helper function to extract notification type from flag (remove prefix)
  const extractNotificationType = (flag: string): string => {
    return flag.replace(/^(email_|push_)/, '');
  };

  // Helper function to convert backend flags to frontend format
  const flagsToSettings = useCallback(
    (selectedFlags: string[], availableFlags: string[]): Record<string, boolean> => {
      const settings: Record<string, boolean> = {};

      // Inicializar todos os tipos disponíveis como false
      availableFlags.forEach(flag => {
        const type = extractNotificationType(flag);
        settings[type] = false;
      });

      // Marcar os selecionados como true
      selectedFlags.forEach(flag => {
        const type = extractNotificationType(flag);
        if (type in settings) {
          settings[type] = true;
        }
      });

      return settings;
    },
    [],
  );

  // Helper function to convert frontend format to backend flags
  const settingsToFlags = (
    settings: Record<string, boolean>,
    prefix: 'email' | 'push',
  ): string[] => {
    return Object.entries(settings)
      .filter(([, enabled]) => enabled)
      .map(([key]) => `${prefix}_${key}`);
  };

  // Buscar dados completos do perfil quando o componente carrega
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          // Fazer chamada para /profile para buscar dados completos
          const response = await profileService.getProfile();
          const profileUser = response.user;

          setUserData(prev => ({
            ...prev,
            name: profileUser.name || '',
            display_name: profileUser.display_name || '',
            email: profileUser.email || '',
            unconfirmed_email: profileUser.unconfirmed_email || null,
            message_signature: profileUser.message_signature || '',
            avatar_url: normalizeAvatarUrl(profileUser.avatar_url),
            // api_access_token: profileUser.api_access_token || '',
          }));

          // Carregar configurações de UI
          if (profileUser.ui_settings) {
            setUiSettings(prev => ({
              ...prev,
              font_size: profileUser.ui_settings?.font_size || 'medium',
              editor_message_key: profileUser.ui_settings?.editor_message_key || 'enter',
            }));
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Fallback para dados do contexto se a API falhar
          setUserData(prev => ({
            ...prev,
            name: user.name || '',
            display_name: user.display_name || '',
            email: user.email || '',
            message_signature: user.message_signature || '',
            avatar_url: normalizedUserAvatar,
            // api_access_token: user.api_access_token || '',
          }));
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Carregar preferências de notificação quando o componente carrega
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const settings = await notificationSettingsService.getSettings();

        // Extrair tipos únicos disponíveis (de all_email_flags ou all_push_flags)
        const availableEmailFlags = settings.all_email_flags || [];
        const availablePushFlags = settings.all_push_flags || [];
        const allAvailableFlags = [...new Set([...availableEmailFlags, ...availablePushFlags])];
        const availableTypes = allAvailableFlags.map(flag => extractNotificationType(flag));

        console.log('📧 [Profile] Notification settings loaded:', {
          all_email_flags: settings.all_email_flags,
          all_push_flags: settings.all_push_flags,
          selected_email_flags: settings.selected_email_flags,
          selected_push_flags: settings.selected_push_flags,
          availableTypes,
        });

        // Converter flags do backend para formato do frontend usando os tipos disponíveis
        setNotificationSettings(prev => ({
          ...prev,
          email_notifications: flagsToSettings(
            settings.selected_email_flags || [],
            availableEmailFlags,
          ),
          push_notifications: flagsToSettings(
            settings.selected_push_flags || [],
            availablePushFlags,
          ),
          available_types: availableTypes,
        }));
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        // Manter valores padrão se houver erro
      }
    };

    fetchNotificationSettings();

    // Check browser notification permission status on mount
    if ('Notification' in window) {
      const permission = Notification.permission;
      setNotificationSettings(prev => ({
        ...prev,
        browser_push_enabled: permission === 'granted',
      }));
    }
  }, [flagsToSettings]);

  // Limpar email de confirmação quando dialog fechar
  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteConfirmEmail('');
    }
  }, [deleteDialogOpen]);

  // Manipuladores de eventos
  const handleUserDataChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    handleUserDataChange(field, e.target.value);
  };

  const handlePasswordInputChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    handlePasswordChange(field, e.target.value);
  };

  const handlePhotoChange = (file: File, url: string) => {
    setUserData(prev => ({
      ...prev,
      avatar: file,
      avatar_url: normalizeAvatarUrl(url),
    }));
  };


  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      await profileService.resendEmailConfirmation();
      toast.success(t('personalData.emailConfirmation.resendSuccess'));
    } catch {
      toast.error(t('personalData.emailConfirmation.resendError'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setIsCancelling(true);
    try {
      const updatedProfile = await profileService.cancelEmailChange();
      toast.success(t('personalData.emailConfirmation.cancelSuccess'));
      setUserData(prev => ({
        ...prev,
        email: updatedProfile.email || prev.email,
        unconfirmed_email: updatedProfile.unconfirmed_email || null,
      }));
      if (user) {
        useAuthStore.getState().setUser({ ...user, ...updatedProfile });
      }
    } catch {
      toast.error(t('personalData.emailConfirmation.cancelError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmEmail !== user.email) {
      return;
    }

    setIsDeleting(true);
    try {
      // TODO: Implementar chamada real para API de exclusão de conta
      // await deleteAccount({ email: user.email });

      // Simulação de exclusão
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fazer logout e redirecionar
      await logout();

      // Mostrar mensagem de sucesso antes do redirect (opcional)
      toast.success(t('notifications.accountDeleted'));
    } catch {
      toast.error(t('notifications.accountDeleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updateData: ProfileUpdateData = {
        name: userData.name,
        display_name: userData.display_name,
        email: userData.email,
        message_signature: userData.message_signature,
      };

      // Add avatar if changed
      if (userData.avatar) {
        updateData.avatar = userData.avatar;
      }

      await profileService.updateProfile(updateData);

      // Buscar dados atualizados do perfil para garantir que temos os dados mais recentes
      const profileResponse = await profileService.getProfile();
      const updatedUser = profileResponse.user;

      // Atualizar dados do usuário no store DIRETAMENTE para refletir mudanças imediatamente
      if (user) {
        const mergedUser = {
          ...user,
          ...updatedUser,
          avatar_url: normalizeAvatarUrl(updatedUser.avatar_url) || user.avatar_url,
        };

        useAuthStore.getState().setUser(mergedUser);
      }

      // Atualizar estado local com os dados mais recentes
      setUserData(prev => ({
        ...prev,
        name: updatedUser.name || '',
        display_name: updatedUser.display_name || '',
        email: updatedUser.email || '',
        unconfirmed_email: updatedUser.unconfirmed_email || null,
        message_signature: updatedUser.message_signature || '',
        avatar: null, // Clear file after upload
        avatar_url: normalizeAvatarUrl(updatedUser.avatar_url) || prev.avatar_url,
      }));

      if (updatedUser.unconfirmed_email) {
        toast.success(t('personalData.emailConfirmation.emailUpdatedPending', { email: updatedUser.unconfirmed_email }));
      } else {
        toast.success(t('notifications.profileUpdated'));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t('notifications.profileUpdateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current_password || !passwords.password || !passwords.password_confirmation) {
      toast.error(t('password.validation.allFields'));
      return;
    }

    if (passwords.password !== passwords.password_confirmation) {
      toast.error(t('password.validation.mismatch'));
      return;
    }

    if (passwords.password.length < 8) {
      toast.error(t('password.validation.minLength'));
      return;
    }

    setIsLoading(true);
    try {
      const passwordData: PasswordChangeData = {
        current_password: passwords.current_password,
        password: passwords.password,
        password_confirmation: passwords.password_confirmation,
      };

      await profileService.changePassword(passwordData);
      toast.success(t('notifications.passwordChanged'));

      setPasswords({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      const errorInfo = extractError(error);
      if (errorInfo.code === 'VALIDATION_ERROR' && Array.isArray(errorInfo.details)) {
        const passwordDetail = errorInfo.details.find((d: { field: string; codes?: string[] }) => d.field === 'password');
        if (passwordDetail?.codes?.length) {
          passwordDetail.codes.forEach((code: string) => {
            const key = `password.errors.${code.replace('password.', '')}`;
            toast.error(t(key));
          });
        } else {
          toast.error(t('notifications.passwordChangeError'));
        }
      } else {
        toast.error(t('notifications.passwordChangeError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderDadosPessoais = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('personalData.title')}</CardTitle>
        <CardDescription>{t('personalData.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex">
          <ProfilePhotoUploader
            initialPhoto={userData.avatar_url}
            userName={userData.name || user?.email || t('personalData.defaultUser')}
            onPhotoChange={handlePhotoChange}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t('personalData.fields.fullName')} *</Label>
            <Input
              id="name"
              type="text"
              value={userData.name}
              onChange={handleInputChange('name')}
              placeholder={t('personalData.fields.fullNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">{t('personalData.fields.displayName')}</Label>
            <Input
              id="display_name"
              type="text"
              value={userData.display_name}
              onChange={handleInputChange('display_name')}
              placeholder={t('personalData.fields.displayNamePlaceholder')}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">{t('personalData.fields.email')} *</Label>
            <Input
              id="email"
              type="email"
              value={userData.email}
              onChange={handleInputChange('email')}
              placeholder={t('personalData.fields.emailPlaceholder')}
              disabled={!!userData.unconfirmed_email}
            />
            {userData.unconfirmed_email && (
              <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 mt-2">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {t('personalData.emailConfirmation.pendingChange', { email: userData.unconfirmed_email })}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={handleResendConfirmation} disabled={isResending}>
                      {isResending ? '...' : t('personalData.emailConfirmation.resend')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEmailChange} disabled={isCancelling}>
                      {isCancelling ? '...' : t('personalData.emailConfirmation.cancel')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveProfile} disabled={isLoading} className="min-w-[120px]">
            {isLoading ? t('personalData.actions.saving') : t('personalData.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSenha = () => {
    const newPassword = passwords.password;
    const complexityRules = [
      { key: 'minLength', met: newPassword.length >= 8 },
      { key: 'uppercase', met: /[A-Z]/.test(newPassword) },
      { key: 'lowercase', met: /[a-z]/.test(newPassword) },
      { key: 'number', met: /\d/.test(newPassword) },
      { key: 'specialChar', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-6">
            <div className="space-y-2">
              <Label htmlFor="senha-atual">{t('password.fields.currentPassword')} *</Label>
              <Input
                id="senha-atual"
                type="password"
                value={passwords.current_password}
                onChange={handlePasswordInputChange('current_password')}
                placeholder={t('password.fields.currentPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-senha">{t('password.fields.newPassword')} *</Label>
              <Input
                id="nova-senha"
                type="password"
                value={passwords.password}
                onChange={handlePasswordInputChange('password')}
                placeholder={t('password.fields.newPlaceholder')}
              />
              {newPassword.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {complexityRules.map(({ key, met }) => (
                    <li key={key} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {t(`password.rules.${key}`)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">{t('password.fields.confirmPassword')} *</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={passwords.password_confirmation}
                onChange={handlePasswordInputChange('password_confirmation')}
                placeholder={t('password.fields.confirmPlaceholder')}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={isLoading} className="min-w-[120px]">
                {isLoading ? t('password.actions.changing') : t('password.actions.changePassword')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // const handleCopyToken = async () => {
  //   // Primeiro tenta buscar do perfil carregado, depois do contexto
  //   const token = userData.api_access_token || user?.api_access_token;
  //   if (token) {
  //     try {
  //       await navigator.clipboard.writeText(token);
  //       toast.success(t('accessToken.notifications.copied'));
  //     } catch {
  //       toast.error(t('accessToken.notifications.copyError'));
  //     }
  //   }
  // };

  const handleUISettingsChange = async (settings: Partial<typeof uiSettings>) => {
    try {
      setUiSettings(prev => ({ ...prev, ...settings }));
      await profileService.updateUISettings(settings);

      // Atualizar contexto do usuário para que as mudanças sejam aplicadas globalmente
      await refreshUser();

      toast.success(t('notifications.settingsUpdated'));
    } catch {
      toast.error(t('notifications.settingsUpdateError'));
    }
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    handleUISettingsChange({ font_size: fontSize });
  };

  const handleHotKeyChange = (key: 'enter' | 'cmd_enter') => {
    handleUISettingsChange({ editor_message_key: key });
  };

  const handleNotificationChange = async (
    type: 'email' | 'push',
    setting: string,
    value: boolean,
  ) => {
    // Verificar se o tipo está disponível
    if (!notificationSettings.available_types.includes(setting)) {
      console.warn(`Notification type "${setting}" is not available`);
      return;
    }

    // Auto-request browser permission on first push enable.
    // If the user denies the prompt, abort: saving push=true while permission is
    // 'denied' would silently store an unreachable subscription on the backend.
    if (type === 'push' && value && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await requestNotificationPermission();
      }
      if (Notification.permission !== 'granted') {
        toast.error(t('notifications.browserPermission.denied'));
        return;
      }
    }

    // Atualizar estado local primeiro (otimistic update)
    const notificationType = `${type}_notifications` as keyof typeof notificationSettings;
    const currentNotifications = notificationSettings[notificationType] as Record<string, boolean> | undefined;
    const previousValue = currentNotifications?.[setting];

    setNotificationSettings(prev => {
      const notificationType = `${type}_notifications` as keyof typeof prev;
      const currentNotifications = prev[notificationType] as Record<string, boolean>;

      return {
        ...prev,
        [notificationType]: {
          ...currentNotifications,
          [setting]: value,
        },
      };
    });

    try {
      const updatedSettings = {
        ...notificationSettings,
        [`${type}_notifications`]: {
          ...(notificationSettings[
            `${type}_notifications` as keyof typeof notificationSettings
          ] as Record<string, boolean>),
          [setting]: value,
        },
      };

      const emailFlags = settingsToFlags(updatedSettings.email_notifications, 'email');
      const pushFlags = settingsToFlags(updatedSettings.push_notifications, 'push');

      await notificationSettingsService.updateSettings({
        selected_email_flags: emailFlags,
        selected_push_flags: pushFlags,
      });

      toast.success(t('notifications.updated'));
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error(t('notifications.settingsUpdateError'));

      // Reverter mudança em caso de erro
      setNotificationSettings(prev => {
        const notificationType = `${type}_notifications` as keyof typeof prev;
        const currentNotifications = prev[notificationType] as Record<string, boolean>;

        return {
          ...prev,
          [notificationType]: {
            ...currentNotifications,
            [setting]: previousValue ?? false, // Reverter para valor anterior
          },
        };
      });
    }
  };

  const handleAudioSettingsChange = async (settings: Partial<typeof audioSettings>) => {
    const updatedSettings = { ...audioSettings, ...settings };
    setAudioSettings(updatedSettings);

    // Save to localStorage (audio settings are client-side only)
    try {
      const { saveAudioSettings } = await import('@/utils/audioNotificationUtils');
      saveAudioSettings(updatedSettings);
      toast.success(t('audio.updated'));
    } catch (error) {
      console.error('Error saving audio settings:', error);
      toast.error(t('audio.saveError'));
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t('notifications.browserPermission.notSupported'));
      return;
    }

    // Check current permission status
    let permission = Notification.permission;

    // If permission is default, request it
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    // Update state based on permission
    const isGranted = permission === 'granted';
    setNotificationSettings(prev => ({
      ...prev,
      browser_push_enabled: isGranted,
    }));

    if (isGranted) {
      toast.success(t('notifications.browserPermission.granted'));
    } else if (permission === 'denied') {
      toast.error(t('notifications.browserPermission.denied'));
    }
  };

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setNotificationSettings(prev => ({
        ...prev,
        browser_push_enabled: permission === 'granted',
      }));
    }
  }, []);

  const renderInterfaceSettings = () => (
    <div className="space-y-6">
      {/* Configurações de Interface */}
      <Card>
        <CardHeader>
          <CardTitle>{t('interface.title')}</CardTitle>
          <CardDescription>{t('interface.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tamanho da fonte */}
          <div className="flex gap-2 justify-between w-full items-start">
            <div>
              <Label className="text-sm font-medium leading-6">
                {t('interface.fontSize.title')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('interface.fontSize.description')}</p>
            </div>
            <Select value={uiSettings.font_size} onValueChange={handleFontSizeChange}>
              <SelectTrigger className="min-w-28 mt-px">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t('interface.fontSize.options.small')}</SelectItem>
                <SelectItem value="medium">{t('interface.fontSize.options.default')}</SelectItem>
                <SelectItem value="large">{t('interface.fontSize.options.large')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assinatura de Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle>{t('interface.messageSignature.title')}</CardTitle>
          <CardDescription>{t('interface.messageSignature.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message-signature">{t('interface.messageSignature.label')}</Label>
            <Textarea
              id="message-signature"
              value={userData.message_signature || ''}
              onChange={e => setUserData(prev => ({ ...prev, message_signature: e.target.value }))}
              placeholder={t('interface.messageSignature.placeholder')}
              rows={4}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={isLoading} className="min-w-[120px]">
              {isLoading ? t('personalData.actions.saving') : t('personalData.actions.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teclas de Atalho para Enviar Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle>{t('interface.hotkeys.title')}</CardTitle>
          <CardDescription>{t('interface.hotkeys.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-between w-full gap-5 sm:gap-4 sm:flex-row">
            <button
              className={`px-0 reset-base w-full sm:flex-1 rounded-xl outline ${
                uiSettings.editor_message_key === 'enter'
                  ? 'outline-green-500/30'
                  : 'outline-gray-300'
              }`}
              onClick={() => handleHotKeyChange('enter')}
            >
              <div className="p-6 text-left">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">{t('interface.hotkeys.enter.title')}</h4>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      uiSettings.editor_message_key === 'enter'
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {uiSettings.editor_message_key === 'enter' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('interface.hotkeys.enter.description')}
                </p>
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  <span className="text-xs bg-muted px-2 py-1 rounded">Enter</span>
                </div>
              </div>
            </button>

            <button
              className={`px-0 reset-base w-full sm:flex-1 rounded-xl outline ${
                uiSettings.editor_message_key === 'cmd_enter'
                  ? 'outline-green-500/30'
                  : 'outline-gray-300'
              }`}
              onClick={() => handleHotKeyChange('cmd_enter')}
            >
              <div className="p-6 text-left">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg">
                    {modifierKey} + Enter ({modifierKey === 'Cmd' ? '⌘' : 'Ctrl'} + ↵)
                  </h4>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      uiSettings.editor_message_key === 'cmd_enter'
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {uiSettings.editor_message_key === 'cmd_enter' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('interface.hotkeys.cmdEnter.description')}
                </p>
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" />
                  <span className="text-xs bg-muted px-2 py-1 rounded">{modifierKey}</span>
                  <span className="text-xs">+</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">Enter</span>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderNotificationSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('notifications.title')}
        </CardTitle>
        <CardDescription>{t('notifications.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permissão do navegador */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">{t('notifications.browserPermission.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('notifications.browserPermission.description')}
              </p>
            </div>
          </div>
          <Switch
            checked={notificationSettings.browser_push_enabled}
            onCheckedChange={requestNotificationPermission}
          />
        </div>

        {/* Notificações por email */}
        <div className="space-y-4">
          <h4 className="font-medium">{t('notifications.email.title')}</h4>
          {notificationSettings.available_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('notifications.loading') || 'Loading notification preferences...'}
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(notificationSettings.email_notifications)
                .filter(([key]) => notificationSettings.available_types.includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`email-${key}`} className="text-sm">
                      {getNotificationLabel(key)}
                    </Label>
                    <Checkbox
                      id={`email-${key}`}
                      checked={value}
                      onCheckedChange={checked =>
                        handleNotificationChange('email', key, checked === true)
                      }
                    />
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Notificações push */}
        <div className="space-y-4">
          <h4 className="font-medium">{t('notifications.push.title')}</h4>
          {notificationSettings.available_types.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('notifications.loading') || 'Loading notification preferences...'}
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(notificationSettings.push_notifications)
                .filter(([key]) => notificationSettings.available_types.includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`push-${key}`} className="text-sm">
                      {getNotificationLabel(key)}
                    </Label>
                    <Checkbox
                      id={`push-${key}`}
                      checked={value}
                      onCheckedChange={checked =>
                        handleNotificationChange('push', key, checked === true)
                      }
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderAudioSettings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          {t('audio.title')}
        </CardTitle>
        <CardDescription>{t('audio.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Habilitar alertas de áudio */}
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('audio.enable.title')}</Label>
            <p className="text-sm text-muted-foreground">{t('audio.enable.description')}</p>
          </div>
          <Switch
            checked={audioSettings.enable_audio_alerts}
            onCheckedChange={checked => handleAudioSettingsChange({ enable_audio_alerts: checked })}
          />
        </div>

        {audioSettings.enable_audio_alerts && (
          <>
            {/* Tom de notificação */}
            <div className="space-y-2">
              <Label>{t('audio.tone.title')}</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={audioSettings.notification_tone}
                  onValueChange={(value: 'ding' | 'chime' | 'bell' | 'notification' | 'magic') =>
                    handleAudioSettingsChange({ notification_tone: value })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ding">{t('audio.tone.options.ding')}</SelectItem>
                    <SelectItem value="chime">{t('audio.tone.options.chime')}</SelectItem>
                    <SelectItem value="bell">{t('audio.tone.options.bell')}</SelectItem>
                    <SelectItem value="notification">
                      {t('audio.tone.options.notification')}
                    </SelectItem>
                    <SelectItem value="magic">
                      {t('audio.tone.options.magic') || 'Magic'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => playNotificationSoundPreview(audioSettings.notification_tone)}
                  title={t('audio.tone.preview') || 'Preview sound'}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Condições de áudio */}
            <div className="space-y-4">
              <Label>{t('audio.conditions.title')}</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="play-when-inactive" className="text-sm">
                    {t('audio.conditions.playWhenInactive')}
                  </Label>
                  <Checkbox
                    id="play-when-inactive"
                    checked={!audioSettings.always_play_audio_alert}
                    onCheckedChange={checked =>
                      handleAudioSettingsChange({ always_play_audio_alert: checked !== true })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-unread" className="text-sm">
                    {t('audio.conditions.alertUnread')}
                  </Label>
                  <Checkbox
                    id="alert-unread"
                    checked={audioSettings.alert_if_unread_assigned_conversation_exist}
                    onCheckedChange={checked =>
                      handleAudioSettingsChange({
                        alert_if_unread_assigned_conversation_exist: checked === true,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const getNotificationLabel = (key: string) => {
    const labels: Record<string, string> = {
      conversation_creation: t('notifications.email.types.conversation_creation'),
      conversation_assignment: t('notifications.email.types.conversation_assignment'),
      assigned_conversation_new_message: t(
        'notifications.email.types.assigned_conversation_new_message',
      ),
      conversation_mention: t('notifications.email.types.conversation_mention'),
      participating_conversation_new_message: t(
        'notifications.email.types.participating_conversation_new_message',
      ),
      sla_missed_first_response: t('notifications.email.types.sla_missed_first_response'),
      sla_missed_next_response: t('notifications.email.types.sla_missed_next_response'),
      sla_missed_resolution: t('notifications.email.types.sla_missed_resolution'),
    };
    return labels[key] ?? key;
  };

  const renderZonaPerigo = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{t('dangerZone.title')}</CardTitle>
        </div>
        <CardDescription>{t('dangerZone.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <h3 className="font-semibold text-destructive mb-2">
            {t('dangerZone.deleteAccount.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('dangerZone.deleteAccount.description')}
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            className="min-w-[140px]"
          >
            {t('dangerZone.deleteAccount.button')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state se não há usuário
  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const isDeleteConfirmValid = deleteConfirmEmail === user.email;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="dados">{t('tabs.personalData')}</TabsTrigger>
          <TabsTrigger value="interface">{t('tabs.interface')}</TabsTrigger>
          <TabsTrigger value="notificacoes">{t('tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="seguranca">{t('tabs.security')}</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          {renderDadosPessoais()}
        </TabsContent>

        <TabsContent value="interface" className="space-y-6">
          {renderInterfaceSettings()}
        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-6">
          {renderNotificationSettings()}
          {renderAudioSettings()}
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6">
          {renderSenha()}
          <TwoFactorSetup onUpdate={refreshUser} />
          {/* Zona de Perigo - movida para aba Segurança */}
          {renderZonaPerigo()}
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <DialogTitle className="text-destructive">
                {t('dangerZone.deleteAccount.confirmTitle')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-2">
              <p className="font-medium">{t('dangerZone.deleteAccount.confirmDescription')}</p>
              <p>{t('dangerZone.deleteAccount.permanentWarning')}</p>
              <p className="text-sm text-muted-foreground">
                {t('dangerZone.deleteAccount.emailConfirmText')} <strong>{user.email}</strong>
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">{t('dangerZone.deleteAccount.emailLabel')}</Label>
              <Input
                id="confirm-email"
                type="email"
                value={deleteConfirmEmail}
                onChange={e => setDeleteConfirmEmail(e.target.value)}
                placeholder={t('dangerZone.deleteAccount.emailPlaceholder')}
                className={deleteConfirmEmail && !isDeleteConfirmValid ? 'border-destructive' : ''}
              />
              {deleteConfirmEmail && !isDeleteConfirmValid && (
                <p className="text-sm text-destructive">
                  {t('dangerZone.deleteAccount.emailMismatch')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('dangerZone.deleteAccount.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isDeleteConfirmValid || isDeleting}
              className="min-w-[100px]"
            >
              {isDeleting
                ? t('dangerZone.deleteAccount.deleting')
                : t('dangerZone.deleteAccount.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
