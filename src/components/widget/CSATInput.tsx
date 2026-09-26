import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { widgetService } from '@/services/widget/widgetService';

const RATINGS = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '😑' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '😀' },
  { value: 5, emoji: '😍' },
];

interface CSATInputProps {
  messageId: string | number;
  displayType?: 'emoji' | 'star';
  alreadySubmittedRating?: number;
}

export const CSATInput = ({
  messageId,
  displayType = 'emoji',
  alreadySubmittedRating,
}: CSATInputProps) => {
  const { t } = useLanguage('widget');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRating, setSubmittedRating] = useState<number | null>(alreadySubmittedRating ?? null);

  const handleSubmit = async (rating: number) => {
    setError('');
    setIsSubmitting(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) {
        setError(t('csat.error'));
        return;
      }

      await widgetService.updateMessageSubmittedValues(token, messageId, {
        csat_survey_response: { rating },
      });
      setSubmittedRating(rating);
    } catch {
      setError(t('csat.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRating) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>{t('csat.success')}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-center gap-2">
        {RATINGS.map(({ value, emoji }) => (
          <button
            key={value}
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(value)}
            aria-label={t(`csat.ratings.${value}`)}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 text-lg transition-transform hover:scale-110 disabled:opacity-50"
          >
            {displayType === 'star' ? '⭐'.repeat(value) : emoji}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
};
