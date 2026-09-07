import { useLanguage } from '@/hooks/useLanguage';
import { FormField, FormTextarea, FormSwitch } from '@/components/shared/forms';
import type { IntegrationFormProps } from '@/types/integrations/forms';

export function OpenAIForm({ config, onConfigChange, isExpanded }: IntegrationFormProps) {
  const { t } = useLanguage('integrations');

  const getValue = (key: string, defaultValue = '') => {
    const value = config[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  const getBoolean = (key: string, defaultValue = false) => {
    const value = config[key];
    return typeof value === 'boolean' ? value : defaultValue;
  };

  return (
    <div className="space-y-4">
      {/* Configurações básicas sempre visíveis */}
      <div className="space-y-4">
        <FormField
          id="OPENAI_API_URL"
          label={t("openai.apiUrl")}
          value={getValue('openaiApiUrl', 'https://api.openai.com/v1')}
          onChange={(value) => onConfigChange('openaiApiUrl', value)}
          placeholder={t("openai.placeholders.apiUrl")}
          type="url"
        />
        <FormField
          id="OPENAI_API_KEY"
          label={t("openai.apiKey")}
          value={getValue('openaiApiKey')}
          onChange={(value) => onConfigChange('openaiApiKey', value)}
          placeholder={t("openai.placeholders.apiKey")}
          type="password"
        />
        <FormField
          id="OPENAI_MODEL"
          label={t("openai.model")}
          value={getValue('openaiModel', 'gpt-4-turbo')}
          onChange={(value) => onConfigChange('openaiModel', value)}
          placeholder={t("openai.placeholders.model")}
        />
        <FormSwitch
          id="OPENAI_ENABLE_AUDIO_TRANSCRIPTION"
          label={t("openai.enableAudioTranscription")}
          checked={getBoolean('openaiEnableAudioTranscription', false)}
          onCheckedChange={(checked) => onConfigChange('openaiEnableAudioTranscription', checked)}
          description={t("openai.enableAudioTranscriptionDescription")}
        />
      </div>

      {/* Seção de Prompts Personalizados */}
      <div className="border-t pt-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2">{t("openai.customPrompts")}</h4>
          <p className="text-xs text-muted-foreground">{t("openai.customPromptsDescription")}</p>
        </div>

        <div className={isExpanded ? "grid grid-cols-2 gap-4" : "space-y-3 max-h-64 overflow-y-auto"}>
          <FormTextarea
            id="OPENAI_PROMPT_REPLY"
            label={t("openai.prompts.reply")}
            value={getValue('openaiPromptReply', "Please suggest a reply to the following conversation between support agents and customer. Don't expose that you are an AI model, respond \"Couldn't generate the reply\" in cases where you can't answer. Reply in the user's language.")}
            onChange={(value) => onConfigChange('openaiPromptReply', value)}
            placeholder={t("openai.placeholders.reply")}
            className={isExpanded ? "min-h-[120px] text-sm" : "min-h-[60px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_SUMMARY"
            label={t("openai.prompts.summary")}
            value={getValue('openaiPromptSummary', "Please summarize the key points from the following conversation between support agents and customer as bullet points for the next support agent looking into the conversation. Reply in the user's language.")}
            onChange={(value) => onConfigChange('openaiPromptSummary', value)}
            placeholder={t("openai.placeholders.summary")}
            className={isExpanded ? "min-h-[120px] text-sm" : "min-h-[60px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_REPHRASE"
            label={t("openai.prompts.rephrase")}
            value={getValue('openaiPromptRephrase', "You are a helpful support agent. Please rephrase the following response. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptRephrase', value)}
            placeholder={t("openai.placeholders.rephrase")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_FIX_GRAMMAR"
            label={t("openai.prompts.fixGrammar")}
            value={getValue('openaiPromptFixGrammar', "You are a helpful support agent. Please fix the spelling and grammar of the following response. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptFixGrammar', value)}
            placeholder={t("openai.placeholders.fixGrammar")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_SHORTEN"
            label={t("openai.prompts.shorten")}
            value={getValue('openaiPromptShorten', "You are a helpful support agent. Please shorten the following response. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptShorten', value)}
            placeholder={t("openai.placeholders.shorten")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_EXPAND"
            label={t("openai.prompts.expand")}
            value={getValue('openaiPromptExpand', "You are a helpful support agent. Please expand the following response. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptExpand', value)}
            placeholder={t("openai.placeholders.expand")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_FRIENDLY"
            label={t("openai.prompts.friendly")}
            value={getValue('openaiPromptFriendly', "You are a helpful support agent. Please make the following response more friendly. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptFriendly', value)}
            placeholder={t("openai.placeholders.friendly")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_FORMAL"
            label={t("openai.prompts.formal")}
            value={getValue('openaiPromptFormal', "You are a helpful support agent. Please make the following response more formal. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptFormal', value)}
            placeholder={t("openai.placeholders.formal")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_SIMPLIFY"
            label={t("openai.prompts.simplify")}
            value={getValue('openaiPromptSimplify', "You are a helpful support agent. Please simplify the following response. Ensure that the reply should be in user language.")}
            onChange={(value) => onConfigChange('openaiPromptSimplify', value)}
            placeholder={t("openai.placeholders.simplify")}
            className={isExpanded ? "min-h-[100px] text-sm" : "min-h-[50px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_SENTIMENT_ANALYSIS"
            label={t("openai.prompts.sentimentAnalysis")}
            value={getValue('openaiPromptSentimentAnalysis', "Analyze the following Facebook comment and determine if it contains offensive, inappropriate, or harmful content. Respond with JSON: {\"offensive\": true/false, \"confidence\": 0.0-1.0, \"reason\": \"brief explanation\"}. Reply in the user's language.")}
            onChange={(value) => onConfigChange('openaiPromptSentimentAnalysis', value)}
            placeholder={t("openai.placeholders.sentimentAnalysis")}
            className={isExpanded ? "min-h-[120px] text-sm" : "min-h-[60px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_GENERATE_PROMPT"
            label={t("openai.prompts.generatePrompt")}
            value={getValue('openaiPromptGeneratePrompt', "You are an expert prompt engineer. Based on the user's description or context provided, generate a well-structured, effective prompt that can be used for AI interactions. The prompt should be clear, specific, and actionable. Ensure that the generated prompt is in the user's language.")}
            onChange={(value) => onConfigChange('openaiPromptGeneratePrompt', value)}
            placeholder={t("openai.placeholders.generatePrompt")}
            className={isExpanded ? "min-h-[120px] text-sm" : "min-h-[60px] text-xs"}
          />
          <FormTextarea
            id="OPENAI_PROMPT_REVIEW_PROMPT"
            label={t("openai.prompts.reviewPrompt")}
            value={getValue('openaiPromptReviewPrompt', "You are an expert prompt reviewer and optimizer. Review the provided prompt and generate an improved, optimized version. The improved prompt should be clearer, more specific, more actionable, and follow best practices for prompt engineering. Maintain the original intent and purpose while enhancing clarity, structure, and effectiveness. Return only the improved prompt without any explanations or comments. Ensure that the improved prompt is in the user's language.")}
            onChange={(value) => onConfigChange('openaiPromptReviewPrompt', value)}
            placeholder={t("openai.placeholders.reviewPrompt")}
            className={isExpanded ? "min-h-[120px] text-sm" : "min-h-[60px] text-xs"}
          />
        </div>
      </div>
    </div>
  );
}

