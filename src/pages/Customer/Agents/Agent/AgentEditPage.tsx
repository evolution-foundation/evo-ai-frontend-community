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
import { SubAgentsData } from '@/components/ai_agents/Forms/SubAgentsForm';
import { ApiKey } from '@/types/agents';
import integrationService from '@/services/agents/integrationService';
import { CustomTool } from '@/types/ai';
import { MCPServerConfig } from '@/types/ai';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import usersService from '@/services/users/usersService';
import teamsService from '@/services/teams/teamsService';
import ProfileSection from './sections/ProfileSection';
import ProductsSection from './sections/ProductsSection';
import ConfigurationSection from './sections/ConfigurationSection';
import AgentEditHeader from './sections/AgentEditHeader';
import AgentDetailTabs from './components/AgentDetailTabs';
import { AgentDetailTab, getVisibleAgentTabs } from './components/agentTabs';
import AgentToolsAccordion from './components/AgentToolsAccordion';
import AgentChannelsShell from './components/AgentChannelsShell';
import AgentTestChat from '@/components/agents/AgentTestChat';
import { TabsContent } from '@evoapi/design-system';
import { Team, Tool } from '@/types';

/** Legacy `?tab=` values still circulate in emails and onboarding links. */
const LEGACY_TAB_MAP: Record<string, AgentDetailTab> = {
  profile: 'profile',
  task: 'profile',
  'sub-agents': 'tools',
  tools: 'tools',
  integrations: 'tools',
  'mcp-servers': 'tools',
  products: 'products',
  configuration: 'configuration',
  knowledge: 'configuration',
  settings: 'configuration',
  channels: 'channels',
};

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
  const [activeTab, setActiveTab] = useState<AgentDetailTab>('profile');
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    role: '',
    goal: '',
    instruction: '',
  });

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

  const [tools, setTools] = useState<Tool[]>([]);
  const [agentTools, setAgentTools] = useState<string[]>([]);
  const [agentToolsData, setAgentToolsData] = useState<Agent[]>([]);
  const [customTools, setCustomTools] = useState<{ http_tools: CustomTool[] }>({ http_tools: [] });
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [customMCPServerIds, setCustomMCPServerIds] = useState<string[]>([]);
  const [integrations, setIntegrations] = useState<Record<string, any>>({});

  const [availablePipelines, setAvailablePipelines] = useState<
    Array<{
      id: string;
      name: string;
      stages: Array<{ id: string; name: string }>;
    }>
  >([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const tab = LEGACY_TAB_MAP[tabParam];
      if (tab) {
        setActiveTab(tab);
      }
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // `?test=1` comes from the wizard's "test agent" card.
  useEffect(() => {
    if (searchParams.get('test') === '1') {
      setIsTestChatOpen(true);
      searchParams.delete('test');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // A deep link may point at a tab this agent type does not expose.
  useEffect(() => {
    if (!agent) return;
    if (!getVisibleAgentTabs(agent.type).includes(activeTab)) {
      setActiveTab('profile');
    }
  }, [agent, activeTab]);

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

  const loadPipelines = useCallback(async () => {
    try {
      const response = await pipelinesService.getPipelines();
      const pipelines = response.data || [];

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
      // No toast: pipelines are optional in the agent configuration.
    }
  }, []);

  useEffect(() => {
    loadPipelines();
  }, [loadPipelines]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await usersService.getUsers();
      const users = response.data || [];

      const transformedUsers = users.map(user => ({
        id: user.id,
        name: user.name || user.email,
      }));

      setAvailableUsers(transformedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // No toast: only feeds transfer rules, which are optional.
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamsService.getTeams();
      // The endpoint returns either a raw array or a paginated envelope.
      const teams = Array.isArray(response) ? response : response.data || response.data || [];

      const transformedTeams = teams.map((team: Team) => ({
        id: team.id,
        name: team.name,
      }));

      setAvailableTeams(transformedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      // No toast: only feeds transfer rules, which are optional.
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // No batch-by-ids endpoint: fetch the accessible ones and filter in memory.
  const loadAgentToolsData = useCallback(async (agentIds: string[]) => {
    if (agentIds.length === 0) return [];
    try {
      const { data: allAgents } = await getAccessibleAgents(0, 1000);
      const agentToolsData = allAgents.filter((agent: any) => agentIds.includes(agent.id));

      return agentToolsData;
    } catch (error) {
      console.error('Error loading agent tools:', error);
      return [];
    }
  }, []);

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
              },
            };
          }

          setExternalConfigData(config);
        }

        setSubAgentsData({
          sub_agents: agentData.config?.sub_agents || [],
        });

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

        const configIntegrations = agentData.config?.integrations || {};

        try {
          const backendIntegrations = await getAgentIntegrations(id);
          const mergedIntegrations: Record<string, any> = { ...configIntegrations };

          // The backend names providers with underscores, the frontend with hyphens.
          backendIntegrations.forEach((integration: any) => {
            const frontendKey = integration.provider.replace(/_/g, '-');
            mergedIntegrations[frontendKey] = {
              ...mergedIntegrations[frontendKey],
              ...integration.config,
              provider: integration.provider,
              // Existing in the backend is what marks it connected.
              connected: true,
            };
          });

          setIntegrations(mergedIntegrations);
        } catch (error) {
          console.error('Error loading backend integrations:', error);
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
      // For LLM agents `instruction` lives both in the form and in llmConfigData.
      if (field === 'instruction' && agent?.type === 'llm' && llmConfigData) {
        setLLMConfigData(prev => (prev ? { ...prev, instruction: value } : null));
      }
      setIsDirty(true);
    },
    [agent?.type, llmConfigData],
  );

  // Returns true on success / false on failure so callers that persist from a nested
  // surface (CRM-213: the pipeline-rules modal Save) can keep their modal open when the
  // save is rejected. AgentEditHeader's onSave: () => void ignores the return.
  const handleSave = async (): Promise<boolean> => {
    if (!id || !agent) return false;

    try {
      setIsSaving(true);
      const toastId = toast.loading(t('messages.saving') || 'Saving...');

      const agentUpdateData: Partial<AgentCreate> = {
        name: formData.name,
        description: formData.description,
        type: agent.type, // Campo obrigatório no backend
        role: formData.role,
        goal: formData.goal,
        instruction: formData.instruction,
      };

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
          enable_text_segmentation:
            externalConfigData.advanced_config?.enable_text_segmentation ?? false,
          max_characters_per_segment:
            externalConfigData.advanced_config?.max_characters_per_segment ?? 300,
          min_segment_size: externalConfigData.advanced_config?.min_segment_size ?? 50,
          character_delay_ms: externalConfigData.advanced_config?.character_delay_ms ?? 0.05,
          send_as_reply: behaviorSettings.sendAsReply,
        } as Record<string, unknown>;
      } else {
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
      return true;
    } catch (error) {
      console.error('Error saving agent:', error);
      const errorMessage = extractBackendErrorMessage(error);
      toast.error(t('messages.saveError') || 'Error saving agent', {
        description: errorMessage,
      });
      return false;
    } finally {
      setIsSaving(false);
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

  const visibleTabs = getVisibleAgentTabs(agent.type);

  return (
    // `min-w-0` lets the content shrink when the test panel opens.
    <div className="flex h-full bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <AgentEditHeader
          onBack={() => navigate('/agents/list')}
          onSave={handleSave}
          onTestAgent={() => setIsTestChatOpen(true)}
          isDirty={isDirty}
          isSaving={isSaving}
          agentName={formData.name || agent.name}
          agentType={agent.type}
        />

        <div className="min-h-0 flex-1">
          <AgentDetailTabs agentType={agent.type} value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="profile" className="mt-0">
              <ProfileSection
                formData={formData}
                onFormDataChange={handleFormDataChange}
                agentType={agent.type}
                taskConfigData={taskConfigData}
                onTaskConfigChange={data => {
                  setTaskConfigData(data);
                  setIsDirty(true);
                }}
                editingAgentId={id}
                agent={agent}
                model={llmConfigData?.model}
                subAgentsCount={subAgentsData.sub_agents.length}
              />
            </TabsContent>

            {visibleTabs.includes('tools') && (
              <TabsContent value="tools" className="mt-0">
                <AgentToolsAccordion
                  agentId={id || ''}
                  agentType={agent.type}
                  subAgentsData={subAgentsData}
                  onSubAgentsChange={data => {
                    setSubAgentsData(data);
                    setIsDirty(true);
                  }}
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
                  integrations={integrations}
                  onIntegrationsChange={newIntegrations => {
                    setIntegrations(newIntegrations);
                    setIsDirty(true);
                  }}
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
                />
              </TabsContent>
            )}

            {visibleTabs.includes('products') && (
              <TabsContent value="products" className="mt-0">
                <ProductsSection agent={agent} />
              </TabsContent>
            )}

            {visibleTabs.includes('configuration') && (
              <TabsContent value="configuration" className="mt-0">
                <ConfigurationSection
                  agent={agent}
                  llmConfigData={llmConfigData}
                  a2aConfigData={a2aConfigData}
                  externalConfigData={externalConfigData}
                  apiKeys={apiKeys}
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
                  onExternalConfigChange={data => {
                    setExternalConfigData(data);
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
                  onSave={handleSave}
                  isSaving={isSaving}
                />
              </TabsContent>
            )}

            <TabsContent value="channels" className="mt-0">
              <AgentChannelsShell />
            </TabsContent>
          </AgentDetailTabs>
        </div>
      </div>

      <AgentTestChat open={isTestChatOpen} onOpenChange={setIsTestChatOpen} agent={agent} />
    </div>
  );
};

export default AgentEditPage;
