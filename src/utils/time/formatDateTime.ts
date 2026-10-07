import { format } from 'date-fns';
import { getDateFnsLocale } from '@/lib/dateFnsLocale';

export function formatDateTime(dateTimeStr: string, language: string): string {
  try {
    return format(new Date(dateTimeStr), 'P p', { locale: getDateFnsLocale(language) });
  } catch {
    return 'Invalid date';
  }
}
