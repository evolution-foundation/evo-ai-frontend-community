import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

/**
 * Whether the CRM still resolves AI credentials through the legacy sources
 * (global OPENAI_API_SECRET / openai hook). Comes from the CRM Ruby backend
 * (`GET /api/v1/ai_credentials/migration_state`, `Ai::MigrationState`) — the
 * only place that knows; the credential list cannot tell "migrated and off"
 * from "not migrated and served by the fallback".
 */
export interface AiCredentialMigrationState {
  migrated: boolean;
  legacy_fallback_active: boolean;
}

export async function getAiCredentialMigrationState(): Promise<AiCredentialMigrationState> {
  const response = await api.get('/ai_credentials/migration_state');
  return extractData<AiCredentialMigrationState>(response);
}
