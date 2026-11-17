import { describe, it, expect } from 'vitest';
import type { Pipeline, PipelineItem } from '@/types/analytics/pipelines';
import { configurationFor, dateValue, defaultConfiguration, fieldText, nativeFields, stageTotal } from './cardConfiguration';

describe('shared pipeline card configuration', () => {
  it('defaults title first and promotes an existing specialty without enabling every custom field', () => {
    const config = defaultConfiguration([...nativeFields, { id: 'deal_attribute:specialty', label: 'Especialidade', source: 'deal_attribute', type: 'text' }, { id: 'deal_attribute:other', label: 'Outro', source: 'deal_attribute', type: 'text' }]);
    expect(config.fields[0]).toEqual({ id: 'title', visible: true });
    expect(config.fields[3]).toEqual({ id: 'deal_attribute:specialty', visible: true });
    expect(config.fields.find(field => field.id === 'deal_attribute:other')?.visible).toBe(false);
  });
  it('preserves saved order and visibility while appending new fields disabled', () => {
    const saved = { version: 1, density: 'compact', fields: [{ id: 'title', visible: true }, { id: 'contact', visible: false }] };
    const config = configurationFor({ card_configuration: saved, card_field_definitions: nativeFields } as Pipeline);
    expect(config.density).toBe('compact');
    expect(config.fields.slice(0,2)).toEqual(saved.fields);
    expect(config.fields.find(field => field.id === 'value')?.visible).toBe(false);
  });
  it('ignores legacy saved company field and never offers it', () => {
    expect(nativeFields.some(field => field.id === 'company')).toBe(false);
    const saved = { version: 1, density: 'comfortable', fields: [{ id: 'title', visible: true }, { id: 'company', visible: true }, { id: 'contact', visible: true }] };
    const config = configurationFor({ card_configuration: saved, card_field_definitions: nativeFields } as Pipeline);
    expect(config.fields.some(field => field.id === 'company')).toBe(false);
    expect(config.fields.slice(0, 2)).toEqual([{ id: 'title', visible: true }, { id: 'contact', visible: true }]);
  });
  it('keeps zero and false and refuses invalid timestamps', () => {
    expect(fieldText(false)).toBe('Não'); expect(fieldText(0)).toBe('0');
    expect(fieldText(null)).toBe('Não informado');
    expect(dateValue(undefined)).toBeNull(); expect(dateValue('garbage')).toBeNull();
    expect(dateValue('2026-11-11T12:00:00Z')?.toISOString()).toBe('2026-11-11T12:00:00.000Z');
  });
  it('shows zero totals and never sums mixed currencies', () => {
    expect(stageTotal([])).toMatch(/0,00/);
    expect(stageTotal([{value:1,currency:'BRL'},{value:2,currency:'USD'}] as PipelineItem[])).toBe('Múltiplas moedas');
  });
});
