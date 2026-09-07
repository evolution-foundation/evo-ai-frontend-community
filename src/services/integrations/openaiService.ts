import i18n from '@/i18n/config';
import { api } from '@/services/core';
import type { ProcessEventOptions, ProcessEventResponse } from '@/types/integrations';
import { extractData } from '@/utils/apiHelpers';

/**
 * OpenAI service for processing AI events like rephrase, summarize, etc.
 */
class OpenAIService {
  /**
   * Events that operate on entire conversations (not just message content)
   */
  private readonly conversationEvents = ['summarize', 'reply_suggestion', 'label_suggestion'];

  /**
   * Events that operate on message content
   */
  private readonly messageEvents = [
    'rephrase',
    'fix_spelling_grammar',
    'expand',
    'shorten',
    'make_friendly',
    'make_formal',
    'simplify',
    'analyze_sentiment',
    'generate_prompt',
    'review_prompt',
  ];

  /**
   * Processes an AI event using the OpenAI API
   * @param options - Event processing options
   * @returns Promise with the generated message
   */
  async processEvent(
    options: ProcessEventOptions
  ): Promise<string> {
    const { type, content, tone, conversationId, hookId } = options;

    // Build the data payload based on event type
    let data: Record<string, any> = {};

    if (this.conversationEvents.includes(type)) {
      // For conversation events, only send conversation ID
      data = {
        conversation_display_id: conversationId,
      };
    } else if (this.messageEvents.includes(type)) {
      // For message events, send content and optional tone
      data = {
        content,
        tone,
      };
    } else {
      // Unknown event type, send everything
      data = {
        content,
        tone,
        conversation_display_id: conversationId,
      };
    }

    try {
      const endpoint = hookId
        ? `/integrations/hooks/${hookId}/process_event`
        : `/integrations/openai/process_event`;

      const response = await api.post<ProcessEventResponse>(
        endpoint,
        {
          event: {
            name: type,
            data,
          },
        }
      );

      const responseData = extractData<{ message?: string }>(response);
      const message = responseData?.message || response.data?.message;

      if (!message) {
        throw new Error(i18n.t("interface:openaiservice.aiResponseHasNoContent"));
      }

      return message;
    } catch (error: unknown) {
      console.error('[OpenAI Service] Error processing event:', error);

      // Extract error message from response
      const axiosError = error as { response?: { data?: { error?: string | { message?: string } } } };
      const errorData = axiosError.response?.data?.error;

      let errorMessage = i18n.t("chat:aiAssistance.errors.processError");

      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData && typeof errorData === 'object' && 'message' in errorData) {
        errorMessage = errorData.message || errorMessage;
      }

      throw new Error(errorMessage);
    }
  }
}

export const openaiService = new OpenAIService();
