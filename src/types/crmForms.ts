export type CrmFieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
// Typed mapping kind. `maps_to` may also hold a legacy standard-field string
// ('name'|'email'|'phone'|'company') for forms created before B14.06.
export type MapKind = 'contact' | 'contact_attribute' | 'deal_value' | 'deal_attribute';
export type RoutingOp = 'equals' | 'not_equals' | 'contains';

export interface CrmFormField {
  key: string;
  label?: string;
  type: CrmFieldType;
  required?: boolean;
  placeholder?: string;
  maps_to?: string; // MapKind (or legacy standard-field string)
  maps_to_key?: string; // attribute/standard key for the chosen kind
  options?: string[];
}

export interface RoutingRule {
  field?: string;
  op?: RoutingOp;
  value?: string;
  pipeline_id: string;
  stage_id?: string;
}

export interface CrmFormAppearance {
  primary_color?: string;
  logo_url?: string;
  image_url?: string;
  success_message?: string;
}

export interface CrmForm {
  id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  appearance: CrmFormAppearance;
  fields: CrmFormField[];
  routing_rules: RoutingRule[];
  default_pipeline_id: string;
  default_stage_id?: string;
  published: boolean;
  public_path?: string;
  leads_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next_page?: boolean;
  has_previous_page?: boolean;
}

// EVO-2207: a captured lead is the CONTACT that filled the form. The deal it opened is
// optional and does not survive a kanban delete, so every deal field can come back null.
// `id` now carries the contact rather than the pipeline item it used to, which is why the
// row key stays on it: unique per row under either payload. Anything that needs to know
// WHICH entity it is holding reads contact_id / pipeline_item_id instead.
export interface FormLead {
  id: string;
  contact_id: string;
  pipeline_item_id?: string | null;
  contact?: { id: string; name?: string; email?: string } | null;
  pipeline_id?: string | null;
  pipeline_stage_id?: string | null;
  created_at?: string;
}

export interface CrmFormPayload {
  name: string;
  title?: string;
  description?: string;
  appearance?: CrmFormAppearance;
  fields: CrmFormField[];
  routing_rules?: RoutingRule[];
  default_pipeline_id: string;
  default_stage_id?: string;
  published?: boolean;
}
