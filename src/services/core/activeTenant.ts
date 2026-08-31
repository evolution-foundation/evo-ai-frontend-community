// Active account (embedded portal): the shell persists the selected account id
// under this localStorage key; the API clients scope every call with it via
// X-Evo-Tenant-Id. Standalone community (no key) sends nothing.
const ACTIVE_TENANT_KEY = 'evo_active_tenant_id';

export function activeTenantId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TENANT_KEY);
  } catch {
    return null;
  }
}
