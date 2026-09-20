import { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@evoapi/design-system';
import { User, Wrench, Package, Settings, Radio } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  AGENT_TAB_ICON_CLASS,
  AGENT_TAB_LIST_CLASS,
  AGENT_TAB_TRIGGER_CLASS,
  AgentDetailTab,
  getVisibleAgentTabs,
} from './agentTabs';

interface AgentDetailTabsProps {
  agentType?: string;
  value: AgentDetailTab;
  onValueChange: (tab: AgentDetailTab) => void;
  children: ReactNode;
}

const AgentDetailTabs = ({ agentType, value, onValueChange, children }: AgentDetailTabsProps) => {
  const { t } = useLanguage('aiAgents');
  const visibleTabs = getVisibleAgentTabs(agentType);

  const tabConfig: Record<AgentDetailTab, { label: string; icon: typeof User }> = {
    profile: { label: t('edit.menu.profile') || 'Perfil', icon: User },
    tools: { label: t('edit.menu.tools') || 'Ferramentas', icon: Wrench },
    products: { label: t('edit.menu.products') || 'Produtos', icon: Package },
    configuration: { label: t('edit.menu.configuration') || 'Configuração', icon: Settings },
    channels: { label: t('edit.menu.channels') || 'Canais', icon: Radio },
  };

  return (
    <Tabs
      value={value}
      onValueChange={tab => onValueChange(tab as AgentDetailTab)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex-shrink-0 border-b border-border bg-card px-9 pt-[22px]">
        <TabsList className={`${AGENT_TAB_LIST_CLASS} pb-[14px]`}>
          {visibleTabs.map(tab => {
            const Icon = tabConfig[tab].icon;
            return (
              <TabsTrigger key={tab} value={tab} className={AGENT_TAB_TRIGGER_CLASS}>
                <Icon className={AGENT_TAB_ICON_CLASS} />
                {tabConfig[tab].label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-9 pb-[60px] pt-[26px]">{children}</div>
    </Tabs>
  );
};

export default AgentDetailTabs;
