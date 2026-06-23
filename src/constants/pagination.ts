/**
 * Pagination constants
 * Centralized defaults aligned with backend (evo-ai-crm, evo-auth-service)
 */
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Bounded config catalogs (labels, canned responses, custom attribute definitions) are loaded
// fully in a single request and paginated client-side. Soft cap — if a catalog ever exceeds it,
// migrate that screen to the server-side list pattern (see EVO-1860).
export const SETTINGS_LIST_FETCH_SIZE = 500;
