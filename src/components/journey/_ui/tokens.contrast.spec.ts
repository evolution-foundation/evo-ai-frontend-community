import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Color from 'colorjs.io';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const globalsCss = readFileSync(
  resolve(__dirname, '../../../styles/globals.css'),
  'utf8',
);

type Mode = 'light' | 'dark';

const TOKEN_PATTERN = /--(flow-[a-z0-9-]+):\s*(oklch\([^)]+\))/g;

function parseModeTokens(css: string, mode: Mode): Record<string, string> {
  const blockHeader = mode === 'light' ? ':root' : '.dark';
  const blockStart = css.indexOf(`${blockHeader} {`);
  if (blockStart === -1) {
    throw new Error(`Block "${blockHeader}" not found in globals.css`);
  }
  const blockEnd = css.indexOf('}', blockStart);
  const block = css.slice(blockStart, blockEnd);

  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(TOKEN_PATTERN)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

function contrast(fg: string, bg: string): number {
  return Math.abs(new Color(fg).contrast(new Color(bg), 'WCAG21'));
}

const NODE_CATEGORIES = ['trigger', 'condition', 'control', 'exit'] as const;
const ACTION_SUBTYPES = ['message', 'webhook', 'label', 'pipeline'] as const;
const FEEDBACK_VARIANTS = ['info', 'warn', 'error', 'success'] as const;

/**
 * Pairs that MUST pass WCAG 2.1 AA per the card ACs. Scope chosen per
 * WCAG 1.4.3 (body text 4.5:1) and 1.4.11 (graphical objects required to
 * understand the content, 3:1). Out of scope intentionally:
 *  - Node bg vs canvas-bg → visual grouping fill, not a graphical object
 *    conveying information. The node's identity comes from its FG text and
 *    its BORDER, both of which are still asserted.
 *  - Palette divider / Panel divider → decorative separators, no semantic
 *    payload (WCAG 1.4.11 explicitly exempts "pure decoration").
 *  - Feedback banner border over bg → decorative accent; the variant is
 *    identified by the icon-less text + bg colour combo, not by the border.
 *    The fg/bg body-text contrast is what AC-1/2 actually require here.
 * These advisory ratios are still computed for README documentation but not
 * asserted as hard failures.
 */
const PAIRS: ReadonlyArray<{
  label: string;
  fg: string;
  bg: string;
  kind: 'body' | 'graphical';
}> = [
  ...NODE_CATEGORIES.flatMap((cat) => [
    {
      label: `node-${cat} fg over bg`,
      fg: `flow-node-${cat}-fg`,
      bg: `flow-node-${cat}-bg`,
      kind: 'body' as const,
    },
    {
      label: `node-${cat} border over canvas-bg`,
      fg: `flow-node-${cat}-border`,
      bg: `flow-canvas-bg`,
      kind: 'graphical' as const,
    },
  ]),
  ...ACTION_SUBTYPES.flatMap((sub) => [
    {
      label: `node-action-${sub} fg over bg`,
      fg: `flow-node-action-${sub}-fg`,
      bg: `flow-node-action-${sub}-bg`,
      kind: 'body' as const,
    },
    {
      label: `node-action-${sub} border over canvas-bg`,
      fg: `flow-node-action-${sub}-border`,
      bg: `flow-canvas-bg`,
      kind: 'graphical' as const,
    },
  ]),
  ...FEEDBACK_VARIANTS.map((variant) => ({
    label: `feedback-${variant} fg over bg`,
    fg: `flow-feedback-${variant}-fg`,
    bg: `flow-feedback-${variant}-bg`,
    kind: 'body' as const,
  })),
  {
    label: 'edge-default over canvas-bg',
    fg: 'flow-edge-default',
    bg: 'flow-canvas-bg',
    kind: 'graphical',
  },
  {
    label: 'edge-active over canvas-bg',
    fg: 'flow-edge-active',
    bg: 'flow-canvas-bg',
    kind: 'graphical',
  },
  {
    label: 'edge-error over canvas-bg',
    fg: 'flow-edge-error',
    bg: 'flow-canvas-bg',
    kind: 'graphical',
  },
];

describe('flow-* token WCAG AA contrast', () => {
  for (const mode of ['light', 'dark'] as const) {
    describe(mode, () => {
      const tokens = parseModeTokens(globalsCss, mode);

      for (const pair of PAIRS) {
        const threshold = pair.kind === 'body' ? 4.5 : 3;
        const fgValue = tokens[pair.fg];
        const bgValue = tokens[pair.bg];

        it(`${pair.label} (${pair.kind}, target ≥${threshold}:1)`, () => {
          expect(fgValue, `missing token --${pair.fg} in ${mode} block`).toBeDefined();
          expect(bgValue, `missing token --${pair.bg} in ${mode} block`).toBeDefined();
          const ratio = contrast(fgValue, bgValue);
          expect(
            ratio,
            `${pair.label} measured ratio ${ratio.toFixed(2)}:1 below WCAG AA threshold ${threshold}:1`,
          ).toBeGreaterThanOrEqual(threshold);
        });
      }
    });
  }
});
