import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Label,
  Button,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Input,
} from '@evoapi/design-system';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { ApiKey, ApiKeyModelInfo } from '@/types/agents';
import { agentsService } from '@/services/agents/agentService';

const CUSTOM_MODEL_OPTION = '__custom_model__';
const CUSTOM_OPENAI_PROVIDER = 'custom_openai_compatible';

export const availableModels = [
  { value: 'openai/gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { value: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'openai' },
  { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { value: 'openai/gpt-4.5-preview', label: 'GPT-4.5 Preview', provider: 'openai' },
  { value: 'openai/gpt-4', label: 'GPT-4 Turbo', provider: 'openai' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { value: 'openai/gpt-4-32k', label: 'GPT-4 32K', provider: 'openai' },
  { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'openai/gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', provider: 'openai' },
  { value: 'gemini/gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro (Preview)', provider: 'gemini' },
  { value: 'gemini/gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash (Preview)', provider: 'gemini' },
  { value: 'gemini/gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  { value: 'gemini/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
  { value: 'gemini/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp', provider: 'gemini' },
  { value: 'gemini/gemini-2.0-flash-live-001', label: 'Gemini 2.0 Flash Live', provider: 'gemini' },
  { value: 'gemini/gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  { value: 'gemini/gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
  { value: 'gemini/gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B', provider: 'gemini' },
  { value: 'anthropic/claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet', provider: 'anthropic' },
  { value: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2', provider: 'anthropic' },
  { value: 'anthropic/claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { value: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
  { value: 'anthropic/claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'anthropic' },
  { value: 'anthropic/claude-3-sonnet-20240229', label: 'Claude 3 Sonnet', provider: 'anthropic' },
  { value: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku', provider: 'anthropic' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', provider: 'openrouter' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (Free)', provider: 'openrouter' },
  { value: 'openrouter/meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', provider: 'openrouter' },
  { value: 'openrouter/qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct', provider: 'openrouter' },
  { value: 'openrouter/qwen/qwen-2.5-32b-instruct', label: 'Qwen 2.5 32B Instruct', provider: 'openrouter' },
  { value: 'openrouter/qwen/qwen-2.5-7b-instruct', label: 'Qwen 2.5 7B Instruct', provider: 'openrouter' },
  { value: 'openrouter/deepseek/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B', provider: 'openrouter' },
  { value: 'openrouter/deepseek/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 Distill Qwen 32B', provider: 'openrouter' },
  { value: 'openrouter/openai/gpt-4o', label: 'GPT-4o (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/anthropic/claude-3-5-sonnet', label: 'Claude 3.5 Sonnet (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (OpenRouter)', provider: 'openrouter' },
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek' },
  { value: 'deepseek/deepseek-coder', label: 'DeepSeek Coder', provider: 'deepseek' },
  { value: 'deepseek/deepseek-reasoner', label: 'DeepSeek Reasoner (R1)', provider: 'deepseek' },
  { value: 'together_ai/meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Instruct Turbo', provider: 'together_ai' },
  { value: 'together_ai/togethercomputer/llama-2-70b-chat', label: 'Llama 2 70B Chat', provider: 'together_ai' },
  { value: 'together_ai/togethercomputer/Llama-2-7B-32K-Instruct', label: 'Llama 2 7B 32K Instruct', provider: 'together_ai' },
  { value: 'together_ai/togethercomputer/CodeLlama-34b-Instruct', label: 'CodeLlama 34B Instruct', provider: 'together_ai' },
  { value: 'together_ai/WizardLM/WizardCoder-Python-34B-V1.0', label: 'WizardCoder Python 34B', provider: 'together_ai' },
  { value: 'together_ai/NousResearch/Nous-Hermes-Llama2-13b', label: 'Nous Hermes Llama2 13B', provider: 'together_ai' },
  { value: 'together_ai/upstage/SOLAR-0-70b-16bit', label: 'SOLAR 70B', provider: 'together_ai' },
  { value: 'together_ai/WizardLM/WizardLM-70B-V1.0', label: 'WizardLM 70B', provider: 'together_ai' },
  { value: 'together_ai/Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Instruct Turbo', provider: 'together_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/llama-v3p2-90b-vision-instruct', label: 'Llama 3.2 90B Vision', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/llama-v3p2-11b-vision-instruct', label: 'Llama 3.2 11B Vision', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/llama-v3p2-3b-instruct', label: 'Llama 3.2 3B Instruct', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/llama-v3p2-1b-instruct', label: 'Llama 3.2 1B Instruct', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/mixtral-8x7b-instruct', label: 'Mixtral 8x7B Instruct', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/firefunction-v1', label: 'FireFunction v1', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/qwen2p5-coder-7b', label: 'Qwen 2.5 Coder 7B', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/deepseek-v3', label: 'DeepSeek V3', provider: 'fireworks_ai' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', provider: 'groq' },
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'groq' },
  { value: 'groq/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B (Groq)', provider: 'groq' },
  { value: 'groq/llama3-70b-8192', label: 'Llama 3 70B', provider: 'groq' },
  { value: 'groq/llama3-8b-8192', label: 'Llama 3 8B', provider: 'groq' },
  { value: 'groq/mixtral-8x7b-32768', label: 'Mixtral 8x7B', provider: 'groq' },
  { value: 'groq/gemma2-9b-it', label: 'Gemma 2 9B', provider: 'groq' },
  { value: 'perplexity/sonar-pro', label: 'Sonar Pro', provider: 'perplexity' },
  { value: 'perplexity/sonar', label: 'Sonar', provider: 'perplexity' },
  { value: 'perplexity/sonar-reasoning-pro', label: 'Sonar Reasoning Pro', provider: 'perplexity' },
  { value: 'perplexity/sonar-reasoning', label: 'Sonar Reasoning', provider: 'perplexity' },
  { value: 'perplexity/sonar-deep-research', label: 'Sonar Deep Research', provider: 'perplexity' },
  { value: 'perplexity/r1-1776', label: 'R1-1776', provider: 'perplexity' },
  { value: 'perplexity/openai/gpt-4o', label: 'GPT-4o (via Perplexity)', provider: 'perplexity' },
  { value: 'perplexity/anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (via Perplexity)', provider: 'perplexity' },
  { value: 'perplexity/google/gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (via Perplexity)', provider: 'perplexity' },
  { value: 'bedrock/us.anthropic.claude-sonnet-4-5-20250929-v1:0', label: 'Claude Sonnet 4.5 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0', label: 'Claude 3.5 Sonnet (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/meta.llama3-1-405b-instruct-v1:0', label: 'Llama 3.1 405B (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/meta.llama3-1-70b-instruct-v1:0', label: 'Llama 3.1 70B (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/us.deepseek.r1-v1:0', label: 'DeepSeek R1 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/amazon.titan-text-express-v1', label: 'Titan Text Express (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/mistral.mistral-7b-instruct-v0:2', label: 'Mistral 7B (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/amazon.nova-micro-v1:0', label: 'Amazon Nova Micro (Bedrock)', provider: 'bedrock' },
  { value: 'vertex_ai/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-2.5-flash-preview-09-2025', label: 'Gemini 2.5 Flash Preview (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-2.5-flash-lite-preview-09-2025', label: 'Gemini 2.5 Flash Lite (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-2.5-pro-vision', label: 'Gemini 2.5 Pro Vision (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-1.5-pro', label: 'Gemini 1.5 Pro (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-1.5-flash', label: 'Gemini 1.5 Flash (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/text-bison', label: 'Text Bison (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/chat-bison-32k', label: 'Chat Bison 32K (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/codechat-bison', label: 'CodeChat Bison (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/code-bison', label: 'Code Bison (Vertex)', provider: 'vertex_ai' },
];

export interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  apiKeys: ApiKey[];
  apiKeyId?: string;
  isReadOnly?: boolean;
  error?: string;
  label?: string;
  showLabel?: boolean;
  required?: boolean;
  className?: string;
  description?: string;
  id?: string;
}

const ModelSelector = ({
  value,
  onChange,
  apiKeys,
  apiKeyId,
  isReadOnly = false,
  error,
  label,
  showLabel = true,
  required = false,
  className = 'w-80',
  description,
  id = 'model',
}: ModelSelectorProps) => {
  const { t } = useLanguage('aiAgents');
  const [open, setOpen] = useState(false);

  const [isCustomMode, setIsCustomMode] = useState(false);

  const selectedApiKey = useMemo(() => {
    return apiKeys.find(key => key.id === apiKeyId);
  }, [apiKeys, apiKeyId]);

  const customProviderSelected = selectedApiKey?.provider === CUSTOM_OPENAI_PROVIDER;

  // Dynamic model list fetched from the provider via the backend. Populated
  // when the user picks an API key for a provider the backend supports. Falls
  // back to the hardcoded `availableModels` below if this is null or empty.
  const [dynamicModels, setDynamicModels] = useState<ApiKeyModelInfo[] | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (!apiKeyId || customProviderSelected) {
      setDynamicModels(null);
      return;
    }

    let cancelled = false;
    setIsLoadingModels(true);
    agentsService
      .listApiKeyModels(apiKeyId)
      .then(res => {
        if (cancelled) return;
        setDynamicModels(res.supported && res.models.length > 0 ? res.models : null);
      })
      .catch(() => {
        if (cancelled) return;
        setDynamicModels(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingModels(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKeyId, customProviderSelected]);

  const filteredModels = useMemo(() => {
    if (customProviderSelected) {
      return [];
    }
    if (dynamicModels && dynamicModels.length > 0) {
      return dynamicModels;
    }
    if (!selectedApiKey) {
      return availableModels;
    }
    return availableModels.filter(model => model.provider === selectedApiKey.provider);
  }, [selectedApiKey, customProviderSelected, dynamicModels]);

  const selectedModel = useMemo(() => {
    return filteredModels.find(model => model.value === value)
      || availableModels.find(model => model.value === value);
  }, [value, filteredModels]);

  useEffect(() => {
    setIsCustomMode(Boolean(value) && !selectedModel);
  }, [value, selectedModel]);

  useEffect(() => {
    if (customProviderSelected) {
      setIsCustomMode(true);
    }
  }, [customProviderSelected]);

  const customModelError = isCustomMode && value && !value.includes('/')
    && !customProviderSelected
    ? 'Use provider/model format.'
    : undefined;

  const handleSelect = (modelValue: string) => {
    if (modelValue === CUSTOM_MODEL_OPTION) {
      setIsCustomMode(true);
      if (selectedModel) {
        onChange('');
      }
      setOpen(false);
      return;
    }

    setIsCustomMode(false);
    onChange(modelValue);
    setOpen(false);
  };

  const displayLabel = label || t('llmConfig.model');
  const isReadOnlyWithValue = isReadOnly && Boolean(value);

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {displayLabel} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      {isReadOnlyWithValue ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-medium">{selectedModel?.label || 'Custom Model'}</p>
              <p className="text-sm text-muted-foreground">{value}</p>
            </div>
          </div>
          <Badge variant="outline">{selectedModel?.provider || 'custom'}</Badge>
        </div>
      ) : isReadOnly ? (
        <div className="p-3 border rounded-lg bg-muted/50 text-sm text-muted-foreground">
          -
        </div>
      ) : (
        <>
          {!customProviderSelected && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={isLoadingModels}
                  className={`${className} justify-between ${error || customModelError ? 'border-red-500' : ''}`}
                  id={id}
                >
                  {isLoadingModels
                    ? t('llmConfig.loadingModels', { defaultValue: 'Loading models...' })
                    : value
                      ? selectedModel?.label || value
                      : t('llmConfig.searchOrSelectModel')}
                  {isLoadingModels
                    ? <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-70" />
                    : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`${className} p-0`} align="start">
                <Command>
                  <CommandInput placeholder={t('llmConfig.searchModels')} />
                  <CommandEmpty>{t('llmConfig.noModelFound')}</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredModels.map(model => (
                      <CommandItem
                        key={model.value}
                        value={`${model.label} ${model.provider}`}
                        onSelect={() => handleSelect(model.value)}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            value === model.value ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="font-medium">{model.label}</span>
                      </CommandItem>
                    ))}
                    <CommandItem
                      value="Custom Model"
                      onSelect={() => handleSelect(CUSTOM_MODEL_OPTION)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          isCustomMode ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span className="font-medium">Custom Model</span>
                    </CommandItem>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {(isCustomMode || customProviderSelected) && (
            <Input
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={customProviderSelected ? 'model' : 'provider/model'}
              className={className}
            />
          )}
        </>
      )}
      {(error || customModelError) && <p className="text-xs text-red-600">{error || customModelError}</p>}
      {description && !error && !customModelError && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {!description && !error && !customModelError && selectedApiKey && (
        <p className="text-xs text-muted-foreground">
          {t('llmConfig.modelFilteredDescription', { provider: selectedApiKey.provider.toUpperCase() })}
        </p>
      )}
      {!description && !error && !customModelError && !selectedApiKey && (
        <p className="text-xs text-muted-foreground">
          {t('llmConfig.modelAllDescription')}
        </p>
      )}
    </div>
  );
};

export default ModelSelector;
