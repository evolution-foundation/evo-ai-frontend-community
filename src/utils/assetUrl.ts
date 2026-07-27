const rawApiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Strip a trailing /api/vN and any trailing slash to get the bare API origin.
const apiOrigin = rawApiBaseURL.replace(/\/api\/v\d+$/i, '').replace(/\/$/, '');

/**
 * Resolves a backend asset URL against the API origin.
 *
 * The API serialises blob URLs as relative paths (only_path: true), and an
 * `<img src>` resolves those against the SPA's own origin — the wrong server in a
 * split-origin setup, which answers with the SPA shell instead of the image.
 * Absolute, blob: and data: URLs pass through untouched.
 */
export const assetUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http') || trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;

  return trimmed.startsWith('/') ? `${apiOrigin}${trimmed}` : `${apiOrigin}/${trimmed}`;
};
