import { extractData, extractResponse } from '@/utils/apiHelpers';
import api from '../core/api';
import authApi from '@/services/core/apiAuth';
import type {
  AutomationRule,
  AutomationCondition,
  AutomationAction,
  AutomationFlowData,
  CreateAutomationPayload,
  UpdateAutomationPayload,
  AutomationsResponse,
  AutomationResponse,
  AutomationDeleteResponse,
} from '@/types/automation';

class AutomationService {
  async getAutomations(): Promise<AutomationsResponse> {
    try {
      const response = await api.get('/automation_rules');
      return extractResponse<AutomationRule>(response) as AutomationsResponse;
    } catch (error: any) {
      console.error('Erro ao buscar automações:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar automações');
    }
  }

  async getAutomation(id: string): Promise<AutomationRule> {
    try {
      const response = await api.get(`/automation_rules/${id}`);
      return extractData<AutomationRule>(response);
    } catch (error: any) {
      console.error('Erro ao buscar automação:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao buscar automação');
    }
  }

  async createAutomation(payload: CreateAutomationPayload): Promise<AutomationResponse> {
    try {
      // Se for modo flow, extrair dados do TriggerNode e ActionNodes para os campos da tabela
      let processedPayload = { ...payload };
      if (payload.mode === 'flow' && payload.flow_data) {
        const extractedData = this.extractTriggerDataFromFlow(payload.flow_data);
        processedPayload = {
          ...payload,
          event_name: extractedData.event_name || payload.event_name,
          conditions: extractedData.conditions || payload.conditions,
          actions: extractedData.actions || payload.actions,
        };
      }

      const response = await api.post('/automation_rules', {
        name: processedPayload.name,
        description: processedPayload.description,
        event_name: processedPayload.event_name,
        active: processedPayload.active ?? true,
        mode: processedPayload.mode || 'simple',
        flow_data: processedPayload.flow_data,
        conditions: processedPayload.conditions,
        actions: processedPayload.actions,
      });

      return extractData<AutomationResponse>(response);
    } catch (error: any) {
      console.error('Erro ao criar automação:', error);

      if (error?.response?.data?.error) {
        // Tratar erros de validação do backend
        const errors = error.response.data.error;
        const errorMessages = Object.entries(errors)
          .map(
            ([field, messages]: [string, any]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`,
          )
          .join('; ');
        throw new Error(`Erro de validação: ${errorMessages}`);
      }

      throw new Error(error?.response?.data?.message || 'Erro ao criar automação');
    }
  }

  async updateAutomation(
    id: string,
    payload: Partial<UpdateAutomationPayload>,
  ): Promise<AutomationResponse> {
    try {
      const updateData: any = { ...payload };

      // Remove o id do payload se estiver presente
      if ('id' in updateData) {
        delete updateData.id;
      }

      // Se for modo flow, extrair dados do TriggerNode e ActionNodes para os campos da tabela
      if (updateData.mode === 'flow' && updateData.flow_data) {
        const extractedData = this.extractTriggerDataFromFlow(updateData.flow_data);
        updateData.event_name = extractedData.event_name || updateData.event_name;
        updateData.conditions = extractedData.conditions || updateData.conditions;
        updateData.actions = extractedData.actions || updateData.actions;
      }

      const response = await api.put(`/automation_rules/${id}`, updateData);

      return extractData<AutomationResponse>(response);
    } catch (error: any) {
      console.error('Erro ao atualizar automação:', error);

      if (error?.response?.data?.error) {
        // Tratar erros de validação do backend
        const errors = error.response.data.error;
        const errorMessages = Object.entries(errors)
          .map(
            ([field, messages]: [string, any]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`,
          )
          .join('; ');
        throw new Error(`Erro de validação: ${errorMessages}`);
      }

      throw new Error(error?.response?.data?.message || 'Erro ao atualizar automação');
    }
  }

  async deleteAutomation(id: string): Promise<AutomationDeleteResponse> {
    try {
      const response = await api.delete(`/automation_rules/${id}`);
      return extractData<AutomationDeleteResponse>(response);
    } catch (error: any) {
      console.error('Erro ao excluir automação:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao excluir automação');
    }
  }

  async cloneAutomation(id: string): Promise<{ data: AutomationRule }> {
    try {
      const response = await api.post(`/automation_rules/${id}/clone`);
      return extractData<AutomationResponse>(response);
    } catch (error: any) {
      console.error('Erro ao clonar automação:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao clonar automação');
    }
  }

  // Métodos auxiliares para buscar dados necessários para o formulário
  async getFormData(): Promise<{
    inboxes: any[];
    agents: any[];
    teams: any[];
    labels: any[];
    campaigns: any[];
    customAttributes: any[];
  }> {
    try {
      const [inboxesRes, agentsRes, teamsRes, labelsRes] = await Promise.allSettled([
        api.get('/inboxes'),
        authApi.get('/users'),
        api.get('/teams'),
        api.get('/labels'),
      ]);

      const getResultData = (result: PromiseSettledResult<any>, isAuthService = false): any[] => {
        if (result.status === 'fulfilled') {
          const data = extractData<{ users?: any[] } | any[]>(result.value);
          if (isAuthService) {
            if (data && typeof data === 'object' && 'users' in data && Array.isArray(data.users)) {
              return data.users;
            }
            return Array.isArray(data) ? data : [];
          }
          return Array.isArray(data) ? data : [];
        }
        return [];
      };

      return {
        inboxes: getResultData(inboxesRes),
        agents: getResultData(agentsRes, true), // true = isAuthService
        teams: getResultData(teamsRes),
        labels: getResultData(labelsRes),
        campaigns: [],
        customAttributes: [], // TODO: Implementar busca de custom attributes se necessário
      };
    } catch (error: any) {
      console.error('Erro ao buscar dados do formulário:', error);
      // Retornar dados vazios em caso de erro para não quebrar o formulário
      return {
        inboxes: [],
        agents: [],
        teams: [],
        labels: [],
        campaigns: [],
        customAttributes: [],
      };
    }
  }

  async uploadAttachment(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Endpoint para upload de arquivos (pode precisar ajustar conforme API)
      const response = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return extractData<string>(response);
    } catch (error: any) {
      console.error('Erro ao fazer upload do arquivo:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao fazer upload do arquivo');
    }
  }

