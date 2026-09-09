import evoaiApi from '@/services/core/apiEvoAI';
import { apiErrorCode, extractData, buildPaginationParams } from '@/utils/apiHelpers';
import type {
  IntegrationCredential,
  IntegrationCredentialCreate,
  IntegrationCredentialDeleteResponse,
  IntegrationCredentialUpdate,
} from '@/types/agents';

// EVO-2250 story 2.1: the integration-credential vault. The registry lives in
// evo-ai-core-service (`evo_core_integration_credentials`); routes mirror the
// sibling top-level resources (`/custom-tools`, `/custom-mcp-servers`).
// The API returns `value_hint` only — the value itself never leaves the server.

export const listIntegrationCredentials = async (
  page = 1,
  pageSize = 100,
): Promise<IntegrationCredential[]> => {
  const response = await evoaiApi.get('/integration-credentials', {
    params: buildPaginationParams(page, pageSize),
  });
  return extractData<IntegrationCredential[]>(response);
};

export const createIntegrationCredential = async (
  data: IntegrationCredentialCreate,
): Promise<IntegrationCredential> => {
  const response = await evoaiApi.post('/integration-credentials', data);
  return extractData<IntegrationCredential>(response);
};

export const updateIntegrationCredential = async (
  credentialId: string,
  data: IntegrationCredentialUpdate,
): Promise<IntegrationCredential> => {
  const response = await evoaiApi.put(`/integration-credentials/${credentialId}`, data);
  return extractData<IntegrationCredential>(response);
};

export const deleteIntegrationCredential = async (
  credentialId: string,
): Promise<IntegrationCredentialDeleteResponse> => {
  const response = await evoaiApi.delete(`/integration-credentials/${credentialId}`);
  return extractData<IntegrationCredentialDeleteResponse>(response);
};

// The delete refuses with 409 while a consumer still points at the credential,
// naming each holder in `details.consumers` as a ready-to-display string. The
// whole shape is required, not just the status: a conflict without consumers
// would render a list asserting that somebody holds it and showing nobody.
export const deleteConflictConsumers = (error: unknown): string[] | null => {
  if (!error || typeof error !== 'object') return null;

  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  if (response?.status !== 409 || apiErrorCode(error) !== 'CONFLICT') return null;

  const data = response.data;
  if (!data || typeof data !== 'object') return null;

  const consumers = (data as { error?: { details?: { consumers?: unknown } } }).error?.details
    ?.consumers;
  if (!Array.isArray(consumers) || consumers.length === 0) return null;
  if (!consumers.every(entry => typeof entry === 'string' && entry.trim() !== '')) return null;

  return consumers as string[];
};

// EVO-2250 story 2.7: the retirement guard, per consumer. A consumer only
// retires its inline secret entry after the 2.6 migration ran on this
// installation (or there was never anything to migrate). While the guard says
// no, every inline field stays exactly as it is.
export interface IntegrationVaultMigrationState {
  retired: {
    custom_tools?: boolean;
    custom_mcp_servers?: boolean;
    knowledge_nexus?: boolean;
    agent_bots?: boolean;
    external_agents?: boolean;
  };
}

export const getIntegrationVaultMigrationState =
  async (): Promise<IntegrationVaultMigrationState> => {
    const response = await evoaiApi.get('/integration-credentials/migration-state');
    return extractData<IntegrationVaultMigrationState>(response);
  };
