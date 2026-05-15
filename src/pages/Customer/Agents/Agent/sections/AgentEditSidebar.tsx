import { User, Wrench, Plug, Server, Users, ListChecks, Settings, Package } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Agent } from '@/types/agents';

type SidebarMenu =
  | 'profile'
  | 'task'
  | 'subAgents'
  | 'configuration'
  | 'knowledge'
  | 'tools'
  | 'integrations'
  | 'mcpServers'
  | 'channels'
  | 'products'
  | 'settings';

interface AgentEditSidebarProps {
  agent: Agent;
  agentName: string;
  activeMenu: SidebarMenu;
  onMenuChange: (menu: SidebarMenu) => void;
  onTestAI?: () => void;
}

const getAgentTypeLabel = (type: string, t: (key: string) => string): string => {
  const typeLabels: Record<string, string> = {
    llm: t('basicInfo.types.llm') || 'LLM',
    a2a: t('basicInfo.types.a2a') || 'A2A',
    sequential: t('basicInfo.types.sequential') || 'Sequencial',
    parallel: t('basicInfo.types.parallel') || 'Paralelo',
    loop: t('basicInfo.types.loop') || 'Loop',
    workflow: t('basicInfo.types.workflow') || 'Workflow',
    task: t('basicInfo.types.task') || 'Task',
    external: t('basicInfo.types.external') || 'Integração Externa',
  };
  return typeLabels[type] || type;
};

const AgentEditSidebar = ({
  agent,
  agentName,
  activeMenu,
  onMenuChange,
  onTestAI,
}: AgentEditSidebarProps) => {
  const { t } = useLanguage('aiAgents');

  // Tipos orquestradores (que usam sub-agentes ou tarefas, não tem role/goal/behavior)
  const isOrchestratorType = ['sequential', 'parallel', 'loop', 'task'].includes(agent.type || '');
  const isTaskType = agent.type === 'task';
  const isSubAgentType = ['llm', 'sequential', 'parallel', 'loop'].includes(agent.type || '');
  const isExternalType = agent.type === 'external';

  // Construir menu dinamicamente baseado no tipo
  const allMenuItems: Array<{ id: SidebarMenu; label: string; icon: typeof User; show: boolean }> =
    [
      { id: 'profile', label: t('edit.menu.profile') || 'Perfil', icon: User, show: true },
      { id: 'task', label: t('edit.menu.task') || 'Tarefa', icon: ListChecks, show: isTaskType },
      {
        id: 'subAgents',
        label: t('edit.menu.subAgents') || 'Sub Agentes',
        icon: Users,
        show: isSubAgentType,
      },
      {
        id: 'tools',
        label: t('edit.menu.tools') || 'Ferramentas',
        icon: Wrench,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'integrations',
        label: t('edit.menu.integrations') || 'Integrações',
        icon: Plug,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'mcpServers',
        label: t('edit.menu.mcpServers') || 'Servidores MCP',
        icon: Server,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'products',
        label: t('edit.menu.products') || 'Produtos',
        icon: Package,
        show: !isOrchestratorType,
      },
      {
        id: 'configuration',
        label: t('edit.menu.configuration') || 'Configuração',
        icon: Settings,
        show: true,
      },
    ];

  // Filtrar apenas os itens que devem ser mostrados
  const menuItems = allMenuItems.filter(item => item.show);

  const agentTypeLabel = getAgentTypeLabel(agent.type || 'llm', t);

  // Get agent type styles (same as AgentCard)
  const typeStyles: Record<string, { badge: string; ring: string; accent: string }> = {
    llm: {
      badge: 'border-green-500 text-green-400 bg-green-500/10',
      ring: 'ring-1 ring-green-500/40',
      accent: 'from-green-500/10 to-transparent',
    },
    a2a: {
      badge: 'border-blue-500 text-blue-400 bg-blue-500/10',
      ring: 'ring-1 ring-blue-500/40',
      accent: 'from-blue-500/10 to-transparent',
    },
    sequential: {
      badge: 'border-amber-500 text-amber-400 bg-amber-500/10',
      ring: 'ring-1 ring-amber-500/40',
      accent: 'from-amber-500/10 to-transparent',
    },
    parallel: {
      badge: 'border-violet-500 text-violet-400 bg-violet-500/10',
      ring: 'ring-1 ring-violet-500/40',
      accent: 'from-violet-500/10 to-transparent',
    },
    loop: {
      badge: 'border-indigo-500 text-indigo-400 bg-indigo-500/10',
      ring: 'ring-1 ring-indigo-500/40',
      accent: 'from-indigo-500/10 to-transparent',
    },
    external: {
      badge: 'border-purple-500 text-purple-400 bg-purple-500/10',
      ring: 'ring-1 ring-purple-500/40',
      accent: 'from-purple-500/10 to-transparent',
    },
    default: {
      badge: 'border-slate-500 text-slate-300 bg-slate-500/10',
      ring: 'ring-1 ring-slate-500/40',
      accent: 'from-slate-500/10 to-transparent',
    },
  };

  const style = typeStyles[agent.type as keyof typeof typeStyles] || typeStyles.default;

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Agent Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center bg-sidebar-accent/50 ${style.ring} relative overflow-hidden flex-shrink-0`}
          >
            <span className="text-sm font-semibold z-10 text-sidebar-foreground">
              {agentName?.charAt(0).toUpperCase()}
            </span>
            <span className={`absolute inset-0 bg-gradient-to-br ${style.accent}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-sidebar-foreground">{agentName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{agentTypeLabel}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <nav className="space-y-1.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onMenuChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Test Button */}
      {onTestAI && (
        <div className="p-4 border-t">
          <button
            onClick={onTestAI}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('edit.testAI') || 'Teste sua IA'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AgentEditSidebar;
