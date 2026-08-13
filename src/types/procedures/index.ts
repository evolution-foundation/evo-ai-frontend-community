export type ProcedureStatus = 'draft' | 'published' | 'archived';
export type ProcedureUsageMode = 'internal' | 'customer' | 'both';
export type ProcedureVisibilityScope = 'all' | 'team' | 'inbox' | 'public_link';
export type ProcedureTargetType = 'label' | 'product' | 'inbox' | 'pipeline_stage';
export type ProcedureBlockType = 'heading' | 'paragraph' | 'checklist' | 'image' | 'video' | 'file' | 'link' | 'button';

export interface ProcedureBlock {
  id: string;
  type: ProcedureBlockType;
  text?: string;
  url?: string;
  label?: string;
  checked?: boolean;
  level?: number;
}

export interface ProcedureVisibility {
  id?: string;
  scope_type: ProcedureVisibilityScope;
  scope_id?: string | null;
}

export interface ProcedureTarget {
  id?: string;
  target_type: ProcedureTargetType;
  target_id: string;
}

export interface ProcedureAttachment {
  id: string;
  file_name?: string;
  file_type: string;
  content_type?: string;
  extension?: string;
  file_url?: string;
  data_url?: string;
  thumb_url?: string;
  fallback_title?: string;
  file_size?: number;
  width?: number;
  height?: number;
}

export interface Procedure {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  status: ProcedureStatus;
  usage_mode: ProcedureUsageMode;
  content_blocks: ProcedureBlock[];
  metadata: Record<string, unknown>;
  public_token?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  created_by_id?: string | null;
  updated_by_id?: string | null;
  visibility: ProcedureVisibility[];
  targets: ProcedureTarget[];
  attachments: ProcedureAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface ProcedureFormData {
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  status?: ProcedureStatus;
  usage_mode: ProcedureUsageMode;
  content_blocks: ProcedureBlock[];
  metadata?: Record<string, unknown>;
  visibility: ProcedureVisibility[];
  targets?: ProcedureTarget[];
  attachments?: File[];
  removeAttachmentIds?: string[];
}

export interface ProceduresResponse {
  data: Procedure[];
  meta?: {
    pagination?: {
      page: number;
      page_size?: number;
      total?: number;
      total_pages?: number;
      has_next_page?: boolean;
      has_previous_page?: boolean;
    };
    count?: number;
    current_page?: number;
    pages?: number;
  };
}

export type ProcedureResponse = Procedure;
