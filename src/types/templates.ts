export type TemplateCategory =
  | 'pipelines'
  | 'agents'
  | 'teams'
  | 'labels'
  | 'custom_attributes'
  | 'canned_responses'
  | 'macros'
  | 'inboxes'
  | 'message_templates';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'pipelines',
  'agents',
  'teams',
  'labels',
  'custom_attributes',
  'canned_responses',
  'macros',
  'inboxes',
  'message_templates',
];

export interface InventoryItem {
  id: string;
  name: string;
}

export type ExportableInventory = Record<TemplateCategory, InventoryItem[]>;

export interface CategorySelection {
  all?: boolean;
  ids?: string[];
}

export type ExportSelection = Partial<Record<TemplateCategory, CategorySelection>>;

export interface TemplateMeta {
  template_name: string;
  description?: string;
  author?: string;
}

export interface ImportItem {
  category: TemplateCategory;
  slug: string;
  status: 'created' | 'renamed' | 'skipped' | 'failed';
  new_id?: string;
  new_name?: string;
  original_name?: string;
  reason?: string;
  warning?: string;
}

export interface ImportReportManifest {
  schema_version: number;
  name: string;
  description?: string;
  author?: string;
  created_at?: string;
  evo_crm_version?: string;
  contents?: Record<string, { count: number; items: string[] }>;
}

export interface ImportReport {
  manifest: ImportReportManifest;
  items: ImportItem[];
  warnings: ImportItem[];
}
