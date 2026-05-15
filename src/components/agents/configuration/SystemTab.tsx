import { useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import {
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Textarea,
  Button,
} from '@evoapi/design-system';
import { Agent } from '@/types/agents';
import {
  UserRound,
  Smile,
  Bell,
  Globe,
  Clock,
  MessageSquare,
  Settings,
  Reply,
  GitBranch,
  Edit3,
  Zap,
  Tag,
  ShoppingCart,
} from 'lucide-react';
import { AdvancedBotConfigData } from '@/components/ai_agents/Forms/AdvancedBotConfig';
import { supportsBehaviorSettings, supportsMessageHandling, isExternalAgent } from '@/utils/agents';

export interface BehaviorSettings {
  transferToHuman: boolean;
  useEmojis: boolean;
  allowReminders: boolean;
  allowPipelineManipulation: boolean;
  allowContactEdit: boolean;
  allowManageLabels: boolean;
  allowProductSales: boolean;
  timezone: string;
  sendAsReply: boolean;
}

interface SystemTabProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  externalConfigData?: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  } | null;
  behaviorSettings: BehaviorSettings;
  onLLMConfigChange: (data: LLMConfigData) => void;
  onExternalConfigChange?: (data: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  }) => void;
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
  onShowTransferRulesModal: () => void;
  onShowPipelineRulesModal: () => void;
  onShowContactEditModal: () => void;
}

