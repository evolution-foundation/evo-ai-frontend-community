import type { AppliedFilter, BaseFilter, FilterType } from '@/types/core';

type TranslateFn = (key: string) => string;

const VALUELESS_OPERATORS = ['is_present', 'is_not_present'];

const resolveAttributeLabel = (
  filter: BaseFilter,
  filterType: FilterType | undefined,
  t: TranslateFn,
): string => (filterType?.attributeI18nKey ? t(filterType.attributeI18nKey) : filter.attributeKey);

const resolveValueLabel = (
  filter: BaseFilter,
  filterType: FilterType | undefined,
  t: TranslateFn,
): string => {
  // Presence operators carry no value — show the operator name so the chip
  // reads "Attribute: Present" instead of a dangling "Attribute:".
  if (VALUELESS_OPERATORS.includes(filter.filterOperator)) {
    return t(`common:filter.operators.${filter.filterOperator}`);
  }

  const values = Array.isArray(filter.values) ? filter.values : [filter.values];
  return values
    .map(value => {
      const raw = String(value ?? '');
      // Option-backed values store an id/code; show the option's human label.
      const option = filterType?.options?.find(o => String(o.value) === raw);
      return option ? t(option.label) : raw;
    })
    .join(', ');
};

/**
 * Builds the applied-filter chips for `BaseHeader` (which renders each chip as
 * `{label}: {value}`). `label` is the attribute's i18n label and `value` is the
 * human-readable value (option label) or the operator name for valueless
 * operators — never the raw attributeKey and never a doubled value.
 */
export const buildAppliedFilterChips = (
  filters: BaseFilter[],
  filterTypes: FilterType[],
  t: TranslateFn,
  onRemove: (index: number) => void,
): AppliedFilter[] =>
  filters.map((filter, index) => {
    const filterType = filterTypes.find(f => f.attributeKey === filter.attributeKey);
    return {
      id: `filter-${index}`,
      label: resolveAttributeLabel(filter, filterType, t),
      value: resolveValueLabel(filter, filterType, t),
      onRemove: () => onRemove(index),
    };
  });
