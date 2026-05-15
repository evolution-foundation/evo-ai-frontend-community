import type { PaginationMeta, StandardResponse, PaginatedResponse } from '@/types/core';
import type { Channel } from '@/types/channels';

export interface ContactableInboxes {
  id: string;
  channel_id: string;
  name: string;
  channel_type: string;
  enable_auto_assignment: boolean;
  greeting_enabled: boolean;
  greeting_message: string;
  working_hours_enabled: boolean;
  out_of_office_message: string | null;
  timezone: string;
  enable_email_collect: boolean;
  csat_survey_enabled: boolean;
  allow_messages_after_resolved: boolean;
  auto_assignment_config: Record<string, unknown>;
  sender_name_type: string;
  business_name: string | null;
  avatar_url: string;
  created_at: number;
  updated_at: number;
  available?: boolean;
  can_create_conversation?: boolean;
  source_id: string;
  channel: Channel;
}

export interface ContactableInboxesResponse extends StandardResponse<ContactableInboxes[]> {}
export interface ContactableDataResponse extends StandardResponse<ContactableInboxes> {}

export interface ContactAdditionalAttributes {
  description?: string;
  company_name?: string;
  city?: string;
  country?: string;
  country_code?: string;
  social_profiles?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    github?: string;
  };
  location?: {
    city?: string;
    state?: string;
    country?: string;
    country_code?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  };
  browser?: string;
  os?: string;
  referer?: string;
  landing_page?: string;
  ip_address?: string;
  user_agent?: string;
  created_at_ip?: string;
  campaign_source?: string;
  campaign_medium?: string;
  campaign_name?: string;
}

export interface ContactLabel {
  name: string;
  color: string;
}

export interface CompanyReference {
  id: string;
  name: string;
  type: 'company';
  email?: string;
  phone_number?: string;
  thumbnail?: string;
}

export interface PersonReference {
  id: string;
  name: string;
  type: 'person';
  email?: string;
  phone_number?: string;
  thumbnail?: string;
}

export interface ContactPipelineInfo {
  pipeline: {
    id: string;
    name: string;
    pipeline_type: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
    stage_type: number;
  };
  item: {
    id: string;
    item_id: string;
    type: string;
    entered_at: number;
    notes: string | null;
  };
}

export interface Contact {
  id: string;
  name: string;
  type: 'person' | 'company' | 'group';
  email: string;
  phone_number: string;
  thumbnail: string;
  avatar: string;
  avatar_url: string;
  identifier?: string;
  tax_id: string;
  website: string;
  industry: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  availability_status: 'online' | 'offline' | 'busy' | 'away';
  blocked: boolean;
  custom_attributes: Record<string, any>;
  additional_attributes: ContactAdditionalAttributes;
  contact_inboxes: ContactableInboxes[];
  labels?: string[];
  companies?: CompanyReference[];
  persons?: PersonReference[];
  persons_count?: number;
  company_contacts_count?: number;
  conversations_count?: number;
  last_conversation?: {
    id: string;
    status: string;
    created_at: string;
    last_activity_at: string;
  };
  pipelines?: ContactPipelineInfo[];
}

export interface ContactNote {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ContactConversation {
  id: string;
  status: string;
  inbox: {
    id: string;
    name: string;
  };
  created_at: string;
  last_activity_at: string;
  messages_count: number;
  assignee?: {
    name: string;
  };
}

export interface ContactFilter {
  attribute_key: string;
  values: (string | number | boolean)[];
  filter_operator: string;
  query_operator: 'AND' | 'OR' | null;
  custom_attribute_type?: string;
}

export type FilterOperator =
  | 'equal'
  | 'not_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'contains_any'
  | 'contains_all'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'any'
  | 'all'
  | 'none'
  | 'true'
  | 'false'
  | 'before'
  | 'after'
  | 'between_dates';

export interface ContactsListParams {
  page?: number;
  per_page?: number;
  sort?: 'name' | 'email' | 'phone_number' | 'last_activity_at' | 'created_at';
  order?: 'asc' | 'desc';
  labels?: string[];
  q?: string;
  type?: 'person' | 'company' | 'group';
  include_groups?: boolean;
  company_id?: string;
  include_contact_inboxes?: boolean;
  created_after?: string;
  created_before?: string;
  last_activity_after?: string;
  last_activity_before?: string;
}

export interface ContactsSearchParams {
  q: string;
  page?: number;
  per_page?: number;
  sort?: string;
  type?: 'person' | 'company' | 'group';
  labels?: string[];
  include_contact_inboxes?: boolean;
}

export interface ContactsFilterParams {
  page?: number;
  payload: ContactFilter[];
}

export interface ContactCreateData {
  name: string;
  type: 'person' | 'company' | 'group';
  email?: string;
  phone_number?: string;
  identifier?: string;
  avatar_url?: string;
  tax_id?: string;
  website?: string;
  industry?: string;
  custom_attributes?: Record<string, any>;
  additional_attributes?: ContactAdditionalAttributes;
  inbox_id?: string;
  labels?: string[];
  company_ids?: string[];
}

export interface ContactUpdateData {
  name?: string;
  email?: string;
  phone_number?: string;
  blocked?: boolean;
  tax_id?: string;
  website?: string;
  industry?: string;
  custom_attributes?: Record<string, any>;
  additional_attributes?: ContactAdditionalAttributes;
  avatar?: File;
  removeAvatar?: boolean;
  labels?: string[];
  company_ids?: string[];
}

export interface ContactsResponse extends PaginatedResponse<Contact> {}

export interface ContactResponse extends StandardResponse<Contact> {}

export interface ContactNotesResponse extends PaginatedResponse<ContactNote> {}

export interface ContactNoteDeleteResponse extends StandardResponse<{ message: string }> {}

export interface ContactConversationsResponse extends PaginatedResponse<ContactConversation> {}

export interface BulkActionResponse extends StandardResponse<{ message: string; affected_count?: number }> {}

export interface BulkActionParams {
  type: 'Contact';
  ids: string[];
  fields: {
    action: 'delete' | 'add_labels' | 'remove_labels' | 'update_custom_attributes';
    labels?: string[];
    custom_attributes?: Record<string, any>;
  };
}

export interface ContactMergeParams {
  base_contact_id: string;
  mergee_contact_id: string;
}

export interface ContactExportParams {
  payload?: Record<string, ContactFilter>;
  format: 'csv' | 'xlsx';
  fields: string[];
}

export interface ContactImportResponse {
  success: boolean;
  message: string;
  job_id: string;
  estimated_completion: string;
}

export interface ContactExportResponse {
  success: boolean;
  message: string;
  job_id: string;
  download_url: string;
  expires_at: string;
}

// UI State Types
export interface ContactsState {
  contacts: Contact[];
  selectedContactIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    import: boolean;
    export: boolean;
    bulk: boolean;
  };
  filters: ContactFilter[];
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface LinkCompanyParams {
  company_id: string;
}

export interface BulkTransferParams {
  contact_ids: string[];
  from_company_id: string;
  to_company_id: string;
}

export interface ContactFormData extends ContactCreateData {
  avatar?: File;
  removeAvatar?: boolean;
  blocked?: boolean;
}

export interface ContactTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface ContactActionsMenuProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onStartConversation: (contact: Contact) => void;
}
