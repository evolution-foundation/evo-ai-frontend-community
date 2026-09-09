import apiAuth from '@/services/core/apiAuth';
import { extractData, extractResponse } from '@/utils/apiHelpers';

import type {
  AccessToken,
  AccessTokenFormData,
  AccessTokensResponse,
  AccessTokenResponse,
} from '@/types/auth';

// The host persists the active account under this key. Standalone has no host and
// no header; the auth falls back.
const ACTIVE_ACCOUNT_KEY = 'evo_active_tenant_id';

export const activeAccountHeaders = (): Record<string, string> => {
  try {
    const accountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return accountId ? { 'X-Evo-Tenant-Id': accountId } : {};
  } catch {
    return {};
  }
};

/**
 * Get all Access Tokens for an account
 * Endpoint: GET /api/v1/access_tokens
 */
export const getAccessTokens = async (params?: {
  page?: number;
  per_page?: number;
}): Promise<AccessTokensResponse> => {
  const response = await apiAuth.get('/access_tokens', { params });
  return extractResponse<AccessToken>(response) as AccessTokensResponse;
};

/**
 * Get a specific Access Token by ID
 * Endpoint: GET /api/v1/access_tokens/:id
 */
export const getAccessToken = async (id: string): Promise<AccessTokenResponse> => {
  const response = await apiAuth.get(`/access_tokens/${id}`);
  return extractData<any>(response);
};

/**
 * Create a new Access Token
 * Endpoint: POST /api/v1/access_tokens
 */
export const createAccessToken = async (
  data: AccessTokenFormData,
): Promise<AccessTokenResponse> => {
  const response = await apiAuth.post(
    '/access_tokens',
    { access_token: data },
    { headers: activeAccountHeaders() },
  );
  return extractData<any>(response);
};

/**
 * Update an existing Access Token
 * Endpoint: PATCH /api/v1/access_tokens/:id
 */
export const updateAccessToken = async (
  id: string,
  data: Partial<AccessTokenFormData>,
): Promise<AccessTokenResponse> => {
  const response = await apiAuth.patch(`/access_tokens/${id}`, {
    access_token: data,
  });
  return extractData<any>(response);
};

/**
 * Delete an Access Token
 * Endpoint: DELETE /api/v1/access_tokens/:id
 */
export const deleteAccessToken = async (id: string): Promise<void> => {
  await apiAuth.delete(`/access_tokens/${id}`);
};

/**
 * Regenerate the token value for an Access Token
 * Endpoint: PATCH /api/v1/access_tokens/:id/update_token
 */
export const regenerateAccessToken = async (id: string): Promise<AccessTokenResponse> => {
  const response = await apiAuth.patch(`/access_tokens/${id}/update_token`);
  return extractData<any>(response);
};

/**
 * Format scopes array to string for API
 */
export const formatScopesForAPI = (scopes: string[]): string => {
  return scopes.filter(scope => scope.trim()).join(',');
};

/**
 * Parse scopes string to array
 */
export const parseScopesFromAPI = (scopes: string): string[] => {
  return scopes
    ? scopes
        .split(',')
        .map(scope => scope.trim())
        .filter(Boolean)
    : [];
};

/**
 * Generate token name suggestion
 */
export const generateNameSuggestion = (prefix: string = 'API Token'): string => {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix} - ${timestamp}`;
};

/**
 * Validate if requested scopes are available
 */
export const validateScopes = (scopes: string[], availableScopes: string[]): boolean => {
  return scopes.every(scope => availableScopes.includes(scope));
};
