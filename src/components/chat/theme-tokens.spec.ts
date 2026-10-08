import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATUS_PILL_CLASSES } from './chat-header/statusMeta';

// Chat surfaces that painted colours inline, which never follow `.dark`. Colour goes
// through classes: theme tokens, or an arbitrary `[#hex]` whose property, under the
// same variants, is repainted by a `dark:` colour. statusMeta's solid colours sit
// under white text; its pill classes are checked on their own below.
const FILES = [
  'message-input/MacrosButton.tsx',
  'message-input/ComposerPlusMenu.tsx',
  'message-input/NoteComposer.tsx',
  'rich-text-editor/FormattingBubbleMenu.tsx',
  'chat-header/ConversationStatusButton.tsx',
  'chat-header/ChatHeader.tsx',
  'banner/ConversationNoteBanner.tsx',
];

// Any hex outside an arbitrary `[#hex]` value, e.g. `'1px solid #eceef2'`.
const BARE_HEX = /(?<!\[)#[0-9a-fA-F]{3,8}(?![\w-])/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?)\(/g;
const NAMED_INLINE_COLOR =
  /\b(?:background|backgroundColor|color|borderColor|border|fill|stroke)\s*:\s*(['"`])[^'"`]*\b(?:white|black|gr[ae]y)\b[^'"`]*\1/g;
const STRING_LITERAL = /(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
// `hover:` + `bg` in `hover:bg-[#f4f6f9]`: what the `dark:` pair has to repeat.
const ARBITRARY_HEX = /(?<![^\s'"`])([^\s'"`]*:)?([a-z][a-z-]*?)-\[#[0-9a-fA-F]{3,8}\]/g;
// A palette shade, keyword or theme token; `dark:text-sm` or `dark:border-t-*` is no pair.
const COLOR_VALUE =
  '(?:[a-z]+-\\d{2,3}|white|black|transparent|current|\\[#[0-9a-fA-F]{3,8}\\]|' +
  '(?:background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring)(?:-foreground)?)' +
  '(?:/\\d+)?(?![\\w-])';
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function unpairedArbitraryHex(literal: string): string[] {
  const missing: string[] = [];
  for (const [token, variants = '', property] of literal.matchAll(ARBITRARY_HEX)) {
    if (variants.split(':').includes('dark')) continue;
    const v = escapeRegExp(variants);
    if (!new RegExp(`(?:^|\\s)(?:dark:${v}|${v}dark:)${property}-${COLOR_VALUE}`).test(literal)) missing.push(token);
  }
  return missing;
}

function offenders(source: string): string[] {
  const found = [
    ...(source.match(BARE_HEX) ?? []),
    ...(source.match(COLOR_FUNCTION) ?? []),
    ...(source.match(NAMED_INLINE_COLOR) ?? []),
  ];
  for (const [, , literal] of source.matchAll(STRING_LITERAL)) found.push(...unpairedArbitraryHex(literal));
  return found;
}

describe('chat theme tokens', () => {
  it.each(FILES)('%s paints no colour that ignores the dark theme', (file) => {
    const source = readFileSync(join(__dirname, file), 'utf8');
    expect(offenders(source)).toEqual([]);
  });

  it('catches what it is meant to catch', () => {
    expect(offenders(`style={{ background: '#FFFFFF' }}`)).toHaveLength(1);
    expect(offenders(`boxShadow: '0 12px 32px rgba(20,30,45,.16)'`)).toHaveLength(1);
    expect(offenders(`style={{ background: 'hsl(0 0% 100%)' }}`)).toHaveLength(1);
    expect(offenders(`style={{ background: 'white' }}`)).toHaveLength(1);
    expect(offenders(`className="bg-[#FDF9EF]"`)).toEqual(['bg-[#FDF9EF]']);
    // A dark: pair for another property doesn't cover this one.
    expect(offenders(`className="bg-[#FDF9EF] text-[#5c4f2e] dark:text-amber-100"`)).toEqual(['bg-[#FDF9EF]']);
    expect(offenders(`className="text-[#5c4f2e] dark:font-medium"`)).toEqual(['text-[#5c4f2e]']);
    expect(offenders(`className="border-t-[#f3c34a] dark:border-amber-500"`)).toEqual(['border-t-[#f3c34a]']);
    expect(offenders(`className="border border-[#fdba74] dark:border-t-orange-800"`)).toEqual(['border-[#fdba74]']);
    expect(offenders(`className="text-[#9a3412] dark:text-sm"`)).toEqual(['text-[#9a3412]']);
    expect(offenders(`style={{ borderTop: '3px solid #f3c34a' }}`)).toHaveLength(1);
    expect(offenders(`className="hover:bg-[#f4f6f9]"`)).toEqual(['hover:bg-[#f4f6f9]']);
    expect(offenders(`className="hover:bg-[#f4f6f9] dark:bg-accent"`)).toEqual(['hover:bg-[#f4f6f9]']);
  });

  it('accepts paired arbitrary colours and theme tokens', () => {
    expect(offenders(`className="bg-[#FDF9EF] dark:bg-amber-950/40"`)).toEqual([]);
    expect(offenders(`className="border-t-[3px] border-t-[#f3c34a] dark:border-t-amber-500"`)).toEqual([]);
    expect(offenders(`className="hover:bg-[#f4f6f9] dark:hover:bg-accent"`)).toEqual([]);
    expect(offenders(`className="bg-popover border-border text-white"`)).toEqual([]);
  });

  it.each(Object.entries(STATUS_PILL_CLASSES))('status pill %s pairs every colour with dark:', (_, classes) => {
    expect(unpairedArbitraryHex(classes)).toEqual([]);
  });
});
