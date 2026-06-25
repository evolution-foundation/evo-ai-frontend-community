import { describe, it, expect, vi } from 'vitest';
import { buildAppliedFilterChips } from './appliedFilterChips';
import type { BaseFilter, FilterType } from '@/types/core';

const t = (key: string): string => {
  const map: Record<string, string> = {
    'filter.attributes.name': 'Name',
    'common:filter.operators.is_present': 'Present',
    'common:filter.operators.is_not_present': 'Not present',
    'filter.options.blocked.true': 'Blocked',
  };
  return map[key] ?? key;
};

const FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'filter.attributes.name',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: [],
    attribute_type: 'standard',
  },
  {
    attributeKey: 'role',
    attributeI18nKey: 'Função',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [],
    attribute_type: 'standard',
    options: [{ label: 'Admin', value: 'admin' }],
  },
  {
    attributeKey: 'blocked',
    attributeI18nKey: 'filter.attributes.blocked',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [],
    attribute_type: 'standard',
    options: [{ label: 'filter.options.blocked.true', value: 'true' }],
  },
];

const mkFilter = (over: Partial<BaseFilter>): BaseFilter => ({
  attributeKey: 'name',
  filterOperator: 'equal_to',
  values: '',
  queryOperator: 'and',
  attributeModel: 'standard',
  ...over,
});

describe('buildAppliedFilterChips', () => {
  it('separates attribute label and value (no doubling)', () => {
    const [chip] = buildAppliedFilterChips(
      [mkFilter({ attributeKey: 'name', values: 'John' })],
      FILTER_TYPES,
      t,
      () => {},
    );
    expect(chip.label).toBe('Name');
    expect(chip.value).toBe('John');
  });

  it('translates the attribute label instead of the raw key', () => {
    const [chip] = buildAppliedFilterChips([mkFilter({ attributeKey: 'name' })], FILTER_TYPES, t, () => {});
    expect(chip.label).toBe('Name');
    expect(chip.label).not.toBe('name');
  });

  it('falls back to the raw attributeKey when there is no filter type', () => {
    const [chip] = buildAppliedFilterChips([mkFilter({ attributeKey: 'unknown' })], FILTER_TYPES, t, () => {});
    expect(chip.label).toBe('unknown');
  });

  it('shows the operator name for valueless operators', () => {
    const [chip] = buildAppliedFilterChips(
      [mkFilter({ attributeKey: 'role', filterOperator: 'is_present', values: '' })],
      FILTER_TYPES,
      t,
      () => {},
    );
    expect(chip.value).toBe('Present');
  });

  it('resolves option-backed values to their label', () => {
    const [chip] = buildAppliedFilterChips(
      [mkFilter({ attributeKey: 'role', values: 'admin' })],
      FILTER_TYPES,
      t,
      () => {},
    );
    expect(chip.value).toBe('Admin');
  });

  it('translates i18n option labels', () => {
    const [chip] = buildAppliedFilterChips(
      [mkFilter({ attributeKey: 'blocked', values: 'true' })],
      FILTER_TYPES,
      t,
      () => {},
    );
    expect(chip.value).toBe('Blocked');
  });

  it('joins multiple raw values', () => {
    const [chip] = buildAppliedFilterChips(
      [mkFilter({ attributeKey: 'name', values: ['a', 'b'] })],
      FILTER_TYPES,
      t,
      () => {},
    );
    expect(chip.value).toBe('a, b');
  });

  it('wires onRemove by index', () => {
    const onRemove = vi.fn();
    const [chip] = buildAppliedFilterChips([mkFilter({})], FILTER_TYPES, t, onRemove);
    chip.onRemove();
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
