import { describe, it, expect } from 'vitest';
import { CONTACT_FILTER_TYPES } from './filters';

describe('CONTACT_FILTER_TYPES (EVO-1835)', () => {
  const byKey = (k: string) => CONTACT_FILTER_TYPES.find(f => f.attributeKey === k);
  const keys = CONTACT_FILTER_TYPES.map(f => f.attributeKey);

  it('exposes the new contact filters (labels, country_code, city, company, blocked)', () => {
    for (const k of ['labels', 'country_code', 'city', 'company', 'blocked']) {
      expect(keys).toContain(k);
    }
  });

  it('keeps the original filters', () => {
    for (const k of ['name', 'email', 'phone_number', 'identifier', 'created_at', 'last_activity_at']) {
      expect(keys).toContain(k);
    }
  });

  it('labels and company are search_selects with a dynamic-options placeholder', () => {
    expect(byKey('labels')?.inputType).toBe('search_select');
    expect(byKey('labels')?.options).toEqual([]);
    // EVO-1887: company is a picker (select from registered companies), not free text.
    expect(byKey('company')?.inputType).toBe('search_select');
    expect(byKey('company')?.options).toEqual([]);
  });

  it('blocked offers boolean options', () => {
    expect(byKey('blocked')?.options?.map(o => o.value)).toEqual(['true', 'false']);
  });

  it('city allows contains operators; company and country_code do not', () => {
    expect(byKey('city')?.filterOperators.map(o => o.key)).toContain('contains');
    // EVO-1887: company filters by association id, so contains is not offered.
    expect(byKey('company')?.filterOperators.map(o => o.key)).not.toContain('contains');
    expect(byKey('country_code')?.filterOperators.map(o => o.key)).not.toContain('contains');
  });
});
