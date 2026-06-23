import { createContext, useContext } from 'react';
import type { ValidationIssue } from '@/utils/journeyValidators';

// EVO-1744: per-node validation markers are delivered via context, NOT via node
// `data` (review finding F6: writing into `data` would re-trigger the autosave
// dirty-check and persist markers into flowData). Nodes read their issues by id.
export interface JourneyValidationContextValue {
  byNodeId: Record<string, ValidationIssue[]>;
}

const JourneyValidationContext = createContext<JourneyValidationContextValue>({
  byNodeId: {},
});

export const JourneyValidationProvider = JourneyValidationContext.Provider;

export function useNodeValidationIssues(
  nodeId: string | null | undefined,
): ValidationIssue[] {
  const { byNodeId } = useContext(JourneyValidationContext);
  if (!nodeId) return [];
  return byNodeId[nodeId] ?? [];
}