  /**
   * Extrai dados do TriggerNode e ActionNodes do flow_data para popular os campos da tabela
   * Isso garante compatibilidade entre modo simples e modo flow
   */
  private extractTriggerDataFromFlow(flowData: AutomationFlowData): {
    event_name?: string;
    conditions?: AutomationCondition[];
    actions?: AutomationAction[];
  } {
    try {
      const result: {
        event_name?: string;
        conditions?: AutomationCondition[];
        actions?: AutomationAction[];
      } = {};

      // 1. Procurar pelo TriggerNode no flow
      const triggerNode = flowData.nodes?.find(
        (node: any) => node.type === 'trigger-node' || node.id === 'trigger-node',
      );

      if (triggerNode && triggerNode.data) {
        const triggerData = triggerNode.data as {
          event_name?: string;
          conditions?: AutomationCondition[];
          actions?: AutomationAction[];
        };

        // Extrair event_name
        if (triggerData.event_name && typeof triggerData.event_name === 'string') {
          result.event_name = triggerData.event_name;
        }

        // Extrair conditions se existirem
        if (
          triggerData.conditions &&
          Array.isArray(triggerData.conditions) &&
          triggerData.conditions.length > 0
        ) {
          result.conditions = triggerData.conditions.map((condition: any) => ({
            attribute_key: condition.attribute_key || '',
            filter_operator: condition.filter_operator || 'equal_to',
            values: Array.isArray(condition.values) ? condition.values : [],
            query_operator: condition.query_operator || 'and',
            ...(condition.custom_attribute_type && {
              custom_attribute_type: condition.custom_attribute_type,
            }),
          }));
        }
      }

      // 2. Extrair actions dos ActionNodes seguindo a ordem do flow
      const actions = this.extractActionsFromFlow(flowData);
      if (actions.length > 0) {
        result.actions = actions;
      }

      return result;
    } catch (error) {
      console.error('Erro ao extrair dados do flow:', error);
      return {};
    }
  }

  /**
   * Extrai actions dos nodes do flow seguindo a ordem das conexões
   */
  private extractActionsFromFlow(flowData: AutomationFlowData): AutomationAction[] {
    try {
      const actions: AutomationAction[] = [];
      const nodes = flowData.nodes || [];
      const edges = flowData.edges || [];

      // Ordenar nodes seguindo a sequência das conexões a partir do trigger
      const orderedNodes = this.getOrderedActionNodes(nodes, edges);

      orderedNodes.forEach((node: any) => {
        const action = this.convertNodeToAction(node);
        if (action) {
          actions.push(action);
        } else {
          console.warn(`⚠️ Falha ao converter node: ${node.type} (${node.id})`);
        }
      });

      return actions;
    } catch (error) {
      console.error('❌ Erro ao extrair actions do flow:', error);
      return [];
    }
  }

