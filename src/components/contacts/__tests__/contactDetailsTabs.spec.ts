import { describe, expect, it } from 'vitest';
import { buildContactDetailsTabs } from '../contactDetailsTabs';

const t = (k: string) => k;

describe('buildContactDetailsTabs (AC1b — deterministic tab order)', () => {
  it('places "events" immediately after "pipeline" and before "history" for a person contact', () => {
    const tabs = buildContactDetailsTabs({ hasCompanies: true, hasPersons: false, t });
    const order = tabs.map((tab) => tab.value);
    expect(order).toEqual(['companies', 'pipeline', 'events', 'history', 'notes', 'attributes']);
  });

  it('places "events" immediately after "pipeline" and before "history" for a company contact', () => {
    const tabs = buildContactDetailsTabs({ hasCompanies: false, hasPersons: true, t });
    const order = tabs.map((tab) => tab.value);
    expect(order).toEqual(['persons', 'pipeline', 'events', 'history', 'notes', 'attributes']);
  });

  it('places "events" immediately after "pipeline" for a generic contact (no companies/persons)', () => {
    const tabs = buildContactDetailsTabs({ hasCompanies: false, hasPersons: false, t });
    const order = tabs.map((tab) => tab.value);
    expect(order).toEqual(['pipeline', 'events', 'history', 'notes', 'attributes']);
    const pipelineIdx = order.indexOf('pipeline');
    const eventsIdx = order.indexOf('events');
    const historyIdx = order.indexOf('history');
    expect(eventsIdx - pipelineIdx).toBe(1);
    expect(historyIdx - eventsIdx).toBe(1);
  });

  it('keeps the "events" label tied to events.details.tabs.events i18n key', () => {
    const tabs = buildContactDetailsTabs({ hasCompanies: false, hasPersons: false, t });
    const events = tabs.find((tab) => tab.value === 'events');
    expect(events?.label).toBe('details.tabs.events');
  });
});
