import { parse, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import i18n from '@/i18n/config';

// Types
export interface TimeSlot {
  day: number;
  from: string;
  to: string;
  valid: boolean;
  openAllDay?: boolean;
  // Optional lunch break: when set, the day is worked in two stretches —
  // `from`–`breakFrom` (morning) and `breakTo`–`to` (afternoon) — and
  // (breakFrom, breakTo) is the break itself, when nobody is available.
  hasBreak?: boolean;
  breakFrom?: string;
  breakTo?: string;
  breakValid?: boolean;
}

export interface BusinessHourSlot {
  day_of_week: number;
  closed_all_day: boolean;
  open_hour: number;
  open_minutes: number;
  close_hour: number;
  close_minutes: number;
  open_all_day: boolean;
  // Optional second (open, close) window — the gap between close_* and open_hour_2 is
  // the lunch break. Sent as null (all four) when the day has no break.
  open_hour_2?: number | null;
  open_minutes_2?: number | null;
  close_hour_2?: number | null;
  close_minutes_2?: number | null;
}

export interface TimeZone {
  label: string;
  value: string;
}

// Default time slots for all days (disabled by default)
export const defaultTimeSlot: TimeSlot[] = [
  { day: 0, to: '', from: '', valid: false }, // Sunday
  { day: 1, to: '', from: '', valid: false }, // Monday
  { day: 2, to: '', from: '', valid: false }, // Tuesday
  { day: 3, to: '', from: '', valid: false }, // Wednesday
  { day: 4, to: '', from: '', valid: false }, // Thursday
  { day: 5, to: '', from: '', valid: false }, // Friday
  { day: 6, to: '', from: '', valid: false }, // Saturday
];

// Day names mapping
export const getDayNames = (): Record<number, string> => ({
  0: i18n.t('channels:settings.businessHours.days.sunday'),
  1: i18n.t('channels:settings.businessHours.days.monday'),
  2: i18n.t('channels:settings.businessHours.days.tuesday'),
  3: i18n.t('channels:settings.businessHours.days.wednesday'),
  4: i18n.t('channels:settings.businessHours.days.thursday'),
  5: i18n.t('channels:settings.businessHours.days.friday'),
  6: i18n.t('channels:settings.businessHours.days.saturday'),
});

// Generate time slots (24h format, e.g. "08:00", "13:30") with specified step (in minutes)
export const generateTimeSlots = (step = 30): string[] => {
  const slots: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  return slots;
};

// Convert hour and minute to a 24h time string (e.g. "08:00", "17:30")
export const getTime = (hour: number, minute: number): string => {
  const parsedHour = hour < 10 ? `0${hour}` : `${hour}`;
  const parsedMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${parsedHour}:${parsedMinute}`;
};

// Parse business hours from API format to UI format
export const timeSlotParse = (timeSlots: BusinessHourSlot[]): TimeSlot[] => {
  return timeSlots.map(slot => {
    const {
      day_of_week: day,
      open_hour: openHour,
      open_minutes: openMinutes,
      close_hour: closeHour,
      close_minutes: closeMinutes,
      closed_all_day: closedAllDay,
      open_all_day: openAllDay,
      open_hour_2: openHour2,
      open_minutes_2: openMinutes2,
      close_hour_2: closeHour2,
      close_minutes_2: closeMinutes2,
    } = slot;

    const hasBreak = !closedAllDay && openHour2 != null && openMinutes2 != null && closeHour2 != null && closeMinutes2 != null;

    const from = closedAllDay ? '' : getTime(openHour, openMinutes);
    // With a break, the day's real end is close_hour_2 and close_hour/close_minutes
    // mark where the break starts instead of where the day ends.
    const to = closedAllDay ? '' : getTime(hasBreak ? (closeHour2 as number) : closeHour, hasBreak ? (closeMinutes2 as number) : closeMinutes);
    const breakFrom = hasBreak ? getTime(closeHour, closeMinutes) : undefined;
    const breakTo = hasBreak ? getTime(openHour2 as number, openMinutes2 as number) : undefined;

    return {
      day,
      to,
      from,
      valid: !closedAllDay,
      openAllDay,
      hasBreak,
      breakFrom,
      breakTo,
      breakValid: hasBreak ? validateBreakSlot(from, breakFrom, breakTo, to) : undefined,
    };
  });
};

// Transform UI format to API format
export const timeSlotTransform = (timeSlots: TimeSlot[]): BusinessHourSlot[] => {
  return timeSlots.map(slot => {
    const closed = slot.openAllDay ? false : !(slot.to && slot.from);
    const openAllDay = slot.openAllDay || false;
    const hasBreak = !openAllDay && Boolean(slot.hasBreak && slot.breakFrom && slot.breakTo);
    let openHour = 0;
    let openMinutes = 0;
    let closeHour = 0;
    let closeMinutes = 0;
    let openHour2: number | null = null;
    let openMinutes2: number | null = null;
    let closeHour2: number | null = null;
    let closeMinutes2: number | null = null;

    if (!closed && slot.from && slot.to) {
      openHour = getHours(parse(slot.from, 'HH:mm', new Date()));
      openMinutes = getMinutes(parse(slot.from, 'HH:mm', new Date()));

      if (hasBreak && slot.breakFrom && slot.breakTo) {
        // close_* marks the START of the break; open_*_2/close_*_2 is the afternoon
        // stretch that ends at the day's real "to".
        closeHour = getHours(parse(slot.breakFrom, 'HH:mm', new Date()));
        closeMinutes = getMinutes(parse(slot.breakFrom, 'HH:mm', new Date()));
        openHour2 = getHours(parse(slot.breakTo, 'HH:mm', new Date()));
        openMinutes2 = getMinutes(parse(slot.breakTo, 'HH:mm', new Date()));
        closeHour2 = getHours(parse(slot.to, 'HH:mm', new Date()));
        closeMinutes2 = getMinutes(parse(slot.to, 'HH:mm', new Date()));
      } else {
        closeHour = getHours(parse(slot.to, 'HH:mm', new Date()));
        closeMinutes = getMinutes(parse(slot.to, 'HH:mm', new Date()));
      }
    }

    return {
      day_of_week: slot.day,
      closed_all_day: closed,
      open_hour: openHour,
      open_minutes: openMinutes,
      close_hour: closeHour,
      close_minutes: closeMinutes,
      open_all_day: openAllDay,
      open_hour_2: openHour2,
      open_minutes_2: openMinutes2,
      close_hour_2: closeHour2,
      close_minutes_2: closeMinutes2,
    };
  });
};

// Validate time slot (from must be before to)
export const validateTimeSlot = (from: string, to: string): boolean => {
  if (!from || !to) return false;

  try {
    const fromDate = parse(from, 'HH:mm', new Date());
    const toDate = parse(to, 'HH:mm', new Date());

    // Special case for midnight (next day)
    if (to === '00:00') return true;

    return differenceInMinutes(toDate, fromDate) > 0;
  } catch {
    return false;
  }
};

// Validate a lunch break: from < breakFrom < breakTo < to, all on the same day.
export const validateBreakSlot = (from?: string, breakFrom?: string, breakTo?: string, to?: string): boolean => {
  if (!from || !breakFrom || !breakTo || !to) return false;
  if (!validateTimeSlot(breakFrom, breakTo)) return false;

  try {
    const fromDate = parse(from, 'HH:mm', new Date());
    const breakFromDate = parse(breakFrom, 'HH:mm', new Date());
    const breakToDate = parse(breakTo, 'HH:mm', new Date());
    const toDate = to === '00:00' ? parse('23:59', 'HH:mm', new Date()) : parse(to, 'HH:mm', new Date());

    return differenceInMinutes(breakFromDate, fromDate) > 0 && differenceInMinutes(toDate, breakToDate) > 0;
  } catch {
    return false;
  }
};

// Calculate total hours for a time slot (subtracts the lunch break, if any)
export const calculateTotalHours = (timeSlot: TimeSlot): number => {
  if (timeSlot.openAllDay) return 24;

  if (!timeSlot.from || !timeSlot.to || !timeSlot.valid) return 0;

  try {
    const fromDate = parse(timeSlot.from, 'HH:mm', new Date());
    const toDate = parse(timeSlot.to, 'HH:mm', new Date());

    let totalMinutes: number;
    // Handle midnight as next day
    if (timeSlot.to === '00:00') {
      const nextDayMidnight = new Date(toDate);
      nextDayMidnight.setDate(nextDayMidnight.getDate() + 1);
      totalMinutes = differenceInMinutes(nextDayMidnight, fromDate);
    } else {
      totalMinutes = Math.max(0, differenceInMinutes(toDate, fromDate));
    }

    if (timeSlot.hasBreak && timeSlot.breakValid && timeSlot.breakFrom && timeSlot.breakTo) {
      const breakFromDate = parse(timeSlot.breakFrom, 'HH:mm', new Date());
      const breakToDate = parse(timeSlot.breakTo, 'HH:mm', new Date());
      totalMinutes -= Math.max(0, differenceInMinutes(breakToDate, breakFromDate));
    }

    return Math.max(0, totalMinutes / 60);
  } catch {
    return 0;
  }
};

// Timezone data (simplified for Brazil-focused app)
export const getTimeZoneOptions = (): TimeZone[] => [
  { label: i18n.t('channels:settings.businessHours.timezones.brasilia'), value: 'America/Sao_Paulo' },
  { label: i18n.t('channels:settings.businessHours.timezones.acre'), value: 'America/Rio_Branco' },
  { label: i18n.t('channels:settings.businessHours.timezones.manaus'), value: 'America/Manaus' },
  { label: i18n.t('channels:settings.businessHours.timezones.fernandoDeNoronha'), value: 'America/Noronha' },
  { label: i18n.t('channels:settings.businessHours.timezones.utc'), value: 'UTC' },
  { label: i18n.t('channels:settings.businessHours.timezones.easternTime'), value: 'America/New_York' },
  { label: i18n.t('channels:settings.businessHours.timezones.centralTime'), value: 'America/Chicago' },
  { label: i18n.t('channels:settings.businessHours.timezones.mountainTime'), value: 'America/Denver' },
  { label: i18n.t('channels:settings.businessHours.timezones.pacificTime'), value: 'America/Los_Angeles' },
  { label: i18n.t('channels:settings.businessHours.timezones.london'), value: 'Europe/London' },
  { label: i18n.t('channels:settings.businessHours.timezones.paris'), value: 'Europe/Paris' },
  { label: i18n.t('channels:settings.businessHours.timezones.tokyo'), value: 'Asia/Tokyo' },
];

export const getDefaultTimezone = (): TimeZone => ({
  label: i18n.t('channels:settings.businessHours.timezones.brasilia'),
  value: 'America/Sao_Paulo',
});
