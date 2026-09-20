import { ReactNode, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { Label, Input, Textarea } from '@evoapi/design-system';
import { Agent } from '@/types/agents';
import { Smile, Clock, Reply, Zap } from 'lucide-react';
import { AdvancedBotConfigData } from '@/components/ai_agents/Forms/AdvancedBotConfig';
import { supportsMessageHandling, isExternalAgent } from '@/utils/agents';
import { AdvancedMessageConfig, BehaviorSettings, ExternalConfigData } from './types';
import AgentToggle from './AgentToggle';

interface MessageHandlingPanelProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  externalConfigData?: ExternalConfigData | null;
  behaviorSettings: BehaviorSettings;
  onLLMConfigChange: (data: LLMConfigData) => void;
  onExternalConfigChange?: (data: ExternalConfigData) => void;
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
}

interface MessageDeliveryFieldsProps {
  /** Prefix for `id`/`htmlFor`, so LLM and external can coexist in the same DOM. */
  idPrefix?: string;
  config: AdvancedMessageConfig;
  onChange: (config: AdvancedMessageConfig) => void;
}

/** LLM and external share these fields; only the `advanced_config` source differs. */
const MessageDeliveryFields = ({
  idPrefix = '',
  config,
  onChange,
}: MessageDeliveryFieldsProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <>
      <div className="flex items-start justify-between py-3 border-b">
        <div className="flex items-start gap-3 flex-1">
          <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Label htmlFor={`${idPrefix}message-wait-time`} className="font-medium">
              {t('advancedBot.messageWaitTime') || 'Tempo de espera de mensagens (segundos)'}
            </Label>
            <Input
              id={`${idPrefix}message-wait-time`}
              type="number"
              min={0}
              max={60}
              value={config.message_wait_time}
              onChange={e =>
                onChange({ ...config, message_wait_time: parseInt(e.target.value) || 0 })
              }
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              {t('advancedBot.messageWaitTimeDescription') ||
                'Tempo que o agente aguarda antes de processar mensagens'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between py-3 border-b">
        <div className="flex items-start gap-3 flex-1">
          <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Label htmlFor={`${idPrefix}message-signature`} className="font-medium">
              {t('advancedBot.messageSignature') || 'Assinatura da Mensagem'}
            </Label>
            <Textarea
              id={`${idPrefix}message-signature`}
              value={config.message_signature || ''}
              onChange={e => onChange({ ...config, message_signature: e.target.value })}
              placeholder={
                t('advancedBot.messageSignaturePlaceholder') ||
                'Adicione uma assinatura personalizada para as mensagens deste agente...'
              }
              rows={3}
              className="max-w-2xl"
            />
            <p className="text-sm text-muted-foreground">
              {t('advancedBot.messageSignatureDescription') ||
                'Texto que será adicionado ao final de cada mensagem do agente'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between py-3 border-b">
        <div className="flex items-start gap-3 flex-1">
          <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Label
                htmlFor={`${idPrefix}enable-text-segmentation`}
                className="font-medium cursor-pointer"
              >
                {t('advancedBot.enableTextSegmentation') || 'Habilitar segmentação de texto'}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('advancedBot.textSegmentationDescription') ||
                'Configure como as mensagens longas serão divididas e enviadas'}
            </p>
            {config.enable_text_segmentation && (
              <div className="space-y-3 ml-6 border-l-2 border-purple-200 dark:border-purple-800 pl-4 pt-2">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${idPrefix}max-characters-per-segment`}
                    className="text-sm font-medium"
                  >
                    {t('advancedBot.maxCharactersPerSegment') || 'Máximo de caracteres por segmento'}
                  </Label>
                  <Input
                    id={`${idPrefix}max-characters-per-segment`}
                    type="number"
                    min={50}
                    max={2000}
                    value={config.max_characters_per_segment}
                    onChange={e =>
                      onChange({
                        ...config,
                        max_characters_per_segment: parseInt(e.target.value) || 300,
                      })
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('advancedBot.maxCharactersDescription') ||
                      'Número máximo de caracteres em cada segmento'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}min-segment-size`} className="text-sm font-medium">
                    {t('advancedBot.minSegmentSize') || 'Tamanho mínimo do segmento'}
                  </Label>
                  <Input
                    id={`${idPrefix}min-segment-size`}
                    type="number"
                    min={10}
                    max={500}
                    value={config.min_segment_size}
                    onChange={e =>
                      onChange({ ...config, min_segment_size: parseInt(e.target.value) || 50 })
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('advancedBot.minSegmentDescription') ||
                      'Tamanho mínimo para criar um novo segmento'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}character-delay-ms`} className="text-sm font-medium">
                    {t('advancedBot.characterDelayMs') || 'Delay por caractere (ms)'}
                  </Label>
                  <Input
                    id={`${idPrefix}character-delay-ms`}
                    type="number"
                    min={0}
                    max={1000}
                    step={0.01}
                    value={config.character_delay_ms}
                    onChange={e =>
                      onChange({
                        ...config,
                        character_delay_ms: parseFloat(e.target.value) || 0.05,
                      })
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('advancedBot.characterDelayDescription') ||
                      'Tempo de espera entre caracteres ao enviar mensagens'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <AgentToggle
          id={`${idPrefix}enable-text-segmentation`}
          checked={config.enable_text_segmentation}
          onCheckedChange={value => onChange({ ...config, enable_text_segmentation: value })}
        />
      </div>
    </>
  );
};

interface ToggleRowProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const ToggleRow = ({ id, icon, title, description, checked, onCheckedChange }: ToggleRowProps) => (
  <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
    <div className="flex items-start gap-3 flex-1">
      {icon}
      <div className="flex-1">
        <Label htmlFor={id} className="font-medium cursor-pointer">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
    <AgentToggle id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export const MessageHandlingPanel = ({
  agent,
  llmConfigData,
  externalConfigData,
  behaviorSettings,
  onLLMConfigChange,
  onExternalConfigChange,
  onBehaviorSettingsChange,
}: MessageHandlingPanelProps) => {
  const { t } = useLanguage('aiAgents');

  const handleAdvancedBotConfigChange = useCallback(
    (data: AdvancedBotConfigData) => {
      if (llmConfigData) {
        onLLMConfigChange({
          ...llmConfigData,
          advanced_config: data,
        });
      }
    },
    [llmConfigData, onLLMConfigChange]
  );

  const handleExternalAdvancedConfigChange = useCallback(
    (data: AdvancedMessageConfig) => {
      if (externalConfigData && onExternalConfigChange) {
        onExternalConfigChange({
          ...externalConfigData,
          advanced_config: data,
        });
      }
    },
    [externalConfigData, onExternalConfigChange]
  );

  const isLLMVariant =
    supportsMessageHandling(agent.type) &&
    !isExternalAgent(agent.type) &&
    Boolean(llmConfigData?.advanced_config);
  const isA2ATaskVariant = agent.type === 'a2a' || agent.type === 'task';
  const isExternalVariant =
    isExternalAgent(agent.type) && Boolean(externalConfigData?.advanced_config);

  const emojisRow = (id: string) => (
    <ToggleRow
      id={id}
      icon={<Smile className="h-5 w-5 text-yellow-500 mt-0.5" />}
      title={t('edit.configuration.behavior.useEmojis') || 'Usar Emojis Nas Respostas'}
      description={
        t('edit.configuration.behavior.useEmojisDescription') ||
        'Permite que o agente use emojis nas respostas para tornar a comunicação mais amigável'
      }
      checked={behaviorSettings.useEmojis}
      onCheckedChange={checked => onBehaviorSettingsChange({ ...behaviorSettings, useEmojis: checked })}
    />
  );

  const sendAsReplyRow = (id: string) => (
    <ToggleRow
      id={id}
      icon={<Reply className="h-5 w-5 text-blue-500 mt-0.5" />}
      title={
        t('edit.configuration.behavior.sendAsReply') || 'Enviar mensagem como resposta na conversa'
      }
      description={
        t('edit.configuration.behavior.sendAsReplyDescription') ||
        'Permite que o agente envie mensagens como resposta a uma mensagem específica na conversa'
      }
      checked={behaviorSettings.sendAsReply}
      onCheckedChange={checked =>
        onBehaviorSettingsChange({ ...behaviorSettings, sendAsReply: checked })
      }
    />
  );

  return (
    <div className="space-y-4">
      {isLLMVariant && llmConfigData?.advanced_config && (
        <>
          <MessageDeliveryFields
            config={llmConfigData.advanced_config}
            onChange={handleAdvancedBotConfigChange}
          />
          {emojisRow('use-emojis-messages')}
          {sendAsReplyRow('send-as-reply')}
        </>
      )}

      {isA2ATaskVariant && (
        <>
          {emojisRow('use-emojis-a2a-task')}
          {sendAsReplyRow('send-as-reply-a2a-task')}
        </>
      )}

      {isExternalVariant && externalConfigData?.advanced_config && (
        <>
          <MessageDeliveryFields
            idPrefix="external-"
            config={externalConfigData.advanced_config}
            onChange={handleExternalAdvancedConfigChange}
          />
          {sendAsReplyRow('external-send-as-reply')}
        </>
      )}
    </div>
  );
};
