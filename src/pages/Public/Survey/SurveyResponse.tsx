import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Smile, Meh, Frown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { surveyService } from '@/services/public/surveyService';
import { SurveyDetails } from '@/types/core/survey';
import { Button } from '@evoapi/design-system';

// `label` is already the translated string, not a key: passing it back through
// t() would resolve a second time, and a label carrying the ':' separator would
// come back with everything before it stripped as a namespace.
const getEmojiRatings = (t: any) => [
  { value: 1, icon: Frown, label: t('survey.rating.veryDissatisfied'), color: 'text-red-500' },
  { value: 2, icon: Frown, label: t('survey.rating.dissatisfied'), color: 'text-orange-400' },
  { value: 3, icon: Meh, label: t('survey.rating.neutral'), color: 'text-yellow-500' },
  { value: 4, icon: Smile, label: t('survey.rating.satisfied'), color: 'text-green-400' },
  { value: 5, icon: Smile, label: t('survey.rating.verySatisfied'), color: 'text-green-500' },
];

const SurveyResponse = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const { t, i18n } = useTranslation('survey');

  const [surveyDetails, setSurveyDetails] = useState<SurveyDetails | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveyDetails = async () => {
      if (!uuid) return;

      setIsLoading(true);
      try {
        const result = await surveyService.getSurveyDetails(uuid);
        setSurveyDetails(result);
        setSelectedRating(result.csat_survey_response?.rating || null);
        setFeedbackMessage(result.csat_survey_response?.feedback_message || '');

        // Mudar locale se fornecido
        if (result.locale && i18n.language !== result.locale) {
          i18n.changeLanguage(result.locale);
        }
      } catch (error: any) {
        const message = error?.response?.data?.message || t('survey.api.errorMessage');
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurveyDetails();
  }, [uuid, i18n, t]);

  const handleRatingSelect = async (rating: number) => {
    setSelectedRating(rating);
    if (!uuid) return;

    setIsUpdating(true);
    try {
      await surveyService.updateSurvey(uuid, rating, feedbackMessage);
      setSurveyDetails((prev: any) =>
        prev
          ? {
              ...prev,
              csat_survey_response: {
                rating,
                feedback_message: feedbackMessage,
              },
            }
          : null,
      );
      toast.success(t('survey.rating.successMessage'));
    } catch (error: any) {
      const message = error?.response?.data?.error || t('survey.api.errorMessage');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!uuid || !selectedRating) return;

    setIsUpdating(true);
    try {
      await surveyService.updateSurvey(uuid, selectedRating, feedbackMessage);
      setSurveyDetails((prev: any) =>
        prev
          ? {
              ...prev,
              csat_survey_response: {
                rating: selectedRating,
                feedback_message: feedbackMessage,
              },
            }
          : null,
      );
      toast.success(t('survey.api.successMessage'));
    } catch (error: any) {
      const message = error?.response?.data?.error || t('survey.api.errorMessage');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const isRatingSubmitted = surveyDetails?.csat_survey_response?.rating !== undefined;
  const isFeedbackSubmitted = !!surveyDetails?.csat_survey_response?.feedback_message;
  const isEmojiType = surveyDetails?.display_type === 'emoji';
  const isStarType = surveyDetails?.display_type === 'star';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-lg bg-card rounded-lg shadow-md border border-border">
        <div className="p-8 space-y-6">
          {/* Logo */}
          {surveyDetails?.inbox_avatar_url && (
            <img
              src={surveyDetails.inbox_avatar_url}
              alt={surveyDetails.inbox_name}
              className="h-12 object-contain"
            />
          )}

          {/* Mensagem de erro ou sucesso */}
          {(errorMessage || isRatingSubmitted) && (
            <div
              className={`p-4 rounded-lg ${
                errorMessage
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-green-500/10 text-green-700 dark:text-green-400'
              }`}
            >
              <p className="text-sm font-medium">
                {errorMessage || t('survey.rating.successMessage')}
              </p>
            </div>
          )}

          {/* Mensagem principal */}
          {!isRatingSubmitted && (
            <div>
              <p className="text-lg text-foreground leading-relaxed">
                {surveyDetails?.content ||
                  t('survey.description', { inboxName: surveyDetails?.inbox_name })}
              </p>
            </div>
          )}

          {/* Rating - Emoji Type */}
          {!isRatingSubmitted && isEmojiType && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-4 block">
                {t('survey.rating.label')}
              </label>
              <div className="flex justify-between gap-2">
                {getEmojiRatings(t).map(({ value, icon: Icon, label, color }) => (
                  <button
                    key={value}
                    onClick={() => handleRatingSelect(value)}
                    disabled={isUpdating}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-110 ${
                      selectedRating === value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={label}
                  >
                    <Icon
                      className={`w-8 h-8 ${
                        selectedRating === value ? color : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rating - Star Type */}
          {!isRatingSubmitted && isStarType && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-4 block">
                {t('survey.rating.label')}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    onClick={() => handleRatingSelect(value)}
                    disabled={isUpdating}
                    className={`p-2 rounded-lg transition-all hover:scale-110 ${
                      isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        selectedRating && value <= selectedRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Form */}
          {isRatingSubmitted && !isFeedbackSubmitted && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {t('survey.feedback.label')}
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  placeholder={t('survey.feedback.placeholder')}
                  className="w-full min-h-[100px] p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isUpdating}
                />
              </div>
              <Button
                onClick={handleFeedbackSubmit}
                disabled={isUpdating || !feedbackMessage.trim()}
                className="w-full"
              >
                {isUpdating ? t('survey.api.submitting') : t('survey.feedback.buttonText')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyResponse;
