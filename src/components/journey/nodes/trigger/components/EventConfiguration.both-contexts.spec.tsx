import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventConfiguration } from './EventConfiguration';
import '@/i18n/config';

// Cross-context regression guard.
//
// Both consumers render THIS SAME `EventConfiguration` from the same barrel
// (`@/components/journey/nodes/trigger/components`):
//   - Flow Builder  → JourneyTriggerPanel.tsx (real journeyId + variable-mapping callback)
//   - Campaigns     → CampaignTriggerConfig.tsx (sentinel journeyId='campaign-trigger', no callback)
// The only intended difference is the props each context passes. This spec mounts
// the component with each context's EXACT prop shape and locks in equivalent
// behavior — the executable proof of the "same component reused" conclusion and
// of AC #3 ("the only difference is the props").
//
// Network seam: `VariableInput`/`VariableMapping` call `useJourneyVariables(journeyId)`,
// which hits `journeyService.getJourneyVariables`. Mock it so the campaign sentinel
// journeyId does not fire a (404-ing) request during the test.
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({
    variables: [],
    loading: false,
    error: null,
    fetchVariables: vi.fn(),
    updateVariables: vi.fn(),
    addVariable: vi.fn(),
    updateVariable: vi.fn(),
    deleteVariable: vi.fn(),
  }),
}));

type Context = 'flow' | 'campaign';

interface EventProperty {
  path: string;
  operator: { type: string; value?: unknown };
}

// The exact prop shapes the two consumers pass (see JourneyTriggerPanel.tsx:181-193
// and CampaignTriggerConfig.tsx:193-206). The only differences are journeyId and
// whether onVariableMappingsChange is provided.
const CONTEXTS: Record<Context, { journeyId: string; hasMappingCallback: boolean }> = {
  flow: { journeyId: 'journey-uuid-123', hasMappingCallback: true },
  campaign: { journeyId: 'campaign-trigger', hasMappingCallback: false },
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

const CONTEXT_CASES: Context[] = ['flow', 'campaign'];

describe('EventConfiguration — shared across Flow Builder + Campaign contexts', () => {
  it.each(CONTEXT_CASES)(
    'renders the shared EventSelector + properties editor (%s context)',
    context => {
      renderInContext(context);
      // EventSelector (EVO-1271 / 10.6) — the combobox is the primary entry point.
      expect(screen.getByRole('combobox')).toBeTruthy();
      // Event-properties editor — the "Add property" affordance.
      expect(screen.getByRole('button', { name: /add|adicionar/i })).toBeTruthy();
    },
  );

  it.each(CONTEXT_CASES)(
    'persists a canonical event name identically (%s context)',
    async context => {
      const { onEventNameChange } = renderInContext(context);
      const user = userEvent.setup();

      await user.click(screen.getByRole('combobox'));
      const listbox = await screen.findByRole('listbox');
      await user.click(within(listbox).getByText(/contact created|contato criado/i));

      // Same canonical value resolved regardless of context.
      expect(onEventNameChange).toHaveBeenCalledWith('contact.created');
    },
  );

  it.each(CONTEXT_CASES)(
    'adds an event property identically (%s context)',
    async context => {
      const { onEventPropertiesChange } = renderInContext(context);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /add|adicionar/i }));

      expect(onEventPropertiesChange).toHaveBeenCalledTimes(1);
      expect(onEventPropertiesChange.mock.calls[0][0]).toHaveLength(1);
    },
  );

  it('renders the VariableMapping (capture-event-data) UI in the Flow Builder context', () => {
    renderInContext('flow');
    // Gated by `onVariableMappingsChange &&` (EventConfiguration.tsx:265-280).
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

  it('renders without crashing in the Campaign context despite the sentinel journeyId', () => {
    // journeyId='campaign-trigger' is a non-journey sentinel; the mocked hook keeps it
    // inert here, proving the component degrades cleanly rather than throwing.
    expect(() => renderInContext('campaign')).not.toThrow();
    expect(screen.getByRole('combobox')).toBeTruthy();
  });
});
