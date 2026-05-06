const BLOCK_BOUNDARY_REGEX =
  /<\s*br\s*\/?>|<\/\s*(?:p|div|li|h[1-6]|blockquote|tr|td|th|article|section|header|footer|nav|aside|pre|figure|address)\s*>/gi;

export function stripHtml(html: string): string {
  if (!html) return '';

  const withSpaces = html.replace(BLOCK_BOUNDARY_REGEX, ' ');

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return withSpaces.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  const doc = new DOMParser().parseFromString(withSpaces, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
