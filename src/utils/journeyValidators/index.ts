// Barrel for the Journey Flow Builder validation framework (EVO-1744).
// The engine entry point `validateJourney` lives in `../journeyFlowValidation`.
export type {
  ValidationSeverity,
  ValidationRule,
  ValidationIssue,
  JourneyValidationResult,
} from './types';
export { nodeValidators, validateNodeConfig } from './nodeValidators';
export {
  CONVERSATION_REQUIRING_NODES,
  triggerProvidesConversation,
  validateTriggerActionContext,
} from './triggerActionContext';
