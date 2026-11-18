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

  it('uses the Vetorial wine #5D0507 as the action color with AA contrast, never orange', () => {
    const block = (selector: ':root' | '.dark') => {
      const start = globalsCss.indexOf(`${selector} {`);
      return globalsCss.slice(start, globalsCss.indexOf('/* Flow Builder design tokens', start));
    };
    const token = (selector: ':root' | '.dark', name: string) =>
      new RegExp(`\\n  --${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block(selector))![1];
    const hue = (hex: string) => {
      const [r, g, b] = hex.slice(1).match(/.{2}/g)!.map(c => Number.parseInt(c, 16) / 255);
      const max = Math.max(r, g, b);
      const d = max - Math.min(r, g, b);
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const theme of [':root', '.dark'] as const) {
      const primary = token(theme, 'primary');
      expect(contrast(token(theme, 'primary-foreground'), primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(theme, 'primary-text'), token(theme, 'background'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(theme, 'primary-text'), token(theme, 'card'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token(theme, 'ring'), token(theme, 'background'))).toBeGreaterThanOrEqual(3);
      // matiz do vinho (≈358°), nunca laranja (10–50°)
      for (const name of ['primary', 'primary-text', 'ring', 'sidebar-primary', 'chart-1']) {
        const h = hue(token(theme, name));
        expect(h >= 340 || h <= 5).toBe(true);
      }
      // alerta de perigo continua distinguível do vinho
      const gap = Math.abs(hue(token(theme, 'danger-text')) - hue(token(theme, 'primary-text')));
      expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(10);
    }
    expect(token(':root', 'primary')).toBe('#5D0507');
    expect(token('.dark', 'primary')).toBe('#B0323A');
    expect(globalsCss).not.toMatch(/#(C2530A|E8791F|B45417|A8460A|F08A3C)/i);
  });
});
