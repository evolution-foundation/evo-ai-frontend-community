import type { StandardResponse, PaginatedResponse, PaginationMeta } from '@/types/core';

export interface AccessToken {
  id: string;
  name: string;
  // Only right after create or regenerate: the auth stores a digest, never the value.
  token?: string;
  scopes: string;
  owner_type: string;
  owner_id: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AccessTokenFormData {
  name: string;
  scopes: string;
}

export interface AccessTokensResponse extends PaginatedResponse<AccessToken> {}

export interface AccessTokenResponse extends StandardResponse<AccessToken> {}

export interface AccessTokensState {
  tokens: AccessToken[];
  selectedTokenIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
    regenerateToken: boolean;
  };
  searchQuery: string;
  sortBy: 'name' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
