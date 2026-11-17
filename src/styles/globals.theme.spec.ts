import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'globals.css'),
  'utf8',
);

const SIDEBAR_TOKEN_PATTERN = /--(sidebar(?:-[a-z]+)*):\s*(#[0-9A-Fa-f]{6})/g;

function parseSidebarTokens(selector: ':root' | '.dark'): Record<string, string> {
  const blockStart = globalsCss.indexOf(`${selector} {`);
  const blockEnd = globalsCss.indexOf('}', blockStart);
  const block = globalsCss.slice(blockStart, blockEnd);

  return Object.fromEntries(
    [...block.matchAll(SIDEBAR_TOKEN_PATTERN)].map(([, name, value]) => [name, value]),
  );
}

function contrast(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)!
      .map(channel => Number.parseInt(channel, 16) / 255)
      .map(channel =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

describe('global shell theme tokens', () => {
  const light = parseSidebarTokens(':root');
  const dark = parseSidebarTokens('.dark');

  it('uses a light surface and dark text for the light theme shell', () => {
    expect(light.sidebar).toBe('#FFFFFF');
    expect(light['sidebar-foreground']).toBe('#0E0E0E');
    expect(light['sidebar-border']).toBe('#E1E3E6');
    expect(contrast(light['sidebar-foreground'], light.sidebar)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the dark theme shell independent from the light theme', () => {
    expect(dark.sidebar).toBe('#121212');
    expect(dark['sidebar-foreground']).toBe('#EDEDED');
    expect(light.sidebar).not.toBe(dark.sidebar);
    expect(contrast(dark['sidebar-foreground'], dark.sidebar)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the Vetorial orange as the action color with AA contrast, never wine', () => {
    const block = (selector: ':root' | '.dark') => {
      const start = globalsCss.indexOf(`${selector} {`);
      return globalsCss.slice(start, globalsCss.indexOf('/* Flow Builder design tokens', start));
    };
    const token = (selector: ':root' | '.dark', name: string) =>
      new RegExp(`\\n  --${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block(selector))![1];
    for (const theme of [':root', '.dark'] as const) {
      const primary = token(theme, 'primary');
      expect(primary).not.toMatch(/5D0507/i);
      expect(contrast(token(theme, 'primary-foreground'), primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(theme, 'primary-text'), token(theme, 'background'))).toBeGreaterThanOrEqual(4.5);
    }
    expect(token(':root', 'primary')).toBe('#C2530A');
    expect(token('.dark', 'primary')).toBe('#E8791F');
  });
});
