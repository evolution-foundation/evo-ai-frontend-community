import { LayoutTemplate } from 'lucide-react';
import { SubMenuItem } from '@/components/layout/config/menuItems';

export interface SiteLink {
  id: string;
  name: string;
  url: string;
}

export const DEFAULT_SITE_SLUG = 'azuliapp';
export const DEFAULT_SITE_URL = 'https://azuliapp.com.br';
export const SITE_LINKS_EVENT = 'site-links-changed';

const STORAGE_KEY = 'custom-site-links';

function sanitizeId(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'site';
}

export function getSiteLinks(): SiteLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l.id === 'string' && typeof l.url === 'string');
  } catch {
    return [];
  }
}

export function saveSiteLinks(links: SiteLink[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  window.dispatchEvent(new CustomEvent(SITE_LINKS_EVENT));
}

/** Normaliza a URL informada (adiciona https:// se faltar esquema). */
export function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function siteHrefForSlug(slug: string): string {
  return `/sites/${slug}`;
}

/**
 * Gera um slug único para o link, baseado no nome.
 */
export function generateSiteSlug(name: string, existing: SiteLink[]): string {
  const base = sanitizeId(name);
  if (!existing.some((l) => l.id === base)) return base;
  let i = 2;
  while (existing.some((l) => l.id === `${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

/**
 * Converte os links customizados em subitens de menu do grupo Sites.
 */
export function siteLinksToSubItems(links: SiteLink[]): SubMenuItem[] {
  return links.map((link) => ({
    name: link.name,
    href: siteHrefForSlug(link.id),
    icon: LayoutTemplate,
  }));
}

export function resolveSiteUrl(slug: string | undefined): { name: string; url: string } | null {
  if (!slug) return null;
  const link = getSiteLinks().find((l) => l.id === slug);
  if (link) return { name: link.name, url: link.url };
  if (slug === DEFAULT_SITE_SLUG) return { name: 'azuliapp.com.br', url: DEFAULT_SITE_URL };
  return null;
}
