import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { JourneyTriggerPanel } from './JourneyTriggerPanel';
import type { JourneyTriggerNodeData } from './JourneyTriggerNode';
import '@/i18n/config';

// VariableInput/VariableMapping pull journey variables via this hook; stub it so
// the panel renders without a network call.
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

// Label/Segment config blocks fetch options on mount; stub the services so the
// label/segment trigger tests don't hit the network (was logging a 401).
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/services/segments/segmentsService', () => ({
  segmentsService: { getSegments: vi.fn().mockResolvedValue({ data: [] }) },
}));

function renderPanel(data: Partial<JourneyTriggerNodeData> = {}) {
  const onUpdate = vi.fn();
  const onClose = vi.fn();
  render(
    <JourneyTriggerPanel
      nodeId="node-1"
      data={{ label: 'Trigger', triggerType: 'event', ...data }}
      onUpdate={onUpdate}
      onClose={onClose}
      journeyId="test-journey-id"
    />,
  );
  return { onUpdate, onClose };
}

// In the event-tabs layout the header trigger-type <Select> is the first
// combobox; the Básico <EventSelector> is the second.
async function selectEvent(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  const comboboxes = screen.getAllByRole('combobox');
  await user.click(comboboxes[1]);
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByText(label));
}

describe('JourneyTriggerPanel — event trigger tabs (EVO-1276)', () => {
  it('AC1: opens in tabs mode with Básico active and the trigger-type selector in the header above the tabs', () => {
    renderPanel();

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeTruthy();

    // Básico tab active, with the event selector visible.
    const basicTab = screen.getByRole('tab', { name: /Basic|Básico|Base|Basique/ });
    expect(basicTab.getAttribute('aria-selected')).toBe('true');

    // Header trigger-type selector sits ABOVE the tablist in document order.
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    const typeSelector = comboboxes[0];
    expect(typeSelector.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('AC2: shows a count badge on Avançado when variable mappings exist and none when empty', () => {
    renderPanel({
      variableMappings: [{ id: 'm1', sourcePath: 'event.id', variableName: 'foo' }],
    });
    const badge = screen.getByLabelText(
      /advanced data configured|configuração avançada preenchida|datos avanzados configurados|données avancées configurées|dati avanzati configurati/i,
    );
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('1');
  });

  it('AC2: shows no badge on Avançado when there are no variable mappings', () => {
    renderPanel();
    expect(
      screen.queryByLabelText(
        /advanced data configured|configuração avançada preenchida|datos avanzados configurados|données avancées configurées|dati avanzati configurati/i,
      ),
    ).toBeNull();
  });

  it('M1: an empty/placeholder mapping row does not light the Avançado badge', () => {
    renderPanel({
      variableMappings: [{ id: 'm1', sourcePath: '', variableName: '' }],
    });
    expect(
      screen.queryByLabelText(
        /advanced data configured|configuração avançada preenchida|datos avanzados configurados|données avancées configurées|dati avanzati configurati/i,
      ),
    ).toBeNull();
  });

  it('AC3: preserves entered values across a Básico→Avançado→Básico switch', async () => {
    const user = userEvent.setup();
    renderPanel();

    // Enter custom mode and type a name in Básico.
    await selectEvent(user, /custom event|evento personalizado/i);
    const customInput = screen.getByPlaceholderText(
      /custom event name|nome do evento custom/i,
    ) as HTMLInputElement;
    await user.type(customInput, 'button_clicked');

    // Switch to Avançado and back.
    await user.click(screen.getByRole('tab', { name: /Advanced|Avançado|Avanzado|Avanzato|Avancé/ }));
    expect(screen.getByText(/capture event data|capturar dados do evento/i)).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: /Basic|Básico|Base|Basique/ }));

    // Value survived via the lifted eventName.
    expect(
      (screen.getByPlaceholderText(/custom event name|nome do evento custom/i) as HTMLInputElement).value,
    ).toBe('button_clicked');
  });

  it('F1: keeps "Custom event" mode across a tab round-trip even before a name is typed', async () => {
    const user = userEvent.setup();
    renderPanel();

    // Enter custom mode but type nothing — the lifted eventName stays ''.
    await selectEvent(user, /custom event|evento personalizado/i);
    expect(screen.getByPlaceholderText(/custom event name|nome do evento custom/i)).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /Advanced|Avançado|Avanzado|Avanzato|Avancé/ }));
    await user.click(screen.getByRole('tab', { name: /Basic|Básico|Base|Basique/ }));

    // Still in custom mode (forceMount kept EventBasicConfig mounted).
    expect(screen.getByPlaceholderText(/custom event name|nome do evento custom/i)).toBeTruthy();
  });

  it('AC4: a basic-only config saves with eventProperties set and no variable mappings, then closes', async () => {
    const user = userEvent.setup();
    const { onUpdate, onClose } = renderPanel();

    await selectEvent(user, /message created|mensagem criada/i);
    // CRM-519: filters are optional and live behind the "+ Add filter" picker
    // (third combobox: trigger type, event selector, picker).
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(within(await screen.findByRole('listbox')).getByText('content'));
    await user.type(screen.getByRole('textbox', { name: /content/i }), 'oi');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const saved = onUpdate.mock.calls[0][1] as JourneyTriggerNodeData;
    expect(saved.eventProperties).toEqual([
      { path: 'content', operator: { type: 'Equals', value: 'oi' } },
    ]);
    expect(saved.variableMappings ?? []).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC5 (CRM-519): Save from Avançado with an event chosen and no filters persists and closes', async () => {
    const user = userEvent.setup();
    const { onUpdate, onClose } = renderPanel();

    await selectEvent(user, /contact created|contato criado/i);
    await user.click(screen.getByRole('tab', { name: /Advanced|Avançado|Avanzado|Avanzato|Avancé/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const saved = onUpdate.mock.calls[0][1] as JourneyTriggerNodeData;
    expect(saved.eventName).toBe('contact.created');
    expect(saved.eventProperties ?? []).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC5b (CRM-519): Save stays disabled with no event chosen or a custom event without a name, with the reason under the field', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderPanel();

    const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    expect(screen.getByText(/choose an event|escolha um evento/i)).toBeTruthy();

    await selectEvent(user, /custom event|evento personalizado/i);
    expect(save().disabled).toBe(true);
    expect(screen.getByText(/type the custom event name to save|digite o nome do evento personalizado para salvar/i)).toBeTruthy();
    await user.click(save());
    expect(onUpdate).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(/custom event name|nome do evento custom/i), 'button_clicked');
    expect(save().disabled).toBe(false);
    await user.click(save());
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect((onUpdate.mock.calls[0][1] as JourneyTriggerNodeData).eventName).toBe('button_clicked');
  });

  it('AC6: selecting "Custom event" in Básico reveals the free-text custom-name input', async () => {
    const user = userEvent.setup();
    renderPanel();

    await selectEvent(user, /custom event|evento personalizado/i);
    expect(
      screen.getByPlaceholderText(/custom event name|nome do evento custom/i),
    ).toBeTruthy();
  });

  it('AC7: a non-event trigger type renders the simple (non-tabbed) modal with its own config', () => {
    renderPanel({ triggerType: 'segment' });
    // No tabs at all.
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    // The segment config block is rendered (proves the simple variant body, not just "no tabs").
    expect(screen.getByText(/segment configuration|configuração de segmento|configuración de segmento|configuration du segment|configurazione segmento/i)).toBeTruthy();
    // Trigger-type selector + Save chrome still present.
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });
});

