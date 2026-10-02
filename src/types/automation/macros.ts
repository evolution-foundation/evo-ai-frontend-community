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
  nameKey: string;
  inputType: 'text' | 'textarea' | 'select' | 'multi_select' | 'email' | 'url' | 'file' | null;
  descriptionKey: string;
  options?: Array<{ value: string | number; labelKey: string }>;
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

// Name, description and option labels are keys of the macros namespace.
export const MACRO_ACTION_TYPES: MacroActionType[] = [
  {
    key: 'send_message',
    nameKey: 'actionTypes.send_message.name',
    inputType: 'textarea',
    descriptionKey: 'actionTypes.send_message.description',
  },
  {
    key: 'add_label',
    nameKey: 'actionTypes.add_label.name',
    inputType: 'multi_select',
    descriptionKey: 'actionTypes.add_label.description',
  },
  {
    key: 'remove_label',
    nameKey: 'actionTypes.remove_label.name',
    inputType: 'multi_select',
    descriptionKey: 'actionTypes.remove_label.description',
  },
  {
    key: 'assign_team',
    nameKey: 'actionTypes.assign_team.name',
    inputType: 'select',
    descriptionKey: 'actionTypes.assign_team.description',
  },
  {
    key: 'assign_agent',
    nameKey: 'actionTypes.assign_agent.name',
    inputType: 'select',
    descriptionKey: 'actionTypes.assign_agent.description',
  },
  {
    key: 'remove_assigned_team',
    nameKey: 'actionTypes.remove_assigned_team.name',
    inputType: null,
    descriptionKey: 'actionTypes.remove_assigned_team.description',
  },
  {
    key: 'mute_conversation',
    nameKey: 'actionTypes.mute_conversation.name',
    inputType: null,
    descriptionKey: 'actionTypes.mute_conversation.description',
  },
  {
    key: 'change_status',
    nameKey: 'actionTypes.change_status.name',
    inputType: 'select',
    descriptionKey: 'actionTypes.change_status.description',
    options: [
      { value: 'open', labelKey: 'actionTypes.change_status.options.open' },
      { value: 'resolved', labelKey: 'actionTypes.change_status.options.resolved' },
      { value: 'pending', labelKey: 'actionTypes.change_status.options.pending' },
    ],
  },
  {
    key: 'resolve_conversation',
    nameKey: 'actionTypes.resolve_conversation.name',
    inputType: null,
    descriptionKey: 'actionTypes.resolve_conversation.description',
  },
  {
    key: 'snooze_conversation',
    nameKey: 'actionTypes.snooze_conversation.name',
    inputType: 'text',
    descriptionKey: 'actionTypes.snooze_conversation.description',
  },
  {
    key: 'change_priority',
    nameKey: 'actionTypes.change_priority.name',
    inputType: 'select',
    descriptionKey: 'actionTypes.change_priority.description',
    options: [
      { value: 'low', labelKey: 'actionTypes.change_priority.options.low' },
      { value: 'medium', labelKey: 'actionTypes.change_priority.options.medium' },
      { value: 'high', labelKey: 'actionTypes.change_priority.options.high' },
      { value: 'urgent', labelKey: 'actionTypes.change_priority.options.urgent' },
    ],
  },
  {
    key: 'send_email_transcript',
    nameKey: 'actionTypes.send_email_transcript.name',
    inputType: 'email',
    descriptionKey: 'actionTypes.send_email_transcript.description',
  },
  {
    key: 'send_attachment',
    nameKey: 'actionTypes.send_attachment.name',
    inputType: 'file',
    descriptionKey: 'actionTypes.send_attachment.description',
  },
  {
    key: 'add_private_note',
    nameKey: 'actionTypes.add_private_note.name',
    inputType: 'textarea',
    descriptionKey: 'actionTypes.add_private_note.description',
  },
  {
    key: 'send_webhook_event',
    nameKey: 'actionTypes.send_webhook_event.name',
    inputType: 'url',
    descriptionKey: 'actionTypes.send_webhook_event.description',
  },
];
