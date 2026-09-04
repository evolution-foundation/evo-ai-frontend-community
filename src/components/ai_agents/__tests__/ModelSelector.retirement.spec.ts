import { describe, it, expect } from 'vitest';
import { availableModels } from '@/components/ai_agents/ModelSelector';

/**
 * The one rule the pinned list cannot enforce on its own: an id whose end of service the
 * provider has already dated must be gone by that date. The axes that list live are
 * corrected the moment a key is chosen; vertex and perplexity never are, so this table is
 * the only thing that ever notices. Deliberately offline, so a guard whose whole job is
 * watching a date runs on every PR — the network specs are out of CI.
 *
 * Serving an id until its date is the posture, not an oversight: pulling it early costs
 * the user a model that still answers. The exception is an id that already fails before
 * its date — there is no working model left to cost anyone, and the perplexity axis was
 * emptied ahead of schedule on exactly that ground once (its Chat Completions ids). The
 * axis is pinned again on a different route (Responses API); the same rule applies the
 * moment any of those ids gets a published end-of-service date.
 */

// End-of-service dates, as the provider published them. A row is added when a pin gains a
// dated shutdown and dropped when the id leaves the list.
//
// Bedrock is absent on purpose: its `Model EOL date` is a floor ("No sooner than …"), not
// an expiry, so it is no deadline to assert. That axis reads the live lifecycle instead,
// in ModelSelector.bedrockLifecycle.spec.ts.
const RETIRES_ON: Record<string, string> = {
  // Vertex retires the whole Gemini 2.5 family. Pro has no GA successor to pin yet
  // (3.1 Pro is still Preview), which is exactly why the date needs a guard.
  'vertex_ai/gemini-2.5-pro': '2026-10-16',
};

// A date is reached the moment ANY timezone is on it, which UTC is the last to be — up to
// 14 hours behind Kiribati. Reading the calendar at UTC+14 makes the guard early rather
// than late, and early costs at most a few hours of a model that still answers.
const EARLIEST_TZ_OFFSET_MS = 14 * 60 * 60 * 1000;

const today = () => new Date(Date.now() + EARLIEST_TZ_OFFSET_MS).toISOString().slice(0, 10);

// The regex alone accepts 2026-02-31 and 2026-13-01. A month past 12 sorts ABOVE every
// real date, so the compare above would never fire for that row. Round-tripping through
// Date rejects the typo instead of leaving it to disarm its own guard.
const isCalendarDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

describe('announced retirements', () => {
  it('offers no id whose end-of-service date has arrived', () => {
    const expired = Object.entries(RETIRES_ON)
      .filter(([value]) => availableModels.some(m => m.value === value))
      .filter(([, date]) => date <= today())
      .map(([value, date]) => `${value} (retired ${date})`);
    expect(expired).toEqual([]);
  });

  it('dates only ids the list still carries, so a removal cleans the table too', () => {
    const orphaned = Object.keys(RETIRES_ON).filter(
      value => !availableModels.some(m => m.value === value),
    );
    expect(orphaned).toEqual([]);
  });

  it('reads every date as a calendar date, not just as a digit pattern', () => {
    const malformed = Object.entries(RETIRES_ON)
      .filter(([, date]) => !isCalendarDate(date))
      .map(([value, date]) => `${value} (${date})`);
    expect(malformed).toEqual([]);
  });
});
