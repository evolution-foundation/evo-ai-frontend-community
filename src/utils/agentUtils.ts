import { AgentCreate } from '@/types/agents';

/**
 * Sanitiza o nome do agente removendo espaços e caracteres especiais
 * Backend não permite espaços ou caracteres especiais em nomes
 */
export const sanitizeAgentName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .replace(/[^a-zA-Z0-9_-]/g, '') // Remover caracteres especiais, manter apenas letras, números, _ e -
    .toLowerCase(); // Converter para minúsculas para consistência
};

/**
 * Escapa chaves nas instruções para evitar problemas de parsing
 */
export const escapePromptBraces = (instruction: string): string => {
  // Escape de chaves simples e duplas para evitar problemas de template
  return instruction.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
};

/**
 * Valida se uma string é um UUID válido
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Extrai mensagens de erro legíveis do backend
 */
export const extractBackendErrorMessage = (error: any): string => {
  // Se for erro 422 com detalhes de validação
  if (error?.response?.status === 422 && error?.response?.data?.detail) {
    const details = error.response.data.detail;

    if (Array.isArray(details) && details.length > 0) {
      // Pegar a primeira mensagem de erro mais relevante
      const firstError = details[0];
      if (firstError.msg) {
        // Limpar mensagens técnicas para algo mais amigável
        const message = firstError.msg;

        // Personalizar mensagens conhecidas
        if (message.includes('Agent name cannot contain spaces or special characters')) {
          return 'Nome do agente não pode conter espaços ou caracteres especiais. Use apenas letras, números, _ ou -';
        }

        if (message.includes('Input should be a valid UUID')) {
          return 'ID da API key deve ser um UUID válido';
        }

        // Se não encontrar personalização, retornar a mensagem original limpa
        return message.replace('Value error, ', '');
      }
    }
  }

  // CRM-116: o core-service (Go) responde `{ success:false, error:{ code, message } }`.
  // Nenhum dos dois ramos acima casa com esse envelope: `detail` é shape do FastAPI e
  // `data.message` não existe ali. Sem esta linha, tudo que o core recusa cai no
  // `error.message` do axios — quem estourava a cota do plano via
  // "Request failed with status code 422", sem uma palavra sobre plano ou limite.
  //
  // Mesmo bug já corrigido neste SPA em services/agents/customToolsService.ts
  // (getErrorMessage), com a mesma leitura de `data.error.message`.
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Fallback para outros tipos de erro
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message) {
    return error.message;
  }

  return 'Erro desconhecido ao salvar agente';
};

/**
 * Converte string IDs de ferramentas para UUIDs determinísticos
 */
const convertToolIdToUUID = (toolId: string): string => {
  // Criar um hash simples do string ID para gerar UUID determinístico
  let hash = 0;
  for (let i = 0; i < toolId.length; i++) {
    const char = toolId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Converter para hexadecimal e formatar como UUID
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const prefix = '6ba7b810-9dad-11d1-80b4-'; // Namespace fixo
  const suffix = hex.padEnd(12, '0').slice(0, 12);
  return `${prefix}${suffix}`;
};

/**
 * Processa ferramentas para o formato esperado pelo backend
 */
const processToolsData = (tools: any[]): Record<string, unknown>[] => {
  return tools.map((tool: any) => {
    const convertedId = convertToolIdToUUID(tool.id);

    return {
      id: convertedId, // Converter para UUID
      name: tool.name || '',
      description: tool.description || '',
      tags: tool.tags || [],
      examples: tool.examples || [],
      inputModes: tool.inputModes || [],
      outputModes: tool.outputModes || [],
      config: {
        ...tool.config,
        // Garantir que configured_values esteja presente se houver configuração
        ...(tool.config?.configured_values
          ? { configured_values: tool.config.configured_values }
          : {}),
      },
    };
  });
};

/**
 * Processa os dados do agente antes de enviar para a API
 */
export const processAgentData = (
  data: AgentCreate | Partial<AgentCreate>,
): AgentCreate | Partial<AgentCreate> => {
  const updatedData = { ...data };

  // Sanitizar nome se presente
  if (updatedData.name) {
    updatedData.name = sanitizeAgentName(updatedData.name);
  }

  // Escapar instruções se presente
  if (updatedData.instruction) {
    updatedData.instruction = escapePromptBraces(updatedData.instruction);
  }

  // Converter agent_card_url para card_url (backend espera card_url)
  if (updatedData.agent_card_url !== undefined && !updatedData.card_url) {
    updatedData.card_url = updatedData.agent_card_url;
    delete updatedData.agent_card_url;
  }

  // Processar ferramentas se presente
  if (updatedData.config?.tools && Array.isArray(updatedData.config.tools)) {
    updatedData.config = {
      ...updatedData.config,
      tools: processToolsData(updatedData.config.tools),
    };
  }

  return updatedData;
};
