import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';

export interface Label {
  id: string;
  title: string;
  description?: string;
  color: string;
  show_on_sidebar: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LabelFormData {
  title: string;
  description?: string;
  color: string;
  show_on_sidebar?: boolean;
}

export interface LabelsResponse extends PaginatedResponse<Label> {}

export interface LabelResponse extends StandardResponse<Label> {}

export interface LabelDeleteResponse extends StandardResponse<{ message: string }> {}

export interface LabelsState {
  labels: Label[];
  selectedLabelIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
  };
  searchQuery: string;
  sortBy: 'title' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
