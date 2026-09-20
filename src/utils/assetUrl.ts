const rawApiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Strip a trailing /api/vN and any trailing slash to get the bare API origin.
const apiOrigin = rawApiBaseURL.replace(/\/api\/v\d+$/i, '').replace(/\/$/, '');

/**
 * Resolves a backend asset URL against the API origin. The API serialises blob URLs as
 * relative paths, and `<img src>` would resolve those against the SPA's own origin —
 * the wrong server in a split-origin setup. Absolute, blob: and data: pass through.
 */
export const assetUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http') || trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;

  return trimmed.startsWith('/') ? `${apiOrigin}${trimmed}` : `${apiOrigin}/${trimmed}`;
};
