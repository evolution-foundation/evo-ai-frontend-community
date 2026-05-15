import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  getAgent,
  updateAgent,
  listApiKeys,
  getAccessibleAgents,
  getAgentIntegrations,
} from '@/services/agents';
import { Agent, AgentCreate } from '@/types/agents';
import { toast } from 'sonner';
import { extractBackendErrorMessage } from '@/utils/agentUtils';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';
import SubAgentsForm, { SubAgentsData } from '@/components/ai_agents/Forms/SubAgentsForm';
import { ApiKey } from '@/types/agents';
import integrationService from '@/services/agents/integrationService';
import { CustomTool } from '@/types/ai';
import { MCPServerConfig } from '@/types/ai';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import usersService from '@/services/users/usersService';
import teamsService from '@/services/teams/teamsService';
import ProfileSection from './sections/ProfileSection';
import ProductsSection from './sections/ProductsSection';
import TaskSection from './sections/TaskSection';
import ConfigurationSection from './sections/ConfigurationSection';
import ToolsSection from './sections/ToolsSection';
import MCPServersSection from './sections/MCPServersSection';
import IntegrationsSection from './sections/IntegrationsSection';
import AgentEditSidebar from './sections/AgentEditSidebar';
import AgentEditHeader from './sections/AgentEditHeader';
import AgentTestChat from '@/components/agents/AgentTestChat';
import { Team, Tool } from '@/types';

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

interface AgentFormData {
  name: string;
  description: string;
  role: string;
  goal: string;
  instruction: string;
  config?: {
    knowledge_base_config_id?: string;
  };
}

