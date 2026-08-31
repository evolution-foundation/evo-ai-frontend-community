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

// Shown before an API key is chosen, and as the fallback when a live listing fails. For
// the providers with no listing endpoint at all (Vertex, Bedrock) it is the
// only source there will ever be. Prefer a rolling alias: it is the only entry here that
// does not rot on its own.
export const availableModels = [
  { value: 'openai/gpt-5.6', label: 'GPT-5.6', provider: 'openai' },
  { value: 'openai/gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'openai' },
  { value: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'openai' },
  { value: 'gemini/gemini-flash-latest', label: 'Gemini Flash (latest)', provider: 'gemini' },
  { value: 'gemini/gemini-flash-lite-latest', label: 'Gemini Flash-Lite (latest)', provider: 'gemini' },
  { value: 'gemini/gemini-pro-latest', label: 'Gemini Pro (latest)', provider: 'gemini' },
  { value: 'anthropic/claude-opus-5', label: 'Claude Opus 5', provider: 'anthropic' },
  { value: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'anthropic' },
  { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { value: 'openrouter/anthropic/claude-opus-5', label: 'Claude Opus 5 (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/openai/gpt-5.6-sol', label: 'GPT-5.6 Sol (OpenRouter)', provider: 'openrouter' },
  { value: 'openrouter/google/gemini-3.7-flash', label: 'Gemini 3.7 Flash (OpenRouter)', provider: 'openrouter' },
  { value: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', provider: 'deepseek' },
  { value: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'deepseek' },
  { value: 'fireworks_ai/accounts/fireworks/models/deepseek-v4-pro', label: 'DeepSeek V4 Pro (Fireworks)', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/gpt-oss-120b', label: 'GPT-OSS 120B (Fireworks)', provider: 'fireworks_ai' },
  { value: 'fireworks_ai/accounts/fireworks/models/kimi-k3', label: 'Kimi K3 (Fireworks)', provider: 'fireworks_ai' },
  // Verified against Together's public serverless catalogue: the old entry failed only
  // for a `Meta-` prefix Together never used, not for want of a source to check.
  { value: 'together_ai/deepseek-ai/DeepSeek-V4-Flash-0731', label: 'DeepSeek V4 Flash (Together)', provider: 'together_ai' },
  { value: 'together_ai/meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Instruct Turbo', provider: 'together_ai' },
  { value: 'together_ai/Qwen/Qwen3.5-9B', label: 'Qwen 3.5 9B', provider: 'together_ai' },
  // `global.` where Bedrock offers global routing, `us.` only where it does not, so the
  // picker never pins data residency the deployment did not ask for. Sonnet 4.5 EOL from
  // 2026-09-29.
  { value: 'bedrock/global.anthropic.claude-opus-5', label: 'Claude Opus 5 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/global.anthropic.claude-sonnet-5', label: 'Claude Sonnet 5 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/global.anthropic.claude-sonnet-4-5-20250929-v1:0', label: 'Claude Sonnet 4.5 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/us.meta.llama3-1-70b-instruct-v1:0', label: 'Llama 3.1 70B (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/us.deepseek.r1-v1:0', label: 'DeepSeek R1 (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/mistral.mistral-7b-instruct-v0:2', label: 'Mistral 7B (Bedrock)', provider: 'bedrock' },
  { value: 'bedrock/amazon.nova-micro-v1:0', label: 'Amazon Nova Micro (Bedrock)', provider: 'bedrock' },
  // Vertex has no listing endpoint and no rolling alias, so these are pinned by hand.
  // Gemini 2.5 retires 2026-10-16; Pro stays on it because 3.1 Pro is still preview.
  { value: 'vertex_ai/gemini-3.7-flash', label: 'Gemini 3.7 Flash (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (Vertex)', provider: 'vertex_ai' },
  { value: 'vertex_ai/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Vertex)', provider: 'vertex_ai' },
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

  // Live model list fetched from the provider via the backend, or null when the
  // provider has no listing endpoint and the pinned `availableModels` has to do.
  // An EMPTY array is a real answer, not a missing one: the provider listed and
  // offered nothing current, and serving the pinned list there would put the
  // retired models back on screen — the failure this list was pruned to prevent.
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
        setDynamicModels(res.supported ? res.models : null);
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
    if (dynamicModels) {
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
