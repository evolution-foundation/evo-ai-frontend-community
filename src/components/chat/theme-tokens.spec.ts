import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Chat surfaces that used to paint colours in inline styles, which never follow
// the `.dark` class. Colour goes through Tailwind classes here: theme tokens for
// neutral surfaces, and an arbitrary `[#hex]` only when the same class string
// also sets that same property under `dark:`. statusMeta.ts is left out on
// purpose: its solid status colours sit under white text and read the same in
// both themes.
const FILES = [
  'message-input/MacrosButton.tsx',
  'message-input/ComposerPlusMenu.tsx',
  'message-input/NoteComposer.tsx',
  'rich-text-editor/FormattingBubbleMenu.tsx',
  'chat-header/ConversationStatusButton.tsx',
  'chat-header/ChatHeader.tsx',
  'banner/ConversationNoteBanner.tsx',
];

const QUOTED_HEX = /(['"`])#[0-9a-fA-F]{3,8}\1/g;
const COLOR_FUNCTION = /\b(?:rgba?|hsla?)\(/g;
const NAMED_INLINE_COLOR =
  /\b(?:background|backgroundColor|color|borderColor|border|fill|stroke)\s*:\s*(['"`])[^'"`]*\b(?:white|black|gr[ae]y)\b[^'"`]*\1/g;
const STRING_LITERAL = /(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
// The property prefix of each arbitrary-hex utility, e.g. `border-t` in
// `border-t-[#f3c34a]`; a `dark:` variant of the same prefix must sit beside it.
const ARBITRARY_HEX = /(?<![\w:-])((?:bg|text|border(?:-[trblxy])?|fill|stroke|ring|outline))-\[#[0-9a-fA-F]{3,8}\]/g;

function unpairedArbitraryHex(literal: string): string[] {
  const missing: string[] = [];
  for (const [token, prefix] of literal.matchAll(ARBITRARY_HEX)) {
    if (!new RegExp(`(?:^|\\s)dark:${prefix}-`).test(literal)) missing.push(token);
  }
  return missing;
}

function offenders(source: string): string[] {
  const found = [
    ...(source.match(QUOTED_HEX) ?? []),
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
  });

  it('accepts paired arbitrary colours and theme tokens', () => {
    expect(offenders(`className="bg-[#FDF9EF] dark:bg-amber-950/40"`)).toEqual([]);
    expect(offenders(`className="border-t-[3px] border-t-[#f3c34a] dark:border-t-amber-500"`)).toEqual([]);
    expect(offenders(`className="bg-popover border-border text-white"`)).toEqual([]);
  });
});
