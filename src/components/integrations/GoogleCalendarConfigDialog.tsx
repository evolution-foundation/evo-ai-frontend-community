import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
} from '@evoapi/design-system';
import BrandIcon from '@/components/BrandIcon';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import {
  Calendar,
  Clock,
  Video,
  Settings,
  User,
  Building2,
  FileText,
  Mail,
  Loader2,
  CalendarCheck,
  CalendarClock,
  Repeat,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import GoogleCalendarService from '@/services/integrations/googleCalendarService';
import { GoogleCalendarConfig, GoogleCalendarItem } from '@/types/integrations';

interface GoogleCalendarConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: GoogleCalendarConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<GoogleCalendarConfig>;
  agentId: string;
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const GoogleCalendarConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: GoogleCalendarConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendarItem[]>([]);

  const [config, setConfig] = useState<GoogleCalendarConfig>({
    provider: 'google_calendar',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    calendars: initialConfig?.calendars || [],
    settings: {
      selectedCalendarId: initialConfig?.settings?.selectedCalendarId || '',
      minAdvanceTime: {
        enabled: initialConfig?.settings?.minAdvanceTime?.enabled || false,
        value: initialConfig?.settings?.minAdvanceTime?.value || 1,
        unit: initialConfig?.settings?.minAdvanceTime?.unit || 'hours',
      },
      maxDistance: {
        enabled: initialConfig?.settings?.maxDistance?.enabled || false,
        value: initialConfig?.settings?.maxDistance?.value || 1,
        unit: initialConfig?.settings?.maxDistance?.unit || 'weeks',
      },
      maxDuration: {
        value: initialConfig?.settings?.maxDuration?.value || 1,
        unit: initialConfig?.settings?.maxDuration?.unit || 'hours',
      },
      simultaneousBookings: {
        enabled: initialConfig?.settings?.simultaneousBookings?.enabled || false,
        limit: initialConfig?.settings?.simultaneousBookings?.limit || 1,
      },
      alwaysOpen: initialConfig?.settings?.alwaysOpen || false,
      businessHours: initialConfig?.settings?.businessHours || {
        monday: { enabled: true, start: '08:00', end: '18:00' },
        tuesday: { enabled: true, start: '08:00', end: '18:00' },
        wednesday: { enabled: true, start: '08:00', end: '18:00' },
        thursday: { enabled: true, start: '08:00', end: '18:00' },
        friday: { enabled: true, start: '08:00', end: '18:00' },
        saturday: { enabled: false, start: '08:00', end: '18:00' },
        sunday: { enabled: false, start: '08:00', end: '18:00' },
      },
      meetIntegration: initialConfig?.settings?.meetIntegration || false,
      allowAvailabilityCheck: initialConfig?.settings?.allowAvailabilityCheck || true,
      restrictedHours: {
        enabled: initialConfig?.settings?.restrictedHours?.enabled || false,
        allowedTimes: initialConfig?.settings?.restrictedHours?.allowedTimes || ['09:00'],
      },
      distributionMode: initialConfig?.settings?.distributionMode || 'sequential',
      bookingFields: initialConfig?.settings?.bookingFields || [
        { id: '1', name: 'name', label: 'Nome', enabled: false, required: false },
        { id: '2', name: 'company', label: 'Empresa', enabled: true, required: false },
        { id: '3', name: 'subject', label: 'Assunto', enabled: true, required: false },
        { id: '4', name: 'duration', label: 'Duração', enabled: false, required: false },
        { id: '5', name: 'email', label: 'E-mail', enabled: true, required: false },
        { id: '6', name: 'summary', label: 'Resumo', enabled: false, required: false },
      ],
    },
  });

  // Sync config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        provider: 'google_calendar',
        email: initialConfig?.email || '',
        connected: initialConfig?.connected || false,
        calendars: initialConfig?.calendars || [],
        settings: {
          selectedCalendarId: initialConfig?.settings?.selectedCalendarId || '',
          minAdvanceTime: {
            enabled: initialConfig?.settings?.minAdvanceTime?.enabled || false,
            value: initialConfig?.settings?.minAdvanceTime?.value || 1,
            unit: initialConfig?.settings?.minAdvanceTime?.unit || 'hours',
          },
          maxDistance: {
            enabled: initialConfig?.settings?.maxDistance?.enabled || false,
            value: initialConfig?.settings?.maxDistance?.value || 1,
            unit: initialConfig?.settings?.maxDistance?.unit || 'weeks',
          },
          maxDuration: {
            value: initialConfig?.settings?.maxDuration?.value || 1,
            unit: initialConfig?.settings?.maxDuration?.unit || 'hours',
          },
          simultaneousBookings: {
            enabled: initialConfig?.settings?.simultaneousBookings?.enabled || false,
            limit: initialConfig?.settings?.simultaneousBookings?.limit || 1,
          },
          alwaysOpen: initialConfig?.settings?.alwaysOpen || false,
          businessHours: initialConfig?.settings?.businessHours || {
            monday: { enabled: true, start: '08:00', end: '18:00' },
            tuesday: { enabled: true, start: '08:00', end: '18:00' },
            wednesday: { enabled: true, start: '08:00', end: '18:00' },
            thursday: { enabled: true, start: '08:00', end: '18:00' },
            friday: { enabled: true, start: '08:00', end: '18:00' },
            saturday: { enabled: false, start: '08:00', end: '18:00' },
            sunday: { enabled: false, start: '08:00', end: '18:00' },
          },
          meetIntegration: initialConfig?.settings?.meetIntegration || false,
          allowAvailabilityCheck: initialConfig?.settings?.allowAvailabilityCheck || true,
          restrictedHours: {
            enabled: initialConfig?.settings?.restrictedHours?.enabled || false,
            allowedTimes: initialConfig?.settings?.restrictedHours?.allowedTimes || ['09:00'],
          },
          distributionMode: initialConfig?.settings?.distributionMode || 'sequential',
          bookingFields: initialConfig?.settings?.bookingFields || [
            { id: '1', name: 'name', label: 'Nome', enabled: false, required: false },
            { id: '2', name: 'company', label: 'Empresa', enabled: true, required: false },
            { id: '3', name: 'subject', label: 'Assunto', enabled: true, required: false },
            { id: '4', name: 'duration', label: 'Duração', enabled: false, required: false },
            { id: '5', name: 'email', label: 'E-mail', enabled: true, required: false },
            { id: '6', name: 'summary', label: 'Resumo', enabled: false, required: false },
          ],
        },
      });
    }
  }, [initialConfig]);

  // Load calendars when connected
  useEffect(() => {
    if (config.connected && open) {
      loadCalendars();
    }
  }, [config.connected, open]);

  const loadCalendars = async () => {
    setIsLoadingCalendars(true);
    try {
      const calendars = await GoogleCalendarService.getCalendars(agentId);
      setAvailableCalendars(calendars);
      setConfig((prev) => ({ ...prev, calendars }));
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error('Erro ao carregar agendas');
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!config.email) {
      toast.error('Por favor, insira um e-mail');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await GoogleCalendarService.generateAuthorization(
        agentId,
        config.email
      );

      if (response.url) {
        // Redirect to Google OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast.error('Erro ao conectar com Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!config.settings?.selectedCalendarId) {
      toast.error('Por favor, selecione uma agenda');
      return;
    }

    try {
      // Save configuration to backend first
      await GoogleCalendarService.saveConfiguration(agentId, config);

      // Then update local state
      onSave(config);
      toast.success('Configurações salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Calendar configuration:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleDisconnect = async () => {
    try {
      // Call backend to disconnect
      await GoogleCalendarService.disconnect(agentId);

      // Update local state
      if (onDisconnect) {
        onDisconnect();
      }

      toast.success('Google Calendar desconectado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Erro ao desconectar Google Calendar');
    }
  };

  const updateBusinessHours = (day: string, field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    setConfig((prev) => {
      const currentDayData = prev.settings?.businessHours?.[day] || { enabled: false, start: '08:00', end: '18:00' };
      return {
        ...prev,
        settings: {
          ...prev.settings,
          businessHours: {
            ...prev.settings?.businessHours,
            [day]: {
              enabled: field === 'enabled' ? (value as boolean) : currentDayData.enabled,
              start: field === 'start' ? (value as string) : currentDayData.start,
              end: field === 'end' ? (value as string) : currentDayData.end,
            },
          },
        },
      };
    });
  };

  const updateBookingField = (fieldId: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        bookingFields: prev.settings?.bookingFields?.map((field) =>
          field.id === fieldId ? { ...field, enabled } : field
        ),
      },
    }));
  };

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'name':
        return <User className="h-4 w-4" />;
      case 'company':
        return <Building2 className="h-4 w-4" />;
      case 'subject':
        return <FileText className="h-4 w-4" />;
      case 'duration':
        return <Clock className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'summary':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandIcon id="google-calendar" size={20} className="h-5 w-5" />
            {t('edit.integrations.googleCalendar.configTitle') || 'Configurar Google Calendar'}
          </DialogTitle>
        </DialogHeader>

        {!config.connected ? (
          /* Not connected - Show connect screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BrandIcon id="google-calendar" size={48} className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.integrations.googleCalendar.connectTitle') || 'Conectar com Google Calendar'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.googleCalendar.connectDescription') ||
                    'Permita que o agente acesse e gerencie agendamentos na sua agenda do Google'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">
                  {t('edit.integrations.googleCalendar.email') || 'E-mail do Google'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@gmail.com"
                  value={config.email}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                />
              </div>

              <Button onClick={handleConnectGoogle} disabled={isConnecting} className="w-full" size="lg">
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('edit.integrations.googleCalendar.connecting') || 'Conectando...'}
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('edit.integrations.googleCalendar.connectButton') || 'Conectar com Google'}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Connected - Show configuration */
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <CalendarClock className="h-4 w-4 mr-2" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Zap className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              {/* Calendar Selection */}
              <div className="space-y-3">
                <Label>
                  {t('edit.integrations.googleCalendar.calendar.selectCalendar') || 'Agenda'}
                </Label>
                <Select
                  value={config.settings?.selectedCalendarId}
                  onValueChange={(value) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, selectedCalendarId: value },
                    })
                  }
                  disabled={isLoadingCalendars}
                >
                  <SelectTrigger>
                    {isLoadingCalendars ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando agendas...
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecione uma agenda" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        {calendar.name} {calendar.primary && '(Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Advance Time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label>
                      {t('edit.integrations.googleCalendar.minAdvanceTime.title') || 'Tempo mínimo de antecedência'}
                    </Label>
                  </div>
                  <Switch
                    checked={config.settings?.minAdvanceTime?.enabled}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          minAdvanceTime: { ...config.settings?.minAdvanceTime, enabled: checked },
                        },
                      })
                    }
                  />
                </div>
                {config.settings?.minAdvanceTime?.enabled && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={config.settings?.minAdvanceTime?.value || 1}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          settings: {
                            ...config.settings,
                            minAdvanceTime: {
                              enabled: config.settings?.minAdvanceTime?.enabled || false,
                              value: parseInt(e.target.value) || 1,
                              unit: config.settings?.minAdvanceTime?.unit || 'hours',
                            },
                          },
                        })
                      }
                      className="w-24"
                    />
                    <Select
                      value={config.settings?.minAdvanceTime?.unit || 'hours'}
                      onValueChange={(value: 'hours' | 'days' | 'weeks') =>
                        setConfig({
                          ...config,
                          settings: {
                            ...config.settings,
                            minAdvanceTime: {
                              enabled: config.settings?.minAdvanceTime?.enabled || false,
                              value: config.settings?.minAdvanceTime?.value || 1,
                              unit: value,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Não permita agendamentos em cima da hora
                </p>
              </div>

              {/* Max Distance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    <Label>
                      {t('edit.integrations.googleCalendar.maxDistance.title') || 'Distância máxima permitida'}
                    </Label>
                  </div>
                  <Switch
                    checked={config.settings?.maxDistance?.enabled}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          maxDistance: { ...config.settings?.maxDistance, enabled: checked },
                        },
                      })
                    }
                  />
                </div>
                {config.settings?.maxDistance?.enabled && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={config.settings?.maxDistance?.value || 1}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          settings: {
                            ...config.settings,
                            maxDistance: {
                              enabled: config.settings?.maxDistance?.enabled || false,
                              value: parseInt(e.target.value) || 1,
                              unit: config.settings?.maxDistance?.unit || 'weeks',
                            },
                          },
                        })
                      }
                      className="w-24"
                    />
                    <Select
                      value={config.settings?.maxDistance?.unit || 'weeks'}
                      onValueChange={(value: 'days' | 'weeks' | 'months') =>
                        setConfig({
                          ...config,
                          settings: {
                            ...config.settings,
                            maxDistance: {
                              enabled: config.settings?.maxDistance?.enabled || false,
                              value: config.settings?.maxDistance?.value || 1,
                              unit: value,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Limite máximo de dias permitido
                </p>
              </div>

              {/* Max Duration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label>
                    {t('edit.integrations.googleCalendar.maxDuration.title') || 'Duração máxima da agenda'}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={config.settings?.maxDuration?.value || 1}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          maxDuration: {
                            value: parseInt(e.target.value) || 1,
                            unit: config.settings?.maxDuration?.unit || 'hours',
                          },
                        },
                      })
                    }
                    className="w-24"
                  />
                  <Select
                    value={config.settings?.maxDuration?.unit || 'hours'}
                    onValueChange={(value: 'minutes' | 'hours') =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          maxDuration: {
                            value: config.settings?.maxDuration?.value || 1,
                            unit: value,
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Limite tempo para cada agendamento
                </p>
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              {/* Simultaneous Bookings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label>Agendamentos simultâneos</Label>
                  </div>
                  <Switch
                    checked={config.settings?.simultaneousBookings?.enabled}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          simultaneousBookings: {
                            ...config.settings?.simultaneousBookings,
                            enabled: checked,
                          },
                        },
                      })
                    }
                  />
                </div>
                {config.settings?.simultaneousBookings?.enabled && (
                  <div>
                    <Label>Limite de agendamento no mesmo horário</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.settings?.simultaneousBookings?.limit || 1}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          settings: {
                            ...config.settings,
                            simultaneousBookings: {
                              enabled: config.settings?.simultaneousBookings?.enabled || false,
                              limit: parseInt(e.target.value) || 1,
                            },
                          },
                        })
                      }
                      className="w-24"
                    />
                  </div>
                )}
              </div>

              {/* Always Open */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <Label>Sempre aberto</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permite agendamento em qualquer horário
                  </p>
                </div>
                <Switch
                  checked={config.settings?.alwaysOpen}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, alwaysOpen: checked },
                    })
                  }
                />
              </div>

              {/* Business Hours */}
              {!config.settings?.alwaysOpen && (
                <div className="space-y-4">
                  <Label>Horários de atendimento</Label>
                  <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayData = config.settings?.businessHours?.[day];
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 w-32">
                            <input
                              type="checkbox"
                              checked={dayData?.enabled}
                              onChange={(e) => updateBusinessHours(day, 'enabled', e.target.checked)}
                              className="rounded"
                            />
                            <Label className="text-sm capitalize">{t(`edit.integrations.googleCalendar.businessHours.days.${day}`) || day}</Label>
                          </div>
                          {dayData?.enabled && (
                            <>
                              <Input
                                type="time"
                                value={dayData.start}
                                onChange={(e) => updateBusinessHours(day, 'start', e.target.value)}
                                className="w-32"
                              />
                              <span>-</span>
                              <Input
                                type="time"
                                value={dayData.end}
                                onChange={(e) => updateBusinessHours(day, 'end', e.target.value)}
                                className="w-32"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              {/* Google Meet Integration */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Label>Integração com Google Meet</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gerar link do meet ao fazer o agendamento
                  </p>
                </div>
                <Switch
                  checked={config.settings?.meetIntegration}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, meetIntegration: checked },
                    })
                  }
                />
              </div>

              {/* Allow Availability Check */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    <Label>Consulta de horários</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Agente pode consultar horários disponíveis
                  </p>
                </div>
                <Switch
                  checked={config.settings?.allowAvailabilityCheck}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, allowAvailabilityCheck: checked },
                    })
                  }
                />
              </div>

              {/* Distribution Mode */}
              <div className="space-y-3">
                <Label>Modo de distribuição</Label>
                <p className="text-xs text-muted-foreground">
                  Como os agendamentos serão divididos
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      config.settings?.distributionMode === 'sequential'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, distributionMode: 'sequential' },
                      })
                    }
                  >
                    <h4 className="font-semibold mb-1">Distribuir sequencial</h4>
                    <p className="text-xs text-muted-foreground">
                      Os agendamentos são distribuídos entre as agendas alternando entre elas de maneira sequencial.
                    </p>
                  </div>
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      config.settings?.distributionMode === 'intelligent'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, distributionMode: 'intelligent' },
                      })
                    }
                  >
                    <h4 className="font-semibold mb-1">Distribuição Inteligente</h4>
                    <p className="text-xs text-muted-foreground">
                      Seleciona automaticamente a agenda mais apropriada de acordo com a conversa com o cliente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Booking Fields */}
              <div className="space-y-3">
                <Label>Campos para agendamento</Label>
                <div className="space-y-2">
                  {config.settings?.bookingFields?.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getFieldIcon(field.name)}
                        <div>
                          <p className="text-sm font-medium">{field.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {field.name === 'name' && 'Solicitar nome do usuário'}
                            {field.name === 'company' && 'Solicitar nome da empresa'}
                            {field.name === 'subject' && 'Solicitar assunto'}
                            {field.name === 'duration' && 'Quanto tempo vai durar'}
                            {field.name === 'email' && 'Solicitar e-mail para enviar convite na agenda'}
                            {field.name === 'summary' && 'Anexar um resumo da conversa no agendamento'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={field.enabled}
                        onCheckedChange={(checked) => updateBookingField(field.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t">
          {config.connected && (
            <Button onClick={handleSave} className="w-full">
              {t('edit.integrations.googleCalendar.saveConfig') || 'APLICAR CONFIGURAÇÕES'}
            </Button>
          )}

          {onDisconnect && config.connected && (
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive/80"
            >
              {t('edit.integrations.googleCalendar.disconnect') || 'Desconectar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleCalendarConfigDialog;
