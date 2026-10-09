/**
 * Pagination constants
 * Centralized defaults aligned with backend (evo-ai-crm, evo-auth-service)
 */
export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Bounded config catalogs (labels, canned responses, custom attribute definitions, automation
// rules) are loaded fully in a single request and paginated client-side. Soft cap — if a catalog
// ever exceeds it, migrate that screen to server-side pagination.
export const SETTINGS_LIST_FETCH_SIZE = 500;