  /**
   * Ordena os nodes de action seguindo a sequência das conexões
   * Suporta múltiplas conexões de um mesmo node (bifurcações)
   */
  private getOrderedActionNodes(nodes: any[], edges: any[]): any[] {
    const orderedNodes: any[] = [];
    const visited = new Set<string>();

    // Função recursiva para traversar o grafo
    const traverseFromNode = (nodeId: string, depth: number = 0) => {
      if (visited.has(nodeId) || depth > 50) {
        // Evitar loops infinitos
        return;
      }

      visited.add(nodeId);

      // Encontrar TODOS os edges que saem deste node
      const outgoingEdges = edges.filter((edge: any) => edge.source === nodeId);

      if (outgoingEdges.length === 0) {
        return; // Fim da cadeia
      }

      // Processar todos os nodes conectados
      outgoingEdges.forEach((edge: any) => {
        const nextNode = nodes.find((node: any) => node.id === edge.target);
        if (!nextNode) return;

        // Se for um action node, adicionar à lista
        if (this.isActionNode(nextNode.type)) {
          orderedNodes.push(nextNode);
        }

        // Continuar a traversar a partir deste node
        traverseFromNode(nextNode.id, depth + 1);
      });
    };

    // Começar do trigger-node
    traverseFromNode('trigger-node');

    return orderedNodes;
  }

  /**
   * Verifica se um tipo de node é um action node
   */
  private isActionNode(nodeType: string): boolean {
    const actionNodeTypes = [
      'assign-agent-node',
      'assign-team-node',
      'add-label-node',
      'remove-label-node',
      'send-message-node',
      'send-attachment-node',
      'send-email-team-node',
      'send-transcript-node',
      'send-webhook-node',
      'mute-conversation-node',
      'snooze-conversation-node',
      'resolve-conversation-node',
      'change-priority-node',
      'change-status-node',
    ];

    return actionNodeTypes.includes(nodeType);
  }

  /**
   * Converte um node do flow para o formato de action esperado pelo backend
   */
  private convertNodeToAction(node: any): AutomationAction | null {
    try {
      const nodeType = node.type;
      const nodeData = node.data || {};

      switch (nodeType) {
        case 'assign-agent-node':
          // AssignAgentNode usa agent_id
          return {
            action_name: 'assign_agent',
            action_params: [nodeData.agent_id || null],
          };

        case 'assign-team-node':
          // AssignTeamNode usa team_id
          return {
            action_name: 'assign_team',
            action_params: [nodeData.team_id || null],
          };

        case 'add-label-node':
          // AddLabelNode usa label_list (array de IDs)
          return {
            action_name: 'add_label',
            action_params: nodeData.label_list || [],
          };

        case 'remove-label-node':
          // RemoveLabelNode usa label_list (array de IDs)
          return {
            action_name: 'remove_label',
            action_params: nodeData.label_list || [],
          };

        case 'send-message-node':
          // SendMessageNode usa message (string)
          return {
            action_name: 'send_message',
            action_params: [nodeData.message || ''],
          };

        case 'send-attachment-node': {
          // SendAttachmentNode usa attachment_ids, blob_ids (fallback) e inboxId opcional
          const attachmentParams: any = {
            attachment_ids: nodeData.attachment_ids || nodeData.blob_ids || [],
          };

          // Adicionar inboxId se especificado
          if (nodeData.inboxId) {
            attachmentParams.inbox_id = nodeData.inboxId;
          }

          return {
            action_name: 'send_attachment',
            action_params: [attachmentParams],
          };
        }

        case 'send-email-team-node':
          // SendEmailTeamNode usa team_ids e message
          return {
            action_name: 'send_email_to_team',
            action_params: {
              team_ids: nodeData.team_ids || [],
              message: nodeData.message || '',
            },
          };

        case 'send-transcript-node':
          // SendTranscriptNode usa email ou emails (fallback)
          return {
            action_name: 'send_email_transcript',
            action_params: [nodeData.email || nodeData.emails || ''],
          };

        case 'send-webhook-node':
          // SendWebhookNode usa webhook_url
          return {
            action_name: 'send_webhook_event',
            action_params: [nodeData.webhook_url || ''],
          };

        case 'mute-conversation-node':
          // MuteConversationNode não precisa de parâmetros
          return {
            action_name: 'mute_conversation',
            action_params: [],
          };

        case 'snooze-conversation-node':
          // SnoozeConversationNode não precisa de parâmetros
          return {
            action_name: 'snooze_conversation',
            action_params: [],
          };

        case 'resolve-conversation-node':
          // ResolveConversationNode não precisa de parâmetros
          return {
            action_name: 'resolve_conversation',
            action_params: [],
          };

        case 'change-priority-node':
          // ChangePriorityNode usa priority
          return {
            action_name: 'change_priority',
            action_params: [nodeData.priority || null],
          };

        case 'change-status-node':
          // ChangeStatusNode usa status (se existir)
          return {
            action_name: 'change_status',
            action_params: [nodeData.status || null],
          };

        default:
          console.warn(`Tipo de node desconhecido: ${nodeType}`);
          return null;
      }
    } catch (error) {
      console.error(`Erro ao converter node ${node.id} para action:`, error);
      return null;
    }
  }
}

export const automationService = new AutomationService();
