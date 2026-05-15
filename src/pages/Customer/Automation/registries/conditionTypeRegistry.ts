import type { AutomationFilterOperator } from '@/types/automation';

export type ConditionDataType =
  | 'text'
  | 'text_case_insensitive'
  | 'number'
  | 'numeric'
  | 'boolean'
  | 'labels'
  | 'date'
  | 'link'
  | 'pipeline'
  | 'custom_attribute';

export interface ConditionTypeDescriptor {
  defaultOperators: AutomationFilterOperator[];
}

export const conditionTypeRegistry: Record<ConditionDataType, ConditionTypeDescriptor> = {
  text: {
    defaultOperators: ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
  },
  text_case_insensitive: {
    defaultOperators: ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
  },
  number: {
    defaultOperators: ['equal_to', 'not_equal_to', 'is_greater_than', 'is_less_than'],
  },
  numeric: {
    defaultOperators: ['equal_to', 'not_equal_to'],
  },
  boolean: {
    defaultOperators: ['equal_to', 'not_equal_to'],
  },
  labels: {
    defaultOperators: ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
  },
  date: {
    defaultOperators: ['is_greater_than', 'is_less_than', 'days_before'],
  },
  link: {
    defaultOperators: ['equal_to', 'not_equal_to', 'contains', 'does_not_contain'],
  },
  pipeline: {
    defaultOperators: ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
  },
  custom_attribute: {
    defaultOperators: ['equal_to', 'not_equal_to', 'is_present', 'is_not_present'],
  },
};

export function getOperatorsForType(dataType: ConditionDataType): AutomationFilterOperator[] {
  return conditionTypeRegistry[dataType].defaultOperators;
}
