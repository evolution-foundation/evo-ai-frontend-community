export type CrmFieldType = 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
export type FieldMapsTo = 'name' | 'email' | 'phone' | 'company' | '';
export type RoutingOp = 'equals' | 'not_equals' | 'contains';

export interface CrmFormField {
  key: string;
  label?: string;
  type: CrmFieldType;
  required?: boolean;
  placeholder?: string;
  maps_to?: FieldMapsTo;
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
  created_at?: string;
  updated_at?: string;
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