const AgentEditPage = () => {
  const { t } = useLanguage('aiAgents');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeMenu, setActiveMenu] = useState<SidebarMenu>('profile');
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);


  const [agent, setAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    role: '',
    goal: '',
    instruction: '',
  });

  // Estados de configuração
  const [llmConfigData, setLLMConfigData] = useState<LLMConfigData | null>(null);
  const [a2aConfigData, setA2AConfigData] = useState<A2AConfigData | null>(null);
  const [taskConfigData, setTaskConfigData] = useState<TaskConfigData | null>(null);
  const [externalConfigData, setExternalConfigData] = useState<{
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  } | null>(null);
  const [subAgentsData, setSubAgentsData] = useState<SubAgentsData>({ sub_agents: [] });
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // Estados de configurações avançadas (aplicáveis a todos os tipos)
  const [outputSchema, setOutputSchema] = useState<
    Record<string, { type?: string; description?: string }>
  >({});
  const [advancedSettings, setAdvancedSettings] = useState({
    load_memory: false,
    preload_memory: false,
    memory_short_term_max_messages: 50,
    memory_medium_term_compression_interval: 10,
    memory_base_config_id: undefined as string | undefined,
    planner: false,
    load_knowledge: false,
    preload_knowledge: false,
    knowledge_tags: [] as string[],
    knowledge_base_config_id: undefined as string | undefined,
    knowledge_max_results: 5,
  });

  // Estados de comportamento
  const [behaviorSettings, setBehaviorSettings] = useState({
    transferToHuman: false,
    useEmojis: false,
    allowReminders: false,
    allowPipelineManipulation: false,
    allowContactEdit: false,
    allowManageLabels: false,
    allowProductSales: false,
    timezone: 'America/Sao_Paulo',
    sendAsReply: false,
  });

  // Estados de ações de inatividade e regras de transferência
  const [inactivityActions, setInactivityActions] = useState<
    Array<{
      id: string;
      minutes: number;
      action: 'interact' | 'finalize';
      message?: string;
    }>
  >([]);
  const [transferRules, setTransferRules] = useState<
    Array<{
      id: string;
      transferTo: 'human' | 'team';
      userId?: string;
      userName?: string;
      teamId?: string;
      teamName?: string;
      returnOnFinish: boolean;
      instructions: string;
    }>
  >([]);
  const [pipelineRules, setPipelineRules] = useState<
    Array<{
      id: string;
      pipelineId: string;
      pipelineName?: string;
      allowTasks: boolean;
      allowServices: boolean;
      generalInstructions: string;
      stages: Array<{
        id: string;
        stageId: string;
        stageName?: string;
        instructions: string;
      }>;
    }>
  >([]);
  const [contactEditConfig, setContactEditConfig] = useState<{
    enabled: boolean;
    editableFields: string[];
    instructions: string;
  }>({
    enabled: false,
    editableFields: [],
    instructions: '',
  });

  // Estados de ferramentas e MCP
  const [tools, setTools] = useState<Tool[]>([]);
  const [agentTools, setAgentTools] = useState<string[]>([]);
  const [agentToolsData, setAgentToolsData] = useState<Agent[]>([]);
  const [customTools, setCustomTools] = useState<{ http_tools: CustomTool[] }>({ http_tools: [] });
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [customMCPServerIds, setCustomMCPServerIds] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<Record<string, any>>({});

  // Estado de pipelines, usuários e times disponíveis
  const [availablePipelines, setAvailablePipelines] = useState<
    Array<{
      id: string;
      name: string;
      stages: Array<{ id: string; name: string }>;
    }>
  >([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);

  // Read tab query parameter and set active menu
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      // Map query param to SidebarMenu type
      const validTabs: Record<string, SidebarMenu> = {
        'mcp-servers': 'mcpServers',
        profile: 'profile',
        task: 'task',
        'sub-agents': 'subAgents',
        configuration: 'configuration',
        knowledge: 'knowledge',
        tools: 'tools',
        integrations: 'integrations',
        channels: 'channels',
        settings: 'settings',
      };

      const menu = validTabs[tabParam];
      if (menu) {
        setActiveMenu(menu);
        // Remove the tab param from URL after setting the menu
        searchParams.delete('tab');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, setSearchParams]);

  // Open test chat drawer when ?test=1 is present (wizard "test agent" card)
  useEffect(() => {
    if (searchParams.get('test') === '1') {
      setIsTestChatOpen(true);
      searchParams.delete('test');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Redirect blocked menus for external agents
  useEffect(() => {
    if (agent?.type === 'external') {
      const blockedMenus: SidebarMenu[] = ['knowledge', 'tools', 'integrations', 'mcpServers'];
      if (blockedMenus.includes(activeMenu)) {
        setActiveMenu('profile');
      }
    }
  }, [agent?.type, activeMenu]);

  // Carregar API Keys
  const loadApiKeys = useCallback(async () => {
    try {
      const apiKeysData = await listApiKeys();
      setApiKeys(apiKeysData);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // Carregar Pipelines
  const loadPipelines = useCallback(async () => {
    try {
      const response = await pipelinesService.getPipelines();
      const pipelines = response.data || [];

      // Transform to the format expected by the components
      const transformedPipelines = pipelines.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        stages: (pipeline.stages || []).map(stage => ({
          id: stage.id,
          name: stage.name,
        })),
      }));

      setAvailablePipelines(transformedPipelines);
    } catch (error) {
      console.error('Error loading pipelines:', error);
      // Não mostra toast de erro para não incomodar o usuário
      // Os pipelines são opcionais na configuração do agente
    }
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  // Carregar Usuários
  const loadUsers = useCallback(async () => {
    try {
      const response = await usersService.getUsers();
      const users = response.data || [];

      // Transform to the format expected by the components
      const transformedUsers = users.map(user => ({
        id: user.id,
        name: user.name || user.email,
      }));

      setAvailableUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // Não mostra toast de erro para não incomodar o usuário
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Carregar Times
  const loadTeams = useCallback(async () => {
    try {
      const response = await teamsService.getTeams();
      // Response can be array directly or paginated
      const teams = Array.isArray(response) ? response : response.data || response.data || [];

      // Transform to the format expected by the components
      const transformedTeams = teams.map((team: Team) => ({
        id: team.id,
        name: team.name,
      }));

      setAvailableTeams(transformedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      // Não mostra toast de erro para não incomodar o usuário
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Função auxiliar para carregar dados completos dos agentes pelos IDs
  const loadAgentToolsData = useCallback(async (agentIds: string[]) => {
    if (agentIds.length === 0) return [];
    try {
      // Buscar todos os agentes acessíveis
      const { data: allAgents } = await getAccessibleAgents(0, 1000);

      // Filtrar apenas os agentes que estão nos IDs fornecidos
      const agentToolsData = allAgents.filter((agent: any) => agentIds.includes(agent.id));

      return agentToolsData;
    } catch (error) {
      console.error('Error loading agent tools:', error);
      return [];
    }
  }, []);

  // Carregar agente
  useEffect(() => {
    const loadAgent = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const agentData = await getAgent(id);
        setAgent(agentData);
        setFormData({
          name: agentData.name || '',
          description: agentData.description || '',
          role: agentData.role || '',
          goal: agentData.goal || '',
          instruction: agentData.instruction || '',
        });

        // Carregar dados de configuração baseado no tipo
        if (agentData.type === 'llm') {
          const instruction = agentData.instruction || '';
          setLLMConfigData({
            model: agentData.model || '',
            api_key_id: agentData.api_key_id || '',
            instruction: instruction,
            output_key: agentData.config?.output_key || '',
            advanced_config: {
              message_wait_time: agentData.config?.message_wait_time ?? 5,
              message_signature: agentData.config?.message_signature ?? '',
              enable_text_segmentation: agentData.config?.enable_text_segmentation ?? false,
              max_characters_per_segment: agentData.config?.max_characters_per_segment ?? 300,
              min_segment_size: agentData.config?.min_segment_size ?? 50,
              character_delay_ms: agentData.config?.character_delay_ms ?? 0.05,
            },
          });
          // Sincronizar instrução com formData
          setFormData(prev => ({ ...prev, instruction }));
        } else if (agentData.type === 'a2a') {
          setA2AConfigData({
            agent_card_url: agentData.agent_card_url || '',
            output_key: agentData.config?.output_key || '',
            external_sharing: agentData.config?.external_sharing || {
              enabled: false,
              allowlist: [],
              callback_url: '',
              publish_state: 'draft',
            },
          });
        } else if (agentData.type === 'task') {
          setTaskConfigData({
            tasks: (agentData.config?.tasks || []) as Array<{
              agent_id: string;
              description: string;
              expected_output: string;
              enabled_tools: string[];
            }>,
          });
        } else if (agentData.type === 'external') {
          // Carregar configuração de integração externa
          const provider = agentData.config?.provider as string;
          let config = {
            provider: undefined,
            advanced_config: {
              message_wait_time: agentData.config?.message_wait_time ?? 5,
              message_signature: agentData.config?.message_signature ?? '',
              enable_text_segmentation: agentData.config?.enable_text_segmentation ?? false,
              max_characters_per_segment: agentData.config?.max_characters_per_segment ?? 300,
              min_segment_size: agentData.config?.min_segment_size ?? 50,
              character_delay_ms: agentData.config?.character_delay_ms ?? 0.05,
            },
          };

          if (provider) {
            try {
              await integrationService.getIntegration(id!, provider);
            } catch (error) {
              console.error('Error loading external integration:', error);
            }

            config = {
              provider: provider as any,
              advanced_config: {
                message_wait_time: agentData.config?.message_wait_time ?? 5,
                message_signature: agentData.config?.message_signature ?? '',
                enable_text_segmentation: agentData.config?.enable_text_segmentation ?? false,
                max_characters_per_segment: agentData.config?.max_characters_per_segment ?? 300,
                min_segment_size: agentData.config?.min_segment_size ?? 50,
                character_delay_ms: agentData.config?.character_delay_ms ?? 0.05,
              }
            };
          }

          setExternalConfigData(config);
        }

        // Carregar sub-agentes (aplicável a todos os tipos)
        setSubAgentsData({
          sub_agents: agentData.config?.sub_agents || [],
        });

        // Carregar configurações avançadas (aplicável a todos os tipos)
        setOutputSchema(
          (agentData.config?.output_schema || {}) as Record<
            string,
            { type?: string; description?: string }
          >,
        );
        setAdvancedSettings({
          load_memory: agentData.config?.load_memory || false,
          preload_memory: agentData.config?.preload_memory || false,
          planner: agentData.config?.planner || false,
          load_knowledge: agentData.config?.load_knowledge || false,
          preload_knowledge: agentData.config?.preload_knowledge || false,
          memory_short_term_max_messages: agentData.config?.memory_short_term_max_messages || 50,
          memory_medium_term_compression_interval:
            agentData.config?.memory_medium_term_compression_interval || 10,
          memory_base_config_id: agentData.config?.memory_base_config_id,
          knowledge_tags: agentData.config?.knowledge_tags || [],
          knowledge_base_config_id: agentData.config?.knowledge_base_config_id,
          knowledge_max_results: agentData.config?.knowledge_max_results || 5,
        });

        // Carregar configurações de comportamento
        const config = agentData.config as Record<string, unknown>;
        setBehaviorSettings({
          transferToHuman: (config?.transfer_to_human as boolean) || false,
          useEmojis: (config?.use_emojis as boolean) || false,
          allowReminders: (config?.allow_reminders as boolean) || false,
          allowPipelineManipulation: (config?.allow_pipeline_manipulation as boolean) || false,
          allowContactEdit: (config?.allow_contact_edit as boolean) || false,
          allowManageLabels: (config?.allow_manage_labels as boolean) || false,
          allowProductSales: (config?.allow_product_sales as boolean) || false,
          timezone: (config?.timezone as string) || 'America/Sao_Paulo',
          sendAsReply: (config?.send_as_reply as boolean) || false,
        });

        // Carregar ações de inatividade, regras de transferência e pipeline
        setInactivityActions(
          (config?.inactivity_actions as Array<{
            id: string;
            minutes: number;
            action: 'interact' | 'finalize';
            message?: string;
          }>) || [],
        );

        setTransferRules(
          (config?.transfer_rules as Array<{
            id: string;
            transferTo: 'human' | 'team';
            userId?: string;
            userName?: string;
            teamId?: string;
            teamName?: string;
            returnOnFinish: boolean;
            instructions: string;
          }>) || [],
        );

        setPipelineRules(
          (config?.pipeline_rules as Array<{
            id: string;
            pipelineId: string;
            pipelineName?: string;
            allowTasks: boolean;
            allowServices: boolean;
            generalInstructions: string;
            stages: Array<{
              id: string;
              stageId: string;
              stageName?: string;
              instructions: string;
            }>;
          }>) || [],
        );

        setContactEditConfig(
          (config?.contact_edit_config as {
            enabled: boolean;
            editableFields: string[];
            instructions: string;
          }) || {
            enabled: false,
            editableFields: [],
            instructions: '',
          },
        );

        // Carregar ferramentas (aplicável a todos os tipos)
        setTools((agentData.config?.tools || []) as unknown as Tool[]);
        const agentToolsIds = agentData.config?.agent_tools || [];
        setAgentTools(agentToolsIds);
        const agentToolsDataLoaded = await loadAgentToolsData(agentToolsIds);
        setAgentToolsData(agentToolsDataLoaded as unknown as Agent[]);
        setCustomTools({
          http_tools: (agentData.config?.custom_tools?.http_tools || []) as CustomTool[],
        });
        setMcpServers((agentData.config?.mcp_servers || []) as unknown as MCPServerConfig[]);
        setCustomMCPServerIds(agentData.config?.custom_mcp_server_ids || []);

        // Load integrations from agent config
        const configIntegrations = agentData.config?.integrations || {};

        // Load integrations from backend API
        try {
          const backendIntegrations = await getAgentIntegrations(id);
          const mergedIntegrations: Record<string, any> = { ...configIntegrations };

          // Map backend integrations to frontend format
          // Backend uses provider names like "google_calendar", frontend uses "google-calendar"
          backendIntegrations.forEach((integration: any) => {
            const frontendKey = integration.provider.replace(/_/g, '-');
            // Merge backend config with any existing frontend config
            mergedIntegrations[frontendKey] = {
              ...mergedIntegrations[frontendKey],
              ...integration.config,
              provider: integration.provider,
              connected: true, // Mark as connected since it exists in backend
            };
          });

          setIntegrations(mergedIntegrations);
        } catch (error) {
          console.error('Error loading backend integrations:', error);
          // Fall back to config integrations only
          setIntegrations(configIntegrations);
        }
      } catch (error) {
        console.error('Error loading agent:', error);
        toast.error(t('messages.loadError') || 'Error loading agent');
        navigate('/agents/list');
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [id, navigate, t, loadAgentToolsData]);

  const handleFormDataChange = useCallback(
    (field: string, value: string) => {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
      // Sincronizar instrução com llmConfigData se for tipo LLM
      if (field === 'instruction' && agent?.type === 'llm' && llmConfigData) {
        setLLMConfigData(prev => (prev ? { ...prev, instruction: value } : null));
      }
      setIsDirty(true);
    },
    [agent?.type, llmConfigData],
  );

  const handleSave = async () => {
    if (!id || !agent) return;

    try {
      setIsSaving(true);
      const toastId = toast.loading(t('messages.saving') || 'Saving...');

      // Montar dados do agente baseado no tipo
      const agentUpdateData: Partial<AgentCreate> = {
        name: formData.name,
        description: formData.description,
        type: agent.type, // Campo obrigatório no backend
        role: formData.role,
        goal: formData.goal,
        instruction: formData.instruction,
      };

      // Adicionar configurações específicas do tipo
      if (agent.type === 'llm' && llmConfigData) {
        agentUpdateData.model = llmConfigData.model;
        agentUpdateData.api_key_id = llmConfigData.api_key_id;
        agentUpdateData.instruction = llmConfigData.instruction;
        agentUpdateData.config = {
          output_key: llmConfigData.output_key,
          message_wait_time: llmConfigData.advanced_config.message_wait_time,
          message_signature: llmConfigData.advanced_config.message_signature,
          enable_text_segmentation: llmConfigData.advanced_config.enable_text_segmentation,
          max_characters_per_segment: llmConfigData.advanced_config.max_characters_per_segment,
          min_segment_size: llmConfigData.advanced_config.min_segment_size,
          character_delay_ms: llmConfigData.advanced_config.character_delay_ms,
          sub_agents: subAgentsData.sub_agents,
          output_schema: outputSchema,
          load_memory: advancedSettings.load_memory,
          preload_memory: advancedSettings.preload_memory,
          memory_short_term_max_messages: advancedSettings.memory_short_term_max_messages,
          memory_medium_term_compression_interval:
            advancedSettings.memory_medium_term_compression_interval,
          memory_base_config_id: advancedSettings.memory_base_config_id,
          planner: advancedSettings.planner,
          load_knowledge: advancedSettings.load_knowledge,
          preload_knowledge: advancedSettings.preload_knowledge,
          knowledge_tags: advancedSettings.knowledge_tags,
          knowledge_base_config_id: advancedSettings.knowledge_base_config_id,
          knowledge_max_results: advancedSettings.knowledge_max_results,
          tools: tools.map(tool => tool as unknown as Record<string, unknown>),
          agent_tools: agentTools,
          custom_tools: customTools,
          mcp_servers: mcpServers.map(server => server as unknown as Record<string, unknown>),
          custom_mcp_server_ids: customMCPServerIds,
          integrations: integrations,
          transfer_to_human: behaviorSettings.transferToHuman,
          use_emojis: behaviorSettings.useEmojis,
          allow_reminders: behaviorSettings.allowReminders,
          allow_pipeline_manipulation: behaviorSettings.allowPipelineManipulation,
          allow_contact_edit: behaviorSettings.allowContactEdit,
          allow_manage_labels: behaviorSettings.allowManageLabels,
          allow_product_sales: behaviorSettings.allowProductSales,
          timezone: behaviorSettings.timezone,
          send_as_reply: behaviorSettings.sendAsReply,
          inactivity_actions: inactivityActions,
          transfer_rules: transferRules,
          pipeline_rules: pipelineRules,
          contact_edit_config: contactEditConfig,
        } as Record<string, unknown>;
      } else if (agent.type === 'a2a' && a2aConfigData) {
        agentUpdateData.card_url = a2aConfigData.agent_card_url;
        agentUpdateData.config = {
          output_key: a2aConfigData.output_key,
          external_sharing: a2aConfigData.external_sharing,
          sub_agents: subAgentsData.sub_agents,
          output_schema: outputSchema,
          load_memory: advancedSettings.load_memory,
          preload_memory: advancedSettings.preload_memory,
          memory_short_term_max_messages: advancedSettings.memory_short_term_max_messages,
          memory_medium_term_compression_interval:
            advancedSettings.memory_medium_term_compression_interval,
          memory_base_config_id: advancedSettings.memory_base_config_id,
          planner: advancedSettings.planner,
          load_knowledge: advancedSettings.load_knowledge,
          preload_knowledge: advancedSettings.preload_knowledge,
          knowledge_tags: advancedSettings.knowledge_tags,
          knowledge_base_config_id: advancedSettings.knowledge_base_config_id,
          knowledge_max_results: advancedSettings.knowledge_max_results,
          tools: tools.map(tool => tool as unknown as Record<string, unknown>),
          agent_tools: agentTools,
          custom_tools: customTools,
          mcp_servers: mcpServers.map(server => server as unknown as Record<string, unknown>),
          custom_mcp_server_ids: customMCPServerIds,
          integrations: integrations,
          transfer_to_human: behaviorSettings.transferToHuman,
          use_emojis: behaviorSettings.useEmojis,
          allow_reminders: behaviorSettings.allowReminders,
          allow_pipeline_manipulation: behaviorSettings.allowPipelineManipulation,
          allow_contact_edit: behaviorSettings.allowContactEdit,
          allow_manage_labels: behaviorSettings.allowManageLabels,
          allow_product_sales: behaviorSettings.allowProductSales,
          timezone: behaviorSettings.timezone,
          send_as_reply: behaviorSettings.sendAsReply,
          inactivity_actions: inactivityActions,
          transfer_rules: transferRules,
          pipeline_rules: pipelineRules,
          contact_edit_config: contactEditConfig,
        } as Record<string, unknown>;
      } else if (agent.type === 'task' && taskConfigData) {
        agentUpdateData.config = {
          tasks: taskConfigData.tasks.map(task => task as unknown as Record<string, unknown>),
          sub_agents: subAgentsData.sub_agents,
          output_schema: outputSchema,
          load_memory: advancedSettings.load_memory,
          preload_memory: advancedSettings.preload_memory,
          memory_short_term_max_messages: advancedSettings.memory_short_term_max_messages,
          memory_medium_term_compression_interval:
            advancedSettings.memory_medium_term_compression_interval,
          memory_base_config_id: advancedSettings.memory_base_config_id,
          planner: advancedSettings.planner,
          load_knowledge: advancedSettings.load_knowledge,
          preload_knowledge: advancedSettings.preload_knowledge,
          knowledge_tags: advancedSettings.knowledge_tags,
          knowledge_base_config_id: advancedSettings.knowledge_base_config_id,
          knowledge_max_results: advancedSettings.knowledge_max_results,
          tools: tools.map(tool => tool as unknown as Record<string, unknown>),
          agent_tools: agentTools,
          custom_tools: customTools,
          mcp_servers: mcpServers.map(server => server as unknown as Record<string, unknown>),
          custom_mcp_server_ids: customMCPServerIds,
          integrations: integrations,
          transfer_to_human: behaviorSettings.transferToHuman,
          use_emojis: behaviorSettings.useEmojis,
          allow_reminders: behaviorSettings.allowReminders,
          allow_pipeline_manipulation: behaviorSettings.allowPipelineManipulation,
          allow_contact_edit: behaviorSettings.allowContactEdit,
          allow_manage_labels: behaviorSettings.allowManageLabels,
          allow_product_sales: behaviorSettings.allowProductSales,
          timezone: behaviorSettings.timezone,
          send_as_reply: behaviorSettings.sendAsReply,
          inactivity_actions: inactivityActions,
          transfer_rules: transferRules,
          pipeline_rules: pipelineRules,
          contact_edit_config: contactEditConfig,
        } as Record<string, unknown>;
      } else if (agent.type === 'external' && externalConfigData) {
        agentUpdateData.config = {
          provider: externalConfigData.provider,
          sub_agents: subAgentsData.sub_agents,
          message_wait_time: externalConfigData.advanced_config?.message_wait_time ?? 5,
          message_signature: externalConfigData.advanced_config?.message_signature ?? '',
          enable_text_segmentation: externalConfigData.advanced_config?.enable_text_segmentation ?? false,
          max_characters_per_segment: externalConfigData.advanced_config?.max_characters_per_segment ?? 300,
          min_segment_size: externalConfigData.advanced_config?.min_segment_size ?? 50,
          character_delay_ms: externalConfigData.advanced_config?.character_delay_ms ?? 0.05,
          send_as_reply: behaviorSettings.sendAsReply,
        } as Record<string, unknown>;
      } else {
        // Para outros tipos, adicionar configurações avançadas
        agentUpdateData.config = {
          sub_agents: subAgentsData.sub_agents,
          output_schema: outputSchema,
          load_memory: advancedSettings.load_memory,
          preload_memory: advancedSettings.preload_memory,
          memory_short_term_max_messages: advancedSettings.memory_short_term_max_messages,
          memory_medium_term_compression_interval:
            advancedSettings.memory_medium_term_compression_interval,
          memory_base_config_id: advancedSettings.memory_base_config_id,
          planner: advancedSettings.planner,
          load_knowledge: advancedSettings.load_knowledge,
          preload_knowledge: advancedSettings.preload_knowledge,
          knowledge_tags: advancedSettings.knowledge_tags,
          knowledge_base_config_id: advancedSettings.knowledge_base_config_id,
          knowledge_max_results: advancedSettings.knowledge_max_results,
          tools: tools.map(tool => tool as unknown as Record<string, unknown>),
          agent_tools: agentTools,
          custom_tools: customTools,
          mcp_servers: mcpServers.map(server => server as unknown as Record<string, unknown>),
          custom_mcp_server_ids: customMCPServerIds,
          integrations: integrations,
          transfer_to_human: behaviorSettings.transferToHuman,
          use_emojis: behaviorSettings.useEmojis,
          allow_reminders: behaviorSettings.allowReminders,
          allow_pipeline_manipulation: behaviorSettings.allowPipelineManipulation,
          allow_contact_edit: behaviorSettings.allowContactEdit,
          allow_manage_labels: behaviorSettings.allowManageLabels,
          allow_product_sales: behaviorSettings.allowProductSales,
          timezone: behaviorSettings.timezone,
          send_as_reply: behaviorSettings.sendAsReply,
          inactivity_actions: inactivityActions,
          transfer_rules: transferRules,
          pipeline_rules: pipelineRules,
          contact_edit_config: contactEditConfig,
        } as Record<string, unknown>;
      }

      await updateAgent(id, agentUpdateData);

      toast.success(t('messages.saveSuccess') || 'Agent saved successfully!', { id: toastId });
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving agent:', error);
      const errorMessage = extractBackendErrorMessage(error);
      toast.error(t('messages.saveError') || 'Error saving agent', {
        description: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (!agent) return null;

    switch (activeMenu) {
      case 'profile':
        return (
          <ProfileSection
            formData={formData}
            onFormDataChange={handleFormDataChange}
            agentType={agent.type}
          />
        );

      case 'task':
        return (
          <TaskSection
            data={taskConfigData || { tasks: [] }}
            onChange={data => {
              setTaskConfigData(data);
              setIsDirty(true);
            }}
            editingAgentId={id}
            folderId={undefined}
          />
        );

      case 'subAgents':
        return (
          <SubAgentsForm
            mode="edit"
            data={subAgentsData}
            onChange={data => {
              setSubAgentsData(data);
              setIsDirty(true);
            }}
            onValidationChange={() => {}}
            editingAgentId={id}
            folderId={undefined}
          />
        );

      case 'configuration':
        return (
          <ConfigurationSection
            agent={agent}
            llmConfigData={llmConfigData}
            a2aConfigData={a2aConfigData}
            taskConfigData={taskConfigData}
            externalConfigData={externalConfigData}
            apiKeys={apiKeys}
            outputSchema={outputSchema}
            advancedSettings={advancedSettings}
            behaviorSettings={behaviorSettings}
            inactivityActions={inactivityActions}
            transferRules={transferRules}
            pipelineRules={pipelineRules}
            contactEditConfig={contactEditConfig}
            availablePipelines={availablePipelines}
            availableUsers={availableUsers}
            availableTeams={availableTeams}
            onLLMConfigChange={data => {
              setLLMConfigData(data);
              setIsDirty(true);
            }}
            onA2AConfigChange={data => {
              setA2AConfigData(data);
              setIsDirty(true);
            }}
            onTaskConfigChange={data => {
              setTaskConfigData(data);
              setIsDirty(true);
            }}
            onExternalConfigChange={data => {
              setExternalConfigData(data);
              setIsDirty(true);
            }}
            onOutputSchemaChange={schema => {
              setOutputSchema(schema);
              setIsDirty(true);
            }}
            onAdvancedSettingsChange={settings => {
              // Only update planner from ConfigurationSection, keep knowledge/memory settings
              setAdvancedSettings(prev => ({
                ...prev,
                planner: settings.planner,
              }));
              setIsDirty(true);
            }}
            onBehaviorSettingsChange={settings => {
              setBehaviorSettings(settings);
              setIsDirty(true);
            }}
            onInactivityActionsChange={actions => {
              setInactivityActions(actions);
              setIsDirty(true);
            }}
            onTransferRulesChange={rules => {
              setTransferRules(rules);
              setIsDirty(true);
            }}
            onPipelineRulesChange={rules => {
              setPipelineRules(rules);
              setIsDirty(true);
            }}
            onContactEditConfigChange={config => {
              setContactEditConfig(config);
              setIsDirty(true);
            }}
            onInstructionSync={instruction => {
              setFormData(prev => ({ ...prev, instruction }));
            }}
            onApiKeysReload={loadApiKeys}
          />
        );

      case 'tools':
        return (
          <ToolsSection
            agentTools={agentTools}
            agentToolsData={agentToolsData}
            customTools={customTools}
            onAgentToolsChange={(newAgentTools, newAgentToolsData) => {
              setAgentTools(newAgentTools);
              setAgentToolsData(newAgentToolsData || []);
              setIsDirty(true);
            }}
            onCustomToolsChange={newCustomTools => {
              setCustomTools(newCustomTools);
              setIsDirty(true);
            }}
            editingAgentId={id}
            folderId={undefined}
          />
        );

      case 'mcpServers':
        return (
          <MCPServersSection
            mcpServers={mcpServers}
            customMCPServerIds={customMCPServerIds}
            onMCPServersChange={newMcpServers => {
              setMcpServers(newMcpServers);
              setIsDirty(true);
            }}
            onCustomMCPServersChange={newCustomMCPServerIds => {
              setCustomMCPServerIds(newCustomMCPServerIds);
              setIsDirty(true);
            }}
            agentId={id || ''}
          />
        );

      case 'integrations':
        return (
          <IntegrationsSection
            integrations={integrations}
            agentId={id || ''}
            onIntegrationsChange={newIntegrations => {
              setIntegrations(newIntegrations);
              setIsDirty(true);
            }}
          />
        );

      case 'products':
        return <ProductsSection agent={agent} />;

      case 'channels':
      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {t(`edit.${activeMenu}.title`) || activeMenu}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(`edit.${activeMenu}.subtitle`) || 'Em breve...'}
              </p>
            </div>
            <div className="text-center py-12 text-muted-foreground">
              {t(`edit.${activeMenu}.comingSoon`) || 'Em breve...'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <AgentEditSidebar
        agent={agent}
        agentName={formData.name || agent.name}
        activeMenu={activeMenu}
        onMenuChange={setActiveMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AgentEditHeader
          onBack={() => navigate('/agents/list')}
          onSave={handleSave}
          onTestAgent={() => setIsTestChatOpen(true)}
          isDirty={isDirty}
          isSaving={isSaving}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderContent()}</div>
      </div>

      {/* Chat de Teste */}
      {agent && (
        <AgentTestChat open={isTestChatOpen} onOpenChange={setIsTestChatOpen} agent={agent} />
      )}
    </div>
  );
};

export default AgentEditPage;