describe('JourneyTriggerPanel — label/segment action round-trip (EVO-1754)', () => {
  // Switch the header trigger-type selector (the first combobox), which both
  // dirties the form (enabling Save) and reveals that type's config — mirroring
  // a user creating the trigger from the default event type.
  async function selectTriggerType(
    user: ReturnType<typeof userEvent.setup>,
    option: RegExp,
  ) {
    await user.click(screen.getAllByRole('combobox')[0]);
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText(option));
  }

  it('persists labelAction "applied" when a Label trigger is saved without touching the action', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderPanel();

    await selectTriggerType(user, /^Label$/);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const saved = onUpdate.mock.calls[0][1] as JourneyTriggerNodeData;
    // Regression: the dropdown shows "Applied" by default, so Save must persist
    // 'applied' — not undefined, which the canvas card rendered as "removed".
    expect(saved.labelAction).toBe('applied');
  });

  it('preserves an explicitly chosen labelAction "removed" through Save', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderPanel();

    await selectTriggerType(user, /^Label$/);
    // The label-action select is the second combobox; "Removed" is its second
    // option (after the default "Applied") — picked by index to stay locale-agnostic.
    await user.click(screen.getAllByRole('combobox')[1]);
    const actionList = await screen.findByRole('listbox');
    await user.click(within(actionList).getAllByRole('option')[1]);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const saved = onUpdate.mock.calls[0][1] as JourneyTriggerNodeData;
    expect(saved.labelAction).toBe('removed');
  });

  it('persists segmentAction "entered" when a Segment trigger is saved without touching the action', async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderPanel();

    await selectTriggerType(user, /^Segment$/);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const saved = onUpdate.mock.calls[0][1] as JourneyTriggerNodeData;
    expect(saved.segmentAction).toBe('entered');
  });
});
