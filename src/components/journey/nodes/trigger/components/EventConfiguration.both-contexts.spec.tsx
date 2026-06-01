import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventConfiguration } from './EventConfiguration';
import '@/i18n/config';

// Cross-context regression guard.
//
// Both consumers render THIS SAME `EventConfiguration` from the same barrel
// (`@/components/journey/nodes/trigger/components`):
//   - Flow Builder  → JourneyTriggerPanel.tsx (real journeyId + variable-mapping callback)
//   - Campaigns     → CampaignTriggerConfig.tsx (NO journeyId, no mapping callback)
// The only intended difference is the props each context passes. This spec mounts
// the component with each context's EXACT prop shape and locks in equivalent
// behavior — the executable proof of the "same component reused" conclusion and
// that the only difference is props.
//
// Network seam: the custom-event-name `VariableInput` calls
// `useJourneyVariables(journeyId)`, which hits `journeyService.getJourneyVariables`.
// We mock it AND capture the journeyId it receives, so we can assert the
// context-aware behaviour: the campaign context (no journey) must call the hook
// with `undefined` — never a real/sentinel id — so no fetch fires; the flow
// context passes the real journey id.
const { useJourneyVariablesSpy } = vi.hoisted(() => ({ useJourneyVariablesSpy: vi.fn() }));
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: (journeyId?: string) => {
    useJourneyVariablesSpy(journeyId);
    return {
      variables: [],
      loading: false,
      error: null,
      fetchVariables: vi.fn(),
      updateVariables: vi.fn(),
      addVariable: vi.fn(),
      updateVariable: vi.fn(),
      deleteVariable: vi.fn(),
    };
  },
}));

type Context = 'flow' | 'campaign';

interface EventProperty {
  path: string;
  operator: { type: string; value?: unknown };
}

// The exact prop shapes the two consumers pass (see JourneyTriggerPanel.tsx and
// CampaignTriggerConfig.tsx). The only differences are journeyId (real id vs none)
// and whether onVariableMappingsChange is provided.
const CONTEXTS: Record<Context, { journeyId?: string; hasMappingCallback: boolean }> = {
  flow: { journeyId: 'journey-uuid-123', hasMappingCallback: true },
  campaign: { journeyId: undefined, hasMappingCallback: false },
};

function renderInContext(context: Context) {
  const onEventNameChange = vi.fn();
  const onEventPropertiesChange = vi.fn();
  const { journeyId, hasMappingCallback } = CONTEXTS[context];

  function Harness() {
    const [eventName, setEventName] = useState('');
    const [eventProperties, setEventProperties] = useState<EventProperty[]>([]);
    return (
      <EventConfiguration
        eventName={eventName}
        eventProperties={eventProperties}
        onEventNameChange={next => {
          setEventName(next);
          onEventNameChange(next);
        }}
        onEventPropertiesChange={next => {
          setEventProperties(next);
          onEventPropertiesChange(next);
        }}
        variableMappings={[]}
        onVariableMappingsChange={hasMappingCallback ? vi.fn() : undefined}
        journeyId={journeyId}
      />
    );
  }

  render(<Harness />);
  return { onEventNameChange, onEventPropertiesChange };
}

// Pick the canonical "Contact created" entry from the shared EventSelector.
async function selectContactCreated(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox'));
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(/contact created|contato criado/i));
}

async function selectCustomEvent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox'));
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(/custom event|evento personalizado/i));
}

const CONTEXT_CASES: Context[] = ['flow', 'campaign'];

describe('EventConfiguration — shared across Flow Builder + Campaign contexts', () => {
  beforeEach(() => {
    useJourneyVariablesSpy.mockClear();
  });

  it.each(CONTEXT_CASES)(
    'renders the shared EventSelector + schema-driven properties form (%s context)',
    async context => {
      renderInContext(context);
      const user = userEvent.setup();
      // EventSelector (EVO-1271 / 10.6) — the combobox is the primary entry point.
      expect(screen.getByRole('combobox')).toBeTruthy();
      // After picking a canonical event, the schema-driven form renders its fields.
      await selectContactCreated(user);
      expect(screen.getByLabelText(/source/i)).toBeTruthy();
    },
  );

  it.each(CONTEXT_CASES)(
    'persists a canonical event name identically (%s context)',
    async context => {
      const { onEventNameChange } = renderInContext(context);
      const user = userEvent.setup();

      await selectContactCreated(user);

      // Same canonical value resolved regardless of context.
      expect(onEventNameChange).toHaveBeenCalledWith('contact.created');
    },
  );

  it.each(CONTEXT_CASES)(
    'emits an Equals filter-condition array when a schema field is filled (%s context)',
    async context => {
      const { onEventPropertiesChange } = renderInContext(context);
      const user = userEvent.setup();

      await selectContactCreated(user);
      await user.type(screen.getByLabelText(/source/i), 'crm');

      // Option A: the persisted shape stays the {path, operator} array.
      const last = onEventPropertiesChange.mock.calls.at(-1)?.[0];
      expect(last).toEqual([{ path: 'source', operator: { type: 'Equals', value: 'crm' } }]);
    },
  );

  it('renders the VariableMapping (capture-event-data) UI in the Flow Builder context', () => {
    renderInContext('flow');
    // Gated by `onVariableMappingsChange &&` (EventConfiguration.tsx).
    expect(
      screen.getByText(/capture event data|capturar dados do evento|cattura dati|capturer les données/i),
    ).toBeTruthy();
  });

  it('omits the VariableMapping UI in the Campaign context (no mapping callback)', () => {
    renderInContext('campaign');
    // Campaign passes onVariableMappingsChange={undefined}, so the block must not render.
    expect(
      screen.queryByText(/capture event data|capturar dados do evento|cattura dati|capturer les données/i),
    ).toBeNull();
  });

  // EVO-1608: context-aware journeyId. The campaign context has no journey, so the
  // optional journeyId is omitted and the variable autocomplete must never fetch a
  // journey (no sentinel, no 404). Drive the custom-event-name VariableInput to
  // render (custom mode) so the hook is invoked, then assert the journeyId per context.
  it.each(CONTEXT_CASES)(
    'forwards the context journeyId to useJourneyVariables (%s context)',
    async context => {
      renderInContext(context);
      const user = userEvent.setup();
      await selectCustomEvent(user);

      const expected = CONTEXTS[context].journeyId; // 'journey-uuid-123' | undefined
      expect(useJourneyVariablesSpy).toHaveBeenCalledWith(expected);
      // No call may use any other id — campaign must NEVER pass a real/sentinel journey id.
      expect(useJourneyVariablesSpy.mock.calls.every(([id]) => id === expected)).toBe(true);
    },
  );

  it('never asks for a real journey in the Campaign context (no fetch)', async () => {
    renderInContext('campaign');
    const user = userEvent.setup();
    // Switch to custom mode so the custom-name VariableInput renders and the hook
    // is actually exercised — otherwise the assertion below would be vacuously true.
    await selectCustomEvent(user);

    expect(useJourneyVariablesSpy).toHaveBeenCalled();
    // Every call must be with undefined → useJourneyVariables skips getJourneyVariables.
    expect(useJourneyVariablesSpy.mock.calls.every(([id]) => id === undefined)).toBe(true);
  });

  it('renders without crashing in the Campaign context with no journeyId', () => {
    expect(() => renderInContext('campaign')).not.toThrow();
    expect(screen.getByRole('combobox')).toBeTruthy();
  });
});
