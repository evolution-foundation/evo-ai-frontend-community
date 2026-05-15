import { useState, useEffect } from 'react';
import { Textarea, Label, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@evoapi/design-system';
import { ArrowRight, ArrowLeft, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { openaiService } from '@/services/integrations/openaiService';
import { toast } from 'sonner';
import PromptGeneratorModal from '@/components/agents/wizard/PromptGeneratorModal';

interface Step5Props {
  data: { instruction: string };
  onChange: (data: { instruction: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step5_Instructions = ({ data, onChange, onNext, onBack }: Step5Props) => {
  const { t } = useLanguage('aiAgents');
  const config = useGlobalConfig();
  const [error, setError] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Check if OpenAI is configured to show AI actions
  const showAIActions = config.openaiConfigured === true;

  useEffect(() => {
    if (data.instruction && data.instruction.trim().length < 10) {
      setError(t('wizard.step5.validationError'));
    } else {
      setError('');
    }
  }, [data.instruction, t]);

  const handleNext = () => {
    if (!data.instruction || data.instruction.trim().length < 10) {
      setError(t('wizard.step5.validationError'));
      return;
    }
    onNext();
  };

  const handleReview = async () => {
    if (!data.instruction || !data.instruction.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillPromptToReview'));
      return;
    }

    setIsReviewing(true);
    try {
      const reviewedPrompt = await openaiService.processEvent({
        type: 'review_prompt',
        content: data.instruction,
      });

      if (reviewedPrompt) {
        onChange({ instruction: reviewedPrompt });
        setError('');
        toast.success(t('wizard.promptGenerator.messages.reviewSuccess'));
      }
    } catch (error) {
      console.error('Error reviewing prompt:', error);
      const errorMessage = error instanceof Error ? error.message : t('wizard.promptGenerator.messages.reviewError');
      toast.error(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-5xl mx-auto py-2 px-4">
      <div className="flex-1 flex flex-col space-y-2 min-h-0">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t('wizard.step5.instructionLabel')} <span className="text-red-500">*</span>
          </Label>
          <TooltipProvider>
            <div className="flex gap-2">
              {data.instruction && data.instruction.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReview}
                      disabled={isReviewing || !showAIActions}
                      aria-disabled={isReviewing || !showAIActions}
                      className="gap-2"
                    >
                      {isReviewing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('wizard.promptGenerator.buttons.reviewing')}
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 text-blue-500" />
                          {t('wizard.promptGenerator.buttons.review')}
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {!showAIActions && (
                    <TooltipContent>
                      <p>{t('wizard.step5.aiNotConfigured')}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptModal(true)}
                    disabled={!showAIActions}
                    aria-disabled={!showAIActions}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    {t('wizard.step5.generateWithAI')}
                  </Button>
                </TooltipTrigger>
                {!showAIActions && (
                  <TooltipContent>
                    <p>{t('wizard.step5.aiNotConfigured')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        <Textarea
          value={data.instruction || ''}
          onChange={(e) => onChange({ instruction: e.target.value })}
          placeholder={t('wizard.step5.instructionPlaceholder')}
          className={`flex-1 text-sm min-h-[160px] ${error ? 'border-red-500' : ''}`}
        />
        <div className="flex justify-between text-xs text-muted-foreground flex-shrink-0">
          <span>{t('wizard.step5.minCharacters')}</span>
          <span>{t('wizard.step5.characterCount', { count: data.instruction?.length || 0 })}</span>
        </div>
        {error && <p className="text-sm text-red-600 flex-shrink-0">{error}</p>}

        <div className="bg-muted/50 p-3 rounded-lg flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            <strong>{t('wizard.step5.tip')}</strong> {t('wizard.step5.tipContent')}
          </p>
        </div>
      </div>

      <div className="flex justify-between flex-shrink-0 pt-2 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('actions.back')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={!data.instruction || !!error}
          className="gap-2 px-6"
        >
          {t('actions.continue')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <PromptGeneratorModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        onGenerated={(prompt) => {
          onChange({ instruction: prompt });
          setError('');
        }}
        initialPrompt={data.instruction}
      />
    </div>
  );
};

export default Step5_Instructions;
