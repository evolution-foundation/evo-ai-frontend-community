// CannedResponses Types

export interface CannedResponseAttachment {
  id: string;
  file_name?: string;
  file_type: string;
  file_url?: string;
  data_url?: string;
  fallback_title?: string;
  file_size?: number;
}

export interface CannedResponse {
  id: string;
  short_code: string;
  content: string;
  created_at: string;
  updated_at?: string;
  attachments?: CannedResponseAttachment[];
}

export interface CannedResponseFormData {
  short_code: string;
  content: string;
  attachments?: File[];
  removeAttachmentIds?: string[];
}

export type CannedResponseResponse = CannedResponse;

export interface CannedResponseDeleteResponse {
  success: boolean;
}

export interface CannedResponsePagination {
  page: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
  has_next_page?: boolean;
  has_previous_page?: boolean;
}

export interface CannedResponsesResponse {
  data: CannedResponse[];
  meta?: {
    pagination?: CannedResponsePagination;
    count?: number;
    current_page?: number;
    pages?: number;
  };
}

export interface CannedResponsesState {
  cannedResponses: CannedResponse[];
  selectedCannedResponseIds: string[];
  meta: {
    pagination: {
      page: number;
      page_size?: number;
      total?: number;
      total_pages?: number;
      has_next_page?: boolean;
      has_previous_page?: boolean;
    };
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
  };
  searchQuery: string;
  sortBy: 'short_code' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
