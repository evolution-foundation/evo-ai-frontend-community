import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@evoapi/design-system';
import { Clock, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import BusinessDay from './BusinessDay';
import GlobalTemplateSelect from './GlobalTemplateSelect';
import {
  TimeSlot,
  TimeZone,
  BusinessHourSlot,
  defaultTimeSlot,
  getDayNames,
  timeSlotParse,
  timeSlotTransform,
  getTimeZoneOptions,
  getDefaultTimezone,
} from './helpers/businessHours';

interface BusinessHoursFormProps {
  inboxId: string;
  workingHoursEnabled?: boolean;
  outOfOfficeMessage?: string;
  outOfOfficeMessageTemplateId?: string | null;
  workingHours?: unknown[];
  timezone?: string;
  onUpdate?: (data: {
    working_hours_enabled: boolean;
    out_of_office_message: string;
    out_of_office_message_template_id: string | null;
    working_hours: unknown[];
    timezone: string;
  }) => Promise<void>;
}

export default function BusinessHoursForm({
  workingHoursEnabled = false,
  outOfOfficeMessage = '',
  outOfOfficeMessageTemplateId = null,
  workingHours = [],
  timezone,
  onUpdate,
}: BusinessHoursFormProps) {
  const { t } = useLanguage('channels');
  const defaultTz = getDefaultTimezone();
  const [isBusinessHoursEnabled, setIsBusinessHoursEnabled] = useState(workingHoursEnabled);
  const [unavailableMessage, setUnavailableMessage] = useState(outOfOfficeMessage);
  const [templateId, setTemplateId] = useState<string | null>(outOfOfficeMessageTemplateId);
  const [useTemplate, setUseTemplate] = useState(!!outOfOfficeMessageTemplateId);
  const [selectedTimeZone, setSelectedTimeZone] = useState<TimeZone>(defaultTz);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(defaultTimeSlot);
  const [isUpdating, setIsUpdating] = useState(false);
  const dayNames = getDayNames();
  const timeZoneOptions = getTimeZoneOptions();

  // Initialize data when props change
  useEffect(() => {
    setIsBusinessHoursEnabled(workingHoursEnabled);
    setUnavailableMessage(outOfOfficeMessage || '');
    setTemplateId(outOfOfficeMessageTemplateId ?? null);
    if (outOfOfficeMessageTemplateId) setUseTemplate(true);

    // Parse working hours from API format
    const slots =
      workingHours && workingHours.length > 0
        ? timeSlotParse(workingHours as BusinessHourSlot[])
        : defaultTimeSlot;
    setTimeSlots(slots);

    // Find timezone
    const tzOptions = getTimeZoneOptions();
    const foundTimeZone = tzOptions.find(tz => tz.value === timezone);
    setSelectedTimeZone(foundTimeZone || getDefaultTimezone());
  }, [workingHoursEnabled, outOfOfficeMessage, outOfOfficeMessageTemplateId, workingHours, timezone]);

  // Check if there are validation errors
  const hasErrors = timeSlots.some(slot => slot.from && slot.to && !slot.valid);

  // Handle time slot updates
  const handleSlotUpdate = useCallback((dayIndex: number, updatedSlot: TimeSlot) => {
    setTimeSlots(prev => prev.map(slot => (slot.day === dayIndex ? updatedSlot : slot)));
  }, []);

  // Handle form submission
  const handleUpdate = async () => {
    if (isBusinessHoursEnabled && hasErrors) {
      toast.error(t('settings.businessHours.validation.fixErrors'));
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        working_hours_enabled: isBusinessHoursEnabled,
        out_of_office_message: unavailableMessage,
        out_of_office_message_template_id: useTemplate ? templateId : null,
        working_hours: timeSlotTransform(timeSlots),
        timezone: selectedTimeZone.value,
      };

      if (onUpdate) {
        await onUpdate(updateData);
      }

      toast.success(t('settings.businessHours.success.updated'));
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error(t('settings.businessHours.errors.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <Clock className="w-5 h-5 text-orange-700 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t('settings.businessHours.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('settings.businessHours.description')}
              </p>
            </div>
          </div>

          <div className="space-y-6 mt-6">
            {/* Enable Business Hours Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t('settings.businessHours.enable.label')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.businessHours.enable.description')}
                </p>
              </div>
              <Switch
                checked={isBusinessHoursEnabled}
                onCheckedChange={setIsBusinessHoursEnabled}
              />
            </div>

            {/* Business Hours Configuration */}
            {isBusinessHoursEnabled && (
              <div className="space-y-6">
                {/* Unavailable Message */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        {t('settings.businessHours.useTemplate.label')}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.businessHours.useTemplate.description')}
                      </p>
                    </div>
                    <Switch
                      checked={useTemplate}
                      onCheckedChange={checked => {
                        setUseTemplate(checked);
                        if (!checked) setTemplateId(null);
                      }}
                    />
                  </div>

                  {useTemplate ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {t('settings.businessHours.template.label')}
                      </label>
                      <GlobalTemplateSelect
                        value={templateId}
                        onChange={setTemplateId}
                        placeholder={t('settings.businessHours.template.placeholder')}
                        emptyText={t('settings.businessHours.template.empty')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('settings.businessHours.template.help')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        {t('settings.businessHours.unavailableMessage.label')}
                      </label>
                      <Textarea
                        value={unavailableMessage}
                        onChange={e => setUnavailableMessage(e.target.value)}
                        placeholder={t('settings.businessHours.unavailableMessage.placeholder')}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('settings.businessHours.unavailableMessage.help')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timezone Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    {t('settings.businessHours.timezone.label')}
                  </label>
                  <Select
                    value={selectedTimeZone.value}
                    onValueChange={value => {
                      const timezone = timeZoneOptions.find(tz => tz.value === value);
                      if (timezone) setSelectedTimeZone(timezone);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('settings.businessHours.timezone.placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZoneOptions.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Weekly Schedule */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">
                      {t('settings.businessHours.weekSchedule.label')}
                    </label>
                    {hasErrors && (
                      <div className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">
                          {t('settings.businessHours.validation.hasErrors')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border border-border rounded-lg">
                    {timeSlots.map(timeSlot => (
                      <BusinessDay
                        key={timeSlot.day}
                        dayName={dayNames[timeSlot.day]}
                        timeSlot={timeSlot}
                        onUpdate={updatedSlot => handleSlotUpdate(timeSlot.day, updatedSlot)}
                      />
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                      {t('settings.businessHours.info.title')}
                    </h6>
                    <div className="text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• {t('settings.businessHours.info.point1')}</p>
                      <p>• {t('settings.businessHours.info.point2')}</p>
                      <p>• {t('settings.businessHours.info.point3')}</p>
                      <p>• {t('settings.businessHours.info.point4')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Disabled State Message */}
            {!isBusinessHoursEnabled && (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h5 className="font-medium text-foreground mb-1">
                  {t('settings.businessHours.disabled.title')}
                </h5>
                <p className="text-sm text-muted-foreground">
                  {t('settings.businessHours.disabled.description')}
                </p>
              </div>
            )}
          </div>

          {/* Update Button */}
          <div className="flex justify-end pt-4 mt-6 border-t border-border">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating || (isBusinessHoursEnabled && hasErrors)}
              className="min-w-32"
            >
              {isUpdating
                ? t('settings.businessHours.buttons.updating')
                : t('settings.businessHours.buttons.update')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
