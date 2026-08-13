import { useMemo } from 'react';
import { Checkbox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { Minus } from 'lucide-react';
import { TimeSlot, generateTimeSlots, validateTimeSlot, validateBreakSlot, calculateTotalHours } from './helpers/businessHours';
import { useLanguage } from '@/hooks/useLanguage';

interface BusinessDayProps {
  dayName: string;
  timeSlot: TimeSlot;
  onUpdate: (timeSlot: TimeSlot) => void;
}

export default function BusinessDay({ dayName, timeSlot, onUpdate }: BusinessDayProps) {
  const { t } = useLanguage('channels');
  // Generate time slots
  const fromTimeSlots = useMemo(() => generateTimeSlots(30), []);
  const toTimeSlots = useMemo(() => fromTimeSlots.filter(slot => slot !== '00:00'), [fromTimeSlots]);

  const isDayEnabled = Boolean(timeSlot.from && timeSlot.to);
  const hasError = !timeSlot.valid && isDayEnabled;
  const hasBreakError = Boolean(timeSlot.hasBreak) && timeSlot.breakValid === false;
  const totalHours = calculateTotalHours(timeSlot);

  const handleDayToggle = (checked: boolean) => {
    if (checked) {
      // Enable day with default hours (09:00 to 17:00)
      onUpdate({
        ...timeSlot,
        from: '09:00',
        to: '17:00',
        valid: true,
        openAllDay: false,
      });
    } else {
      // Disable day
      onUpdate({
        ...timeSlot,
        from: '',
        to: '',
        valid: false,
        openAllDay: false,
      });
    }
  };

  const handleOpenAllDayToggle = (checked: boolean) => {
    if (checked) {
      // Set to 24 hours — a full day has no lunch break to configure
      onUpdate({
        ...timeSlot,
        from: '00:00',
        to: '23:59',
        valid: true,
        openAllDay: true,
        hasBreak: false,
        breakFrom: undefined,
        breakTo: undefined,
        breakValid: undefined,
      });
    } else {
      // Set to default business hours
      onUpdate({
        ...timeSlot,
        from: '09:00',
        to: '17:00',
        valid: true,
        openAllDay: false,
      });
    }
  };

  const handleFromTimeChange = (value: string) => {
    const valid = validateTimeSlot(value, timeSlot.to);
    const breakValid = timeSlot.hasBreak ? validateBreakSlot(value, timeSlot.breakFrom, timeSlot.breakTo, timeSlot.to) : undefined;
    onUpdate({
      ...timeSlot,
      from: value,
      valid,
      breakValid,
    });
  };

  const handleToTimeChange = (value: string) => {
    const valid = validateTimeSlot(timeSlot.from, value);
    const breakValid = timeSlot.hasBreak ? validateBreakSlot(timeSlot.from, timeSlot.breakFrom, timeSlot.breakTo, value) : undefined;
    onUpdate({
      ...timeSlot,
      to: value,
      valid,
      breakValid,
    });
  };

  const handleBreakToggle = (checked: boolean) => {
    if (checked) {
      onUpdate({
        ...timeSlot,
        hasBreak: true,
      });
    } else {
      onUpdate({
        ...timeSlot,
        hasBreak: false,
        breakFrom: undefined,
        breakTo: undefined,
        breakValid: undefined,
      });
    }
  };

  const handleBreakFromChange = (value: string) => {
    const breakValid = validateBreakSlot(timeSlot.from, value, timeSlot.breakTo, timeSlot.to);
    onUpdate({
      ...timeSlot,
      breakFrom: value,
      breakValid,
    });
  };

  const handleBreakToChange = (value: string) => {
    const breakValid = validateBreakSlot(timeSlot.from, timeSlot.breakFrom, value, timeSlot.to);
    onUpdate({
      ...timeSlot,
      breakTo: value,
      breakValid,
    });
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border min-h-[3rem]">
      {/* Day Enable Checkbox */}
      <div className="flex items-center">
        <Checkbox
          checked={isDayEnabled}
          onCheckedChange={handleDayToggle}
          aria-label={t('settings.businessDay.enableDay', { day: dayName })}
        />
      </div>

      {/* Day Name */}
      <div className="flex items-center py-0 px-3 text-sm font-medium flex-shrink-0 min-w-28">
        <span>{dayName}</span>
      </div>

      {/* Time Configuration */}
      {isDayEnabled ? (
        <div className="flex flex-col flex-1">
          {/* Time Controls */}
          <div className="flex items-center gap-4">
            {/* Open All Day Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={timeSlot.openAllDay || false}
                onCheckedChange={handleOpenAllDayToggle}
                aria-label={t('settings.businessDay.open24Hours')}
              />
              <span className="text-sm font-medium whitespace-nowrap">{t('settings.businessDay.twentyFourHours')}</span>
            </div>

            {/* From Time */}
            <Select value={timeSlot.from} onValueChange={handleFromTimeChange} disabled={timeSlot.openAllDay}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('settings.businessDay.startPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {fromTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Separator */}
            <div className="flex items-center px-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* To Time */}
            <Select value={timeSlot.to} onValueChange={handleToTimeChange} disabled={timeSlot.openAllDay}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('settings.businessDay.endPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {toTimeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lunch Break Toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={timeSlot.hasBreak || false}
                onCheckedChange={handleBreakToggle}
                disabled={timeSlot.openAllDay}
                aria-label={t('settings.businessDay.lunchBreak')}
              />
              <span className="text-sm font-medium whitespace-nowrap">{t('settings.businessDay.lunchBreak')}</span>
            </div>
          </div>

          {/* Error Message */}
          {hasError && (
            <div className="pt-2">
              <span className="text-xs text-red-500">
                {t('settings.businessDay.timeError')}
              </span>
            </div>
          )}

          {/* Lunch Break Controls */}
          {timeSlot.hasBreak && !timeSlot.openAllDay && (
            <div className="flex flex-col pt-3 mt-3 border-t border-dashed border-border">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap min-w-28">
                  {t('settings.businessDay.breakLabel')}
                </span>

                <Select value={timeSlot.breakFrom || ''} onValueChange={handleBreakFromChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('settings.businessDay.startPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {fromTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center px-2">
                  <Minus className="h-4 w-4 text-muted-foreground" />
                </div>

                <Select value={timeSlot.breakTo || ''} onValueChange={handleBreakToChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={t('settings.businessDay.endPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {toTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasBreakError && (
                <div className="pt-2">
                  <span className="text-xs text-red-500">
                    {t('settings.businessDay.breakTimeError')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Disabled State */
        <div className="flex items-center flex-1 text-sm text-muted-foreground">
          <span>{t('settings.businessDay.unavailable')}</span>
        </div>
      )}

      {/* Hours Badge */}
      <div className="flex-shrink-0">
        {isDayEnabled && !hasError && (
          <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg whitespace-nowrap">
            {totalHours}h
          </span>
        )}
      </div>
    </div>
  );
}
