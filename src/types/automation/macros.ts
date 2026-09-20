import type { StandardResponse, PaginatedResponse, PaginationMeta } from '@/types/core';
import type { User } from '@/types/users';

export interface MacroAction {
  action_name: string;
  // Heterogeneous per action_name; narrowing it requires retyping the 5 inputs
  // of MacroActionRow, which is out of scope here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action_params: any[];
}

export interface Macro {
  id: string;
  name: string;
  visibility: 'personal' | 'global';
  actions: MacroAction[];
  created_by?: User;
  updated_by?: User;
  files?: MacroFile[];
  created_at: string;
  updated_at: string;
}

export interface MacroFile {
  id: string;
  macro_id: string;
  file_type: string;
  file_url: string;
  blob_id: string;
  filename: string;
}

export type MacrosResponse = PaginatedResponse<Macro>;

export type MacroResponse = StandardResponse<Macro>;

export type MacroDeleteResponse = StandardResponse<{ message: string }>;

export interface MacroCreateData {
  name: string;
  visibility: 'personal' | 'global';
  actions: MacroAction[];
}

export interface MacroUpdateData extends MacroCreateData {
  id: string;
}

export interface MacroExecuteData {
  macroId: string;
  conversationIds: string[];
}

export interface MacrosListParams {
  page?: number;
  per_page?: number;
}

export interface MacroActionType {
  key: string;
  name: string;
  inputType: 'text' | 'textarea' | 'select' | 'multi_select' | 'email' | 'url' | 'file' | null;
  description: string;
  options?: Array<{ value: string | number; label: string }>;
}

export interface MacrosState {
  macros: Macro[];
  selectedMacroIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  filters: unknown[];
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Ações disponíveis para macros - melhoradas com labels amigáveis
export const MACRO_ACTION_TYPES: MacroActionType[] = [
  {
    key: 'send_message',
    name: 'Enviar mensagem',
    inputType: 'textarea',
    description: 'Envia uma mensagem automática na conversa',
  },
  {
    key: 'add_label',
    name: 'Adicionar etiqueta',
    inputType: 'multi_select',
    description: 'Adiciona etiquetas à conversa',
  },
  {
    key: 'remove_label',
    name: 'Remover etiqueta',
    inputType: 'multi_select',
    description: 'Remove etiquetas da conversa',
  },
  {
    key: 'assign_team',
    name: 'Atribuir equipe',
    inputType: 'select',
    description: 'Atribui a conversa a uma equipe específica',
  },
  {
    key: 'assign_agent',
    name: 'Atribuir agente',
    inputType: 'select',
    description: 'Atribui a conversa a um agente específico',
  },
  {
    key: 'remove_assigned_team',
    name: 'Remover atribuição de equipe',
    inputType: null,
    description: 'Remove a atribuição de equipe da conversa',
  },
  {
    key: 'mute_conversation',
    name: 'Silenciar conversa',
    inputType: null,
    description: 'Silencia a conversa para não receber notificações',
  },
  {
    key: 'change_status',
    name: 'Alterar status',
    inputType: 'select',
    description: 'Altera o status da conversa',
    options: [
      { value: 'open', label: 'Aberta' },
      { value: 'resolved', label: 'Resolvida' },
      { value: 'pending', label: 'Pendente' },
    ],
  },
  {
    key: 'resolve_conversation',
    name: 'Resolver conversa',
    inputType: null,
    description: 'Marca a conversa como resolvida',
  },
  {
    key: 'snooze_conversation',
    name: 'Adiar conversa',
    inputType: 'text',
    description: 'Adia a conversa até uma data específica (em horas)',
  },
  {
    key: 'change_priority',
    name: 'Alterar prioridade',
    inputType: 'select',
    description: 'Altera a prioridade da conversa',
    options: [
      { value: 'low', label: 'Baixa' },
      { value: 'medium', label: 'Média' },
      { value: 'high', label: 'Alta' },
      { value: 'urgent', label: 'Urgente' },
    ],
  },
  {
    key: 'send_email_transcript',
    name: 'Enviar transcrição por email',
    inputType: 'email',
    description: 'Envia a transcrição da conversa para um email',
  },
  {
    key: 'send_attachment',
    name: 'Enviar anexo',
    inputType: 'file',
    description: 'Envia um arquivo anexo na conversa',
  },
  {
    key: 'add_private_note',
    name: 'Adicionar nota privada',
    inputType: 'textarea',
    description: 'Adiciona uma nota privada à conversa',
  },
  {
    key: 'send_webhook_event',
    name: 'Enviar webhook',
    inputType: 'url',
    description: 'Dispara um webhook para um endpoint externo',
  },
];
