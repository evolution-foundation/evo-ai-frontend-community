import evoaiApi from '@/services/core/apiEvoAI';
import { extractData } from '@/utils/apiHelpers';

/**
 * Agent Integrations Service
 * Centraliza todas as chamadas de API relacionadas às integrações dos agentes
 */

export interface AgentIntegrationItem {
  id?: string;
  agent_id?: string;
  provider: string;
  config: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface NexusSpace {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
}

class AgentIntegrationsService {
  /**
   * Get all integrations for an agent
   * @param agentId - ID do agente
   * @returns Lista de integrações persistidas no backend
   */
  async getAgentIntegrations(agentId: string): Promise<AgentIntegrationItem[]> {
    const response = await evoaiApi.get(`/agents/${agentId}/integrations`);
    const data = extractData<AgentIntegrationItem[] | null>(response);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Upsert (create or update) an integration for an agent.
   * Provider is normalized to snake_case (backend convention).
   */
  async upsertIntegration(
    agentId: string,
    provider: string,
    config: Record<string, unknown>
  ): Promise<AgentIntegrationItem> {
    const normalizedProvider = provider.replace(/-/g, '_');
    const response = await evoaiApi.post(`/agents/${agentId}/integrations`, {
      provider: normalizedProvider,
      config,
    });
    return extractData<AgentIntegrationItem>(response);
  }

  /**
   * Delete an integration for an agent.
   * Provider is normalized to snake_case (backend convention).
   */
  async deleteIntegration(agentId: string, provider: string): Promise<void> {
    const normalizedProvider = provider.replace(/-/g, '_');
    await evoaiApi.delete(`/agents/${agentId}/integrations/${normalizedProvider}`);
  }

  /**
   * List knowledge spaces from a user-provided EvoNexus instance.
   * Proxied through the backend so the browser doesn't hit CORS — the Nexus
   * dashboard doesn't emit CORS headers for cross-origin clients.
   */
  async listKnowledgeNexusSpaces(
    nexus_base_url: string,
    nexus_api_key: string
  ): Promise<NexusSpace[]> {
    const response = await evoaiApi.post('/integrations/knowledge-nexus/list-spaces', {
      nexus_base_url,
      nexus_api_key,
    });
    const data = extractData<{ spaces?: NexusSpace[] } | null>(response);
    return Array.isArray(data?.spaces) ? data!.spaces! : [];
  }
}

export const agentIntegrationsService = new AgentIntegrationsService();
export default agentIntegrationsService;
