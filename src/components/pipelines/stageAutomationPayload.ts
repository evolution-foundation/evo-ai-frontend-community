import type { StageAutomationRule } from '@/types/analytics';

// The backend merges automation_rules over what is already stored, so a key left out of the
// payload is PRESERVED, not cleared. Clearing has to be explicit — always send both keys,
// empty when the user emptied them, or the description can never be erased from the form.
export function buildAutomationRulesPayload(
  description: string,
  rules: StageAutomationRule[],
): { description: string; rules: StageAutomationRule[] } {
  return { description: description.trim(), rules };
}
