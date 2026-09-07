import { getFormattingLocale } from '@/lib/formattingLocale';
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(getFormattingLocale(), {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatSeconds = (value: number) => {
  if (!value || value <= 0) return '0s';
  if (value < 60) return `${Math.round(value)}s`;

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}min ${seconds}s`;
};