export const SystemTab = ({
  agent,
  llmConfigData,
  externalConfigData,
  behaviorSettings,
  onLLMConfigChange,
  onExternalConfigChange,
  onBehaviorSettingsChange,
  onShowTransferRulesModal,
  onShowPipelineRulesModal,
  onShowContactEditModal,
}: SystemTabProps) => {
  const { t } = useLanguage('aiAgents');

  // Handler para mudanças no advanced bot config (LLM)
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

  // Handler para mudanças no advanced config (External)
  const handleExternalAdvancedConfigChange = useCallback(
    (data: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    }) => {
      if (externalConfigData && onExternalConfigChange) {
        onExternalConfigChange({
          ...externalConfigData,
          advanced_config: data,
        });
      }
    },
    [externalConfigData, onExternalConfigChange]
  );

  return (
    <div className="space-y-8">
      {/* Seção: Comportamento na Conversa */}
      {supportsBehaviorSettings(agent.type) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {t('edit.configuration.sections.behavior.title') || 'Comportamento na Conversa'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('edit.configuration.sections.behavior.subtitle') ||
                  'Configure como o agente interage com os usuários'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pl-11">
            {/* Transferir para humano */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <UserRound className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="transfer-to-human" className="font-medium cursor-pointer">
                      {t('edit.configuration.behavior.transferToHuman') || 'Transferir para humano'}
                    </Label>
                    {behaviorSettings.transferToHuman && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onShowTransferRulesModal}
                        className="h-7 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t('edit.configuration.behavior.configureRules') || 'Configurar regras'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.transferToHumanDescription') ||
                      'Permite que o agente transfira a conversa para um atendente humano quando necessário'}
                  </p>
                </div>
              </div>
              <Switch
                id="transfer-to-human"
                checked={behaviorSettings.transferToHuman}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, transferToHuman: checked })
                }
              />
            </div>

            {/* Permitir registrar lembretes */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <Bell className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="allow-reminders" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.allowReminders') ||
                      'Permitir registrar lembretes'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.allowRemindersDescription') ||
                      'Permite que o agente registre lembretes e tarefas para o usuário'}
                  </p>
                </div>
              </div>
              <Switch
                id="allow-reminders"
                checked={behaviorSettings.allowReminders}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, allowReminders: checked })
                }
              />
            </div>

            {/* Permitir editar contatos */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <Edit3 className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="allow-contact-edit" className="font-medium cursor-pointer">
                      {t('edit.configuration.behavior.allowContactEdit') || 'Permitir editar contatos'}
                    </Label>
                    {behaviorSettings.allowContactEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onShowContactEditModal}
                        className="h-7 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t('edit.configuration.behavior.configureRules') || 'Configurar regras'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.allowContactEditDescription') ||
                      'Permite que o agente edite informações de contato durante a conversa'}
                  </p>
                </div>
              </div>
              <Switch
                id="allow-contact-edit"
                checked={behaviorSettings.allowContactEdit}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, allowContactEdit: checked })
                }
              />
            </div>

            {/* Permitir manipular pipelines */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <GitBranch className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="allow-pipeline-manipulation" className="font-medium cursor-pointer">
                      {t('edit.configuration.behavior.allowPipelineManipulation') ||
                        'Permitir manipular pipelines'}
                    </Label>
                    {behaviorSettings.allowPipelineManipulation && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onShowPipelineRulesModal}
                        className="h-7 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        {t('edit.configuration.behavior.configureRules') || 'Configurar'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.allowPipelineManipulationDescription') ||
                      'Permite que o agente mova conversas entre pipelines e estágios conforme regras definidas'}
                  </p>
                </div>
              </div>
              <Switch
                id="allow-pipeline-manipulation"
                checked={behaviorSettings.allowPipelineManipulation}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({
                    ...behaviorSettings,
                    allowPipelineManipulation: checked,
                  })
                }
              />
            </div>

            {/* Permitir gerenciar labels */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <Tag className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="allow-manage-labels" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.allowManageLabels') ||
                      'Permitir gerenciar labels'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.allowManageLabelsDescription') ||
                      'Permite que o agente adicione e remova labels da conversa atual'}
                  </p>
                </div>
              </div>
              <Switch
                id="allow-manage-labels"
                checked={behaviorSettings.allowManageLabels}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({
                    ...behaviorSettings,
                    allowManageLabels: checked,
                  })
                }
              />
            </div>

            {/* Permitir registrar venda no pipeline */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <ShoppingCart className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="allow-product-sales" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.allowProductSales') ||
                      'Permitir registrar venda no pipeline'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.allowProductSalesDescription') ||
                      'Permite que o agente registre produtos vendidos no card do pipeline durante a conversa'}
                  </p>
                </div>
              </div>
              <Switch
                id="allow-product-sales"
                checked={behaviorSettings.allowProductSales}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({
                    ...behaviorSettings,
                    allowProductSales: checked,
                  })
                }
              />
            </div>

            {/* Timezone */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <Globe className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="timezone" className="font-medium">
                    {t('edit.configuration.behavior.timezone') || 'Timezone do agente'}
                  </Label>
                  <Select
                    value={behaviorSettings.timezone}
                    onValueChange={value =>
                      onBehaviorSettingsChange({ ...behaviorSettings, timezone: value })
                    }
                  >
                    <SelectTrigger id="timezone" className="max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (GMT+9)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {t('edit.configuration.behavior.timezoneDescription') ||
                      'Define o fuso horário usado pelo agente para agendamentos e lembretes'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seção: Tratamento de Mensagens (apenas para LLM) */}
      {supportsMessageHandling(agent.type) && llmConfigData?.advanced_config && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {t('edit.configuration.sections.messageHandling.title') ||
                  'Tratamento de Mensagens'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('edit.configuration.sections.messageHandling.subtitle') ||
                  'Configure como as mensagens são processadas e enviadas'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pl-11">
            {/* Tempo de espera de mensagens */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="message-wait-time" className="font-medium">
                    {t('advancedBot.messageWaitTime') ||
                      'Tempo de espera de mensagens (segundos)'}
                  </Label>
                  <Input
                    id="message-wait-time"
                    type="number"
                    min={0}
                    max={60}
                    value={llmConfigData.advanced_config.message_wait_time}
                    onChange={e =>
                      handleAdvancedBotConfigChange({
                        ...llmConfigData.advanced_config,
                        message_wait_time: parseInt(e.target.value) || 0,
                      })
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

            {/* Assinatura da Mensagem */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="message-signature" className="font-medium">
                    {t('advancedBot.messageSignature') || 'Assinatura da Mensagem'}
                  </Label>
                  <Textarea
                    id="message-signature"
                    value={llmConfigData.advanced_config.message_signature || ''}
                    onChange={e =>
                      handleAdvancedBotConfigChange({
                        ...llmConfigData.advanced_config,
                        message_signature: e.target.value,
                      })
                    }
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

            {/* Configurações de Segmentação de Texto */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="enable-text-segmentation" className="font-medium cursor-pointer">
                      {t('advancedBot.enableTextSegmentation') ||
                        'Habilitar segmentação de texto'}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('advancedBot.textSegmentationDescription') ||
                      'Configure como as mensagens longas serão divididas e enviadas'}
                  </p>
                  {llmConfigData.advanced_config.enable_text_segmentation && (
                    <div className="space-y-3 ml-6 border-l-2 border-purple-200 dark:border-purple-800 pl-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="max-characters-per-segment" className="text-sm font-medium">
                          {t('advancedBot.maxCharactersPerSegment') ||
                            'Máximo de caracteres por segmento'}
                        </Label>
                        <Input
                          id="max-characters-per-segment"
                          type="number"
                          min={50}
                          max={2000}
                          value={llmConfigData.advanced_config.max_characters_per_segment}
                          onChange={e =>
                            handleAdvancedBotConfigChange({
                              ...llmConfigData.advanced_config,
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
                        <Label htmlFor="min-segment-size" className="text-sm font-medium">
                          {t('advancedBot.minSegmentSize') || 'Tamanho mínimo do segmento'}
                        </Label>
                        <Input
                          id="min-segment-size"
                          type="number"
                          min={10}
                          max={500}
                          value={llmConfigData.advanced_config.min_segment_size}
                          onChange={e =>
                            handleAdvancedBotConfigChange({
                              ...llmConfigData.advanced_config,
                              min_segment_size: parseInt(e.target.value) || 50,
                            })
                          }
                          className="w-32"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('advancedBot.minSegmentDescription') ||
                            'Tamanho mínimo para criar um novo segmento'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="character-delay-ms" className="text-sm font-medium">
                          {t('advancedBot.characterDelayMs') || 'Delay por caractere (ms)'}
                        </Label>
                        <Input
                          id="character-delay-ms"
                          type="number"
                          min={0}
                          max={1000}
                          step={0.01}
                          value={llmConfigData.advanced_config.character_delay_ms}
                          onChange={e =>
                            handleAdvancedBotConfigChange({
                              ...llmConfigData.advanced_config,
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
              <Switch
                id="enable-text-segmentation"
                checked={llmConfigData.advanced_config.enable_text_segmentation}
                onCheckedChange={value =>
                  handleAdvancedBotConfigChange({
                    ...llmConfigData.advanced_config,
                    enable_text_segmentation: value,
                  })
                }
              />
            </div>

            {/* Usar Emojis */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Smile className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="use-emojis-messages" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.useEmojis') || 'Usar Emojis Nas Respostas'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.useEmojisDescription') ||
                      'Permite que o agente use emojis nas respostas para tornar a comunicação mais amigável'}
                  </p>
                </div>
              </div>
              <Switch
                id="use-emojis-messages"
                checked={behaviorSettings.useEmojis}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, useEmojis: checked })
                }
              />
            </div>

            {/* Enviar mensagem como resposta na conversa */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <Reply className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="send-as-reply" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.sendAsReply') ||
                      'Enviar mensagem como resposta na conversa'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.sendAsReplyDescription') ||
                      'Permite que o agente envie mensagens como resposta a uma mensagem específica na conversa'}
                  </p>
                </div>
              </div>
              <Switch
                id="send-as-reply"
                checked={behaviorSettings.sendAsReply}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, sendAsReply: checked })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Seção: Tratamento de Mensagens (para A2A e Task) */}
      {(agent.type === 'a2a' || agent.type === 'task') && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {t('edit.configuration.sections.messageHandling.title') ||
                  'Tratamento de Mensagens'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('edit.configuration.sections.messageHandling.subtitle') ||
                  'Configure como as mensagens são processadas e enviadas'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pl-11">
            {/* Usar Emojis */}
            <div className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-start gap-3 flex-1">
                <Smile className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="use-emojis-a2a-task" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.useEmojis') || 'Usar Emojis Nas Respostas'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.useEmojisDescription') ||
                      'Permite que o agente use emojis nas respostas para tornar a comunicação mais amigável'}
                  </p>
                </div>
              </div>
              <Switch
                id="use-emojis-a2a-task"
                checked={behaviorSettings.useEmojis}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, useEmojis: checked })
                }
              />
            </div>

            {/* Enviar mensagem como resposta na conversa */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <Reply className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="send-as-reply-a2a-task" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.sendAsReply') ||
                      'Enviar mensagem como resposta na conversa'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.sendAsReplyDescription') ||
                      'Permite que o agente envie mensagens como resposta a uma mensagem específica na conversa'}
                  </p>
                </div>
              </div>
              <Switch
                id="send-as-reply-a2a-task"
                checked={behaviorSettings.sendAsReply}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, sendAsReply: checked })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Seção: Tratamento de Mensagens (para External) */}
      {isExternalAgent(agent.type) && externalConfigData?.advanced_config && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {t('edit.configuration.sections.messageHandling.title') ||
                  'Tratamento de Mensagens'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('edit.configuration.sections.messageHandling.subtitle') ||
                  'Configure como as mensagens são processadas e enviadas'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pl-11">
            {/* Tempo de espera de mensagens */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="external-message-wait-time" className="font-medium">
                    {t('advancedBot.messageWaitTime') ||
                      'Tempo de espera de mensagens (segundos)'}
                  </Label>
                  <Input
                    id="external-message-wait-time"
                    type="number"
                    min={0}
                    max={60}
                    value={externalConfigData.advanced_config.message_wait_time}
                    onChange={e =>
                      handleExternalAdvancedConfigChange({
                        ...externalConfigData.advanced_config!,
                        message_wait_time: parseInt(e.target.value) || 0,
                      })
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

            {/* Assinatura da Mensagem */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="external-message-signature" className="font-medium">
                    {t('advancedBot.messageSignature') || 'Assinatura da Mensagem'}
                  </Label>
                  <Textarea
                    id="external-message-signature"
                    value={externalConfigData.advanced_config.message_signature || ''}
                    onChange={e =>
                      handleExternalAdvancedConfigChange({
                        ...externalConfigData.advanced_config!,
                        message_signature: e.target.value,
                      })
                    }
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

            {/* Configurações de Segmentação de Texto */}
            <div className="flex items-start justify-between py-3 border-b">
              <div className="flex items-start gap-3 flex-1">
                <Zap className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="external-enable-text-segmentation" className="font-medium cursor-pointer">
                      {t('advancedBot.enableTextSegmentation') ||
                        'Habilitar segmentação de texto'}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('advancedBot.textSegmentationDescription') ||
                      'Configure como as mensagens longas serão divididas e enviadas'}
                  </p>
                  {externalConfigData.advanced_config.enable_text_segmentation && (
                    <div className="space-y-3 ml-6 border-l-2 border-purple-200 dark:border-purple-800 pl-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="external-max-characters-per-segment" className="text-sm font-medium">
                          {t('advancedBot.maxCharactersPerSegment') ||
                            'Máximo de caracteres por segmento'}
                        </Label>
                        <Input
                          id="external-max-characters-per-segment"
                          type="number"
                          min={50}
                          max={2000}
                          value={externalConfigData.advanced_config.max_characters_per_segment}
                          onChange={e =>
                            handleExternalAdvancedConfigChange({
                              ...externalConfigData.advanced_config!,
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
                        <Label htmlFor="external-min-segment-size" className="text-sm font-medium">
                          {t('advancedBot.minSegmentSize') || 'Tamanho mínimo do segmento'}
                        </Label>
                        <Input
                          id="external-min-segment-size"
                          type="number"
                          min={10}
                          max={500}
                          value={externalConfigData.advanced_config.min_segment_size}
                          onChange={e =>
                            handleExternalAdvancedConfigChange({
                              ...externalConfigData.advanced_config!,
                              min_segment_size: parseInt(e.target.value) || 50,
                            })
                          }
                          className="w-32"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('advancedBot.minSegmentDescription') ||
                            'Tamanho mínimo para criar um novo segmento'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="external-character-delay-ms" className="text-sm font-medium">
                          {t('advancedBot.characterDelayMs') || 'Delay por caractere (ms)'}
                        </Label>
                        <Input
                          id="external-character-delay-ms"
                          type="number"
                          min={0}
                          max={1000}
                          step={0.01}
                          value={externalConfigData.advanced_config.character_delay_ms}
                          onChange={e =>
                            handleExternalAdvancedConfigChange({
                              ...externalConfigData.advanced_config!,
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
              <Switch
                id="external-enable-text-segmentation"
                checked={externalConfigData.advanced_config.enable_text_segmentation}
                onCheckedChange={value =>
                  handleExternalAdvancedConfigChange({
                    ...externalConfigData.advanced_config!,
                    enable_text_segmentation: value,
                  })
                }
              />
            </div>

            {/* Enviar mensagem como resposta na conversa */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <Reply className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="external-send-as-reply" className="font-medium cursor-pointer">
                    {t('edit.configuration.behavior.sendAsReply') ||
                      'Enviar mensagem como resposta na conversa'}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('edit.configuration.behavior.sendAsReplyDescription') ||
                      'Permite que o agente envie mensagens como resposta a uma mensagem específica na conversa'}
                  </p>
                </div>
              </div>
              <Switch
                id="external-send-as-reply"
                checked={behaviorSettings.sendAsReply}
                onCheckedChange={checked =>
                  onBehaviorSettingsChange({ ...behaviorSettings, sendAsReply: checked })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
