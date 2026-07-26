const rawApiBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Strip a trailing /api/vN and any trailing slash to get the bare API origin.
const apiOrigin = rawApiBaseURL.replace(/\/api\/v\d+$/i, '').replace(/\/$/, '');

/**
 * Resolves a backend asset URL against the API origin.
 *
 * The API serializes ActiveStorage blob URLs as RELATIVE paths (only_path: true,
 * e.g. `/rails/active_storage/blobs/proxy/...`). Rendered as `<img src>` from the
 * SPA those resolve against the SPA's own origin — which in a split-origin setup
 * (dev: SPA :5173, API :3000) is the wrong server and returns the SPA shell, not
 * the image. Prefix relative paths with the API origin so they load from the API.
 * Absolute (http/https//), blob: and data: URLs are returned untouched.
 */
export const assetUrl = (url?: string | null): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http') || trimmed.startsWith('//')) return trimmed;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed;

  return trimmed.startsWith('/') ? `${apiOrigin}${trimmed}` : `${apiOrigin}/${trimmed}`;
};
