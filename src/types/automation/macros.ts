import i18n from '@/i18n/config';
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
    get name() { return i18n.t("automation:form.fields.actions.send_message"); },
    inputType: 'textarea',
    get description() { return i18n.t("interface:macros.sendAnAutomaticMessageInTheConversation"); },
  },
  {
    key: 'add_label',
    get name() { return i18n.t("automation:form.fields.actions.add_label"); },
    inputType: 'multi_select',
    get description() { return i18n.t("interface:macros.addLabelsToTheConversation"); },
  },
  {
    key: 'remove_label',
    get name() { return i18n.t("automation:form.fields.actions.remove_label"); },
    inputType: 'multi_select',
    get description() { return i18n.t("interface:macros.removeLabelsFromTheConversation"); },
  },
  {
    key: 'assign_team',
    get name() { return i18n.t("interface:macros.assignTeam"); },
    inputType: 'select',
    get description() { return i18n.t("interface:macros.assignTheConversationToASpecificTeam"); },
  },
  {
    key: 'assign_agent',
    get name() { return i18n.t("pipelines:stageAutomation.actions.assign_agent"); },
    inputType: 'select',
    get description() { return i18n.t("interface:macros.assignTheConversationToASpecificAgent"); },
  },
  {
    key: 'remove_assigned_team',
    get name() { return i18n.t("interface:macros.removeTeamAssignment"); },
    inputType: null,
    get description() { return i18n.t("interface:macros.removeTheTeamAssignmentFromTheConversation"); },
  },
  {
    key: 'mute_conversation',
    get name() { return i18n.t("automation:form.fields.actions.mute_conversation"); },
    inputType: null,
    get description() { return i18n.t("interface:macros.muteTheConversationToStopReceivingNotifications"); },
  },
  {
    key: 'change_status',
    get name() { return i18n.t("automation:form.fields.actions.change_status"); },
    inputType: 'select',
    get description() { return i18n.t("interface:macros.changeConversationStatus"); },
    options: [
      { value: 'open', get label() { return i18n.t("chat:conversationStatusIcon.open.label"); } },
      { value: 'resolved', get label() { return i18n.t("interface:macros.resolved"); } },
      { value: 'pending', get label() { return i18n.t("common:base.status.pending"); } },
    ],
  },
  {
    key: 'resolve_conversation',
    get name() { return i18n.t("automation:form.fields.actions.resolve_conversation"); },
    inputType: null,
    get description() { return i18n.t("journey:flowEditor.nodes.resolveConversation.description"); },
  },
  {
    key: 'snooze_conversation',
    get name() { return i18n.t("journey:panels.deferConversation.node.title"); },
    inputType: 'text',
    get description() { return i18n.t("interface:macros.snoozeTheConversationUntilASpecifiedTimeInHours"); },
  },
  {
    key: 'change_priority',
    get name() { return i18n.t("automation:form.fields.actions.change_priority"); },
    inputType: 'select',
    get description() { return i18n.t("interface:macros.changeConversationPriority"); },
    options: [
      { value: 'low', get label() { return i18n.t("pipelines:tasks.priority.low"); } },
      { value: 'medium', get label() { return i18n.t("pipelines:tasks.priority.medium"); } },
      { value: 'high', get label() { return i18n.t("pipelines:tasks.priority.high"); } },
      { value: 'urgent', get label() { return i18n.t("pipelines:tasks.priority.urgent"); } },
    ],
  },
  {
    key: 'send_email_transcript',
    get name() { return i18n.t("automation:form.fields.actions.send_email_transcript"); },
    inputType: 'email',
    get description() { return i18n.t("interface:macros.sendTheConversationTranscriptByEmail"); },
  },
  {
    key: 'send_attachment',
    get name() { return i18n.t("automation:form.fields.actions.send_attachment"); },
    inputType: 'file',
    get description() { return i18n.t("interface:macros.sendAFileAttachmentInTheConversation"); },
  },
  {
    key: 'add_private_note',
    get name() { return i18n.t("interface:macros.addPrivateNote"); },
    inputType: 'textarea',
    get description() { return i18n.t("interface:macros.addAPrivateNoteToTheConversation"); },
  },
  {
    key: 'send_webhook_event',
    get name() { return i18n.t("interface:macros.sendWebhook"); },
    inputType: 'url',
    get description() { return i18n.t("interface:macros.sendAWebhookToAnExternalEndpoint"); },
  },
];
