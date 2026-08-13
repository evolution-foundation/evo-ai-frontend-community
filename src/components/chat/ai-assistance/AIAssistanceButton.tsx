import React, { useEffect, useState } from 'react';
import { Button } from '@evoapi/design-system/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { useLanguage } from '@/hooks/useLanguage';
import { openaiService } from '@/services/integrations/openaiService';
import { integrationsService } from '@/services/integrations';
import AIActionsModal from './AIActionsModal';
import AIResultModal from './AIResultModal';
import { AI_ACTIONS, AI_ACTIONS_NO_DRAFT, AIActionType } from '@/types/chat/ai-assistance';
import { hasVisibleMessageContent } from '@/utils/chat/aiAssistanceMessage';

interface AIAssistanceButtonProps {
  currentMessage?: string;
  onApplyText: (text: string) => void;
  disabled?: boolean;
  conversationId?: string;
  /** Lets the composer's mobile "+" menu open this via getElementById(...).click(). */
  triggerId?: string;
}

const AIAssistanceButton: React.FC<AIAssistanceButtonProps> = ({
  currentMessage = '',
  onApplyText,
  disabled = false,
  conversationId,
  triggerId,
}) => {
  const { t } = useLanguage('chat');
  const config = useGlobalConfig();
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIActionType | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [openAIHookId, setOpenAIHookId] = useState<string | null>(null);
  const [isHookChecked, setIsHookChecked] = useState(false);

  useEffect(() => {
    let active = true;

    if (config.openaiConfigured) {
      setIsHookChecked(true);
      return () => {
        active = false;
      };
    }

    integrationsService
      .getOpenAIHook()
      .then(hook => {
        if (!active || !hook) return;
        if (hook.status !== false && String(hook.status) !== 'disabled') {
          setOpenAIHookId(hook.id);
        }
      })
      .catch(() => {
        setOpenAIHookId(null);
      })
      .finally(() => {
        if (active) {
          setIsHookChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, [config.openaiConfigured]);

  const hasMessage = hasVisibleMessageContent(currentMessage);
  const availableActions = hasMessage ? AI_ACTIONS : AI_ACTIONS_NO_DRAFT;
  const isOpenAIAvailable = config.openaiConfigured || !!openAIHookId;

  // Keep compatibility with global config while also supporting account-level OpenAI hooks.
  if (!isOpenAIAvailable && isHookChecked) {
    return null;
  }

  const handleOpenActions = () => {
    setShowActionsModal(true);
  };

  const handleSelectAction = async (actionType: AIActionType) => {
    setSelectedAction(actionType);
    setShowResultModal(true);
    setIsGenerating(true);
    setGeneratedContent('');

    try {
      // Call the real OpenAI API
      const result = await openaiService.processEvent({
        type: actionType,
        content: currentMessage,
        conversationId: conversationId,
        hookId: openAIHookId || undefined,
      });

      // Format result for sentiment analysis
      if (actionType === 'analyze_sentiment' && result) {
        try {
          // Result is a JSON string from backend (wrapped in { message: "..." })
          // The openaiService already extracts response.data.message
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          if (
            parsed &&
            typeof parsed === 'object' &&
            ('offensive' in parsed || 'confidence' in parsed)
          ) {
            const formatted =
              `Sentiment Analysis Result:\n\n` +
              `Offensive: ${parsed.offensive ? 'Yes' : 'No'}\n` +
              `Confidence: ${((parsed.confidence || 0) * 100).toFixed(1)}%\n` +
              `Reason: ${parsed.reason || 'No reason provided'}`;
            setGeneratedContent(formatted);
          } else {
            setGeneratedContent(result);
          }
        } catch {
          // If parsing fails, use raw result
          setGeneratedContent(result);
        }
      } else {
        setGeneratedContent(result);
      }
    } catch (error: unknown) {
      console.error('Error processing AI action:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('aiAssistance.errors.processError');
      toast.error(errorMessage);
      setShowResultModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedContent) {
      onApplyText(generatedContent);
      setShowResultModal(false);
      setGeneratedContent('');
      setSelectedAction(null);
      toast.success(t('aiAssistance.messages.textAppliedSuccess'));
    }
  };

  const handleCloseResult = () => {
    setShowResultModal(false);
    setGeneratedContent('');
    setSelectedAction(null);
  };

  const getActionLabel = () => {
    if (!selectedAction) return t('aiAssistance.button.fallbackLabel');
    return t(`aiAssistance.actions.${selectedAction}.label`);
  };

  return (
    <>
      <Button
        id={triggerId}
        variant="ghost"
        size="icon"
        disabled={disabled}
        // Hidden below md: folds into the composer's "+" menu on phones instead
        // (see MessageInput) — opened via triggerId, same reasoning as MacrosButton.
        className="hidden md:inline-flex h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
        onClick={handleOpenActions}
        title={t('aiAssistance.button.title')}
      >
        <Sparkles className="h-5 w-5 text-primary" />
      </Button>

      <AIActionsModal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        onSelectAction={handleSelectAction}
        actions={availableActions}
        hasMessage={hasMessage}
      />

      <AIResultModal
        isOpen={showResultModal}
        onClose={handleCloseResult}
        onApply={handleApply}
        originalMessage={hasMessage ? currentMessage : undefined}
        generatedMessage={generatedContent}
        isLoading={isGenerating}
        actionLabel={getActionLabel()}
      />
    </>
  );
};

export default AIAssistanceButton;
