import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventAdvancedConfig } from './EventAdvancedConfig';
import type { DataMapping } from '@/components/journey/environment-manager';
import type { EventProperty } from '@/lib/events-manifest';
import '@/i18n/config';

// useJourneyVariables hits the journey-variables endpoint via VariableSelect;
// stub it so the advanced block renders without a network call.
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

function Harness({
  initialEventProperties = [],
  onVariableMappingsChange,
}: {
  initialEventProperties?: EventProperty[];
  onVariableMappingsChange?: (m: DataMapping[]) => void;
}) {
  const [mappings, setMappings] = useState<DataMapping[]>([]);
  return (
    <EventAdvancedConfig
      eventProperties={initialEventProperties}
      variableMappings={mappings}
      onVariableMappingsChange={next => {
        setMappings(next);
        onVariableMappingsChange?.(next);
      }}
      journeyId="test-journey-id"
    />
  );
}

describe('EventAdvancedConfig (EVO-1276)', () => {
  it('renders the Capture Event Data block', () => {
    render(<Harness />);
    expect(
      screen.getByText(/capture event data|capturar dados do evento/i),
    ).toBeTruthy();
  });

  it('round-trips a new mapping through onVariableMappingsChange', async () => {
    const onVariableMappingsChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onVariableMappingsChange={onVariableMappingsChange} />);

    // Header + empty-state both expose an add button; either drives the round-trip.
    await user.click(screen.getAllByRole('button', { name: /new|novo|nova|nouveau|nuovo/i })[0]);

    const last = onVariableMappingsChange.mock.calls.at(-1)?.[0] as DataMapping[];
    expect(last).toHaveLength(1);
    expect(last[0]).toMatchObject({ sourcePath: '', variableName: '' });
  });
});
