// Shared types for the Journey Flow Builder pre-activation validation framework
// (EVO-1744). The engine (validateJourney) and the per-node validators speak
// these. Validators are pure and data-only so they run headless from the journey
// list (off persisted flowData), not just inside the React Flow editor.

export type ValidationSeverity = 'error' | 'warning';

export type ValidationRule =
  | 'requiredConfig'
  | 'triggerActionContext'
  | 'terminalPath'
  | 'unreachableExit';

export interface ValidationIssue {
  /** Node the issue belongs to; undefined = journey-level. */
  nodeId?: string;
  rule: ValidationRule;
  severity: ValidationSeverity;
  /** i18n key (resolved at render). */
  messageKey: string;
  /** Interpolation params for the message (e.g. missing field names, node label). */
  params?: Record<string, unknown>;
}

export interface JourneyValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  byNodeId: Record<string, ValidationIssue[]>;
  /** A journey can only be activated when it has zero errors (warnings allowed). */
  isActivatable: boolean;
}
