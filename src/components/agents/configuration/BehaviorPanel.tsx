import { useLanguage } from '@/hooks/useLanguage';
import {
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import {
  Settings,
  UserRound,
  Bell,
  Globe,
  GitBranch,
  Edit3,
  Tag,
  ShoppingCart,
} from 'lucide-react';
import { BehaviorSettings } from './types';
import AgentToggle from './AgentToggle';

interface BehaviorPanelProps {
  behaviorSettings: BehaviorSettings;
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
  onShowTransferRulesModal: () => void;
  onShowPipelineRulesModal: () => void;
  onShowContactEditModal: () => void;
}

export const BehaviorPanel = ({
  behaviorSettings,
  onBehaviorSettingsChange,
  onShowTransferRulesModal,
  onShowPipelineRulesModal,
  onShowContactEditModal,
}: BehaviorPanelProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
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
        <AgentToggle
          id="transfer-to-human"
          checked={behaviorSettings.transferToHuman}
          onCheckedChange={checked =>
            onBehaviorSettingsChange({ ...behaviorSettings, transferToHuman: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
        <div className="flex items-start gap-3 flex-1">
          <Bell className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="flex-1">
            <Label htmlFor="allow-reminders" className="font-medium cursor-pointer">
              {t('edit.configuration.behavior.allowReminders') || 'Permitir registrar lembretes'}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {t('edit.configuration.behavior.allowRemindersDescription') ||
                'Permite que o agente registre lembretes e tarefas para o usuário'}
            </p>
          </div>
        </div>
        <AgentToggle
          id="allow-reminders"
          checked={behaviorSettings.allowReminders}
          onCheckedChange={checked =>
            onBehaviorSettingsChange({ ...behaviorSettings, allowReminders: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
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
        <AgentToggle
          id="allow-contact-edit"
          checked={behaviorSettings.allowContactEdit}
          onCheckedChange={checked =>
            onBehaviorSettingsChange({ ...behaviorSettings, allowContactEdit: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
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
        <AgentToggle
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

      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
        <div className="flex items-start gap-3 flex-1">
          <Tag className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <Label htmlFor="allow-manage-labels" className="font-medium cursor-pointer">
              {t('edit.configuration.behavior.allowManageLabels') || 'Permitir gerenciar labels'}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              {t('edit.configuration.behavior.allowManageLabelsDescription') ||
                'Permite que o agente adicione e remova labels da conversa atual'}
            </p>
          </div>
        </div>
        <AgentToggle
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

      <div className="flex items-center justify-between gap-4 border-t border-border py-[18px] first:border-t-0">
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
        <AgentToggle
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
              <SelectTrigger id="timezone" className="w-full max-w-md">
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
  );
};
