import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Textarea,
} from '@evoapi/design-system';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { openaiService } from '@/services/integrations/openaiService';
import { useLanguage } from '@/hooks/useLanguage';

interface PromptGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (prompt: string) => void;
  initialPrompt?: string;
}

interface PromptFormData {
  contexto: string;
  objetivo: string;
  estilo: string;
  tom: string;
  audiencia: string;
  formato: string;
  exemplo: string;
  regras: string;
  pontosCriticos: string;
  instrucoesExtras: string;
}

const PromptGeneratorModal = ({
  open,
  onOpenChange,
  onGenerated,
  initialPrompt,
}: PromptGeneratorModalProps) => {
  const { t } = useLanguage('aiAgents');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [formData, setFormData] = useState<PromptFormData>({
    contexto: '',
    objetivo: '',
    estilo: '',
    tom: '',
    audiencia: '',
    formato: '',
    exemplo: '',
    regras: '',
    pontosCriticos: '',
    instrucoesExtras: '',
  });

  const questions = [
    {
      key: 'contexto' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.contexto.label'),
      placeholder: t('wizard.promptGenerator.questions.contexto.placeholder'),
    },
    {
      key: 'objetivo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.objetivo.label'),
      placeholder: t('wizard.promptGenerator.questions.objetivo.placeholder'),
    },
    {
      key: 'estilo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.estilo.label'),
      placeholder: t('wizard.promptGenerator.questions.estilo.placeholder'),
    },
    {
      key: 'tom' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.tom.label'),
      placeholder: t('wizard.promptGenerator.questions.tom.placeholder'),
    },
    {
      key: 'audiencia' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.audiencia.label'),
      placeholder: t('wizard.promptGenerator.questions.audiencia.placeholder'),
    },
    {
      key: 'formato' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.formato.label'),
      placeholder: t('wizard.promptGenerator.questions.formato.placeholder'),
    },
    {
      key: 'exemplo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.exemplo.label'),
      placeholder: t('wizard.promptGenerator.questions.exemplo.placeholder'),
    },
    {
      key: 'regras' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.regras.label'),
      placeholder: t('wizard.promptGenerator.questions.regras.placeholder'),
    },
    {
      key: 'pontosCriticos' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.pontosCriticos.label'),
      placeholder: t('wizard.promptGenerator.questions.pontosCriticos.placeholder'),
    },
    {
      key: 'instrucoesExtras' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.instrucoesExtras.label'),
      placeholder: t('wizard.promptGenerator.questions.instrucoesExtras.placeholder'),
    },
  ];

  const buildPromptContent = (): string => {
    return questions
      .filter(question => formData[question.key])
      .map(question => `${question.label}:\n${formData[question.key]}`)
      .join('\n\n');
  };

  const handleGenerate = async () => {
    const promptContent = buildPromptContent();
    if (!promptContent.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillAtLeastOne'));
      return;
    }

    setIsGenerating(true);
    try {
      const generatedPrompt = await openaiService.processEvent({
        type: 'generate_prompt',
        content: promptContent,
      });

      if (generatedPrompt) {
        onGenerated(generatedPrompt);
        toast.success(t('wizard.promptGenerator.messages.success'));
        onOpenChange(false);
        // Reset form
        setFormData({
          contexto: '',
          objetivo: '',
          estilo: '',
          tom: '',
          audiencia: '',
          formato: '',
          exemplo: '',
          regras: '',
          pontosCriticos: '',
          instrucoesExtras: '',
        });
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('wizard.promptGenerator.messages.error');
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (promptToReview: string) => {
    if (!promptToReview || !promptToReview.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillPromptToReview'));
      return;
    }

    setIsReviewing(true);
    try {
      const reviewedPrompt = await openaiService.processEvent({
        type: 'review_prompt',
        content: promptToReview,
      });

      if (reviewedPrompt) {
        onGenerated(reviewedPrompt);
        toast.success(t('wizard.promptGenerator.messages.reviewSuccess'));
        onOpenChange(false);
        // Reset form
        setFormData({
          contexto: '',
          objetivo: '',
          estilo: '',
          tom: '',
          audiencia: '',
          formato: '',
          exemplo: '',
          regras: '',
          pontosCriticos: '',
          instrucoesExtras: '',
        });
      }
    } catch (error) {
      console.error('Error reviewing prompt:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('wizard.promptGenerator.messages.reviewError');
      toast.error(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t('wizard.promptGenerator.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
          {questions.map(question => (
            <div key={question.key} className="space-y-2">
              <Label className="text-sm font-medium">{question.label}</Label>
              <Textarea
                value={formData[question.key]}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    [question.key]: e.target.value,
                  }))
                }
                placeholder={question.placeholder}
                className="min-h-[80px] text-sm"
                disabled={isGenerating}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating || isReviewing}
          >
            {t('wizard.promptGenerator.buttons.cancel')}
          </Button>
          {initialPrompt && initialPrompt.trim() && (
            <Button
              variant="outline"
              onClick={() => handleReview(initialPrompt)}
              disabled={isGenerating || isReviewing}
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
          )}
          <Button onClick={handleGenerate} disabled={isGenerating || isReviewing} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('wizard.promptGenerator.buttons.generating')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('wizard.promptGenerator.buttons.generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptGeneratorModal;
