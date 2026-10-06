import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { ContactEventsFilters } from '../ContactEventsFilters';

// Permission-gated components resolve permissions from the context; grant
// everything so these specs keep exercising the full behavior under test.
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
  }),
}));

const originalTZ = process.env.TZ;
process.env.TZ = 'America/Sao_Paulo';

afterAll(() => {
  process.env.TZ = originalTZ;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ContactEventsFilters', () => {
  it('exposes the event type options plus an "all types" entry', async () => {
    const user = userEvent.setup();
    render(<ContactEventsFilters value={{}} onChange={vi.fn()} />);

    const eventTypeLabel = screen.getByText('events.filters.eventType');
    const trigger = eventTypeLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    // 5 event types + 1 "all"
    expect(within(listbox).getAllByRole('option').length).toBe(6);
    expect(within(listbox).getByText('events.types.track')).toBeInTheDocument();
  });

  it('selecting an event type emits event_type', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{}} onChange={onChange} />);

    const eventTypeLabel = screen.getByText('events.filters.eventType');
    const trigger = eventTypeLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('events.types.track'));

    expect(onChange).toHaveBeenCalledWith({ event_type: 'track' });
  });

  it('selecting a period preset (e.g. "7 dias") emits occurred_after', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T01:00:00.000Z'));

    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{}} onChange={onChange} />);

    const periodLabel = screen.getByText('events.filters.period');
    const trigger = periodLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('events.filters.periodPresets.7d'));

    expect(onChange).toHaveBeenCalledWith({ occurred_after: '2026-09-29T03:00:00.000Z' });
  });

  it('"Hoje" starts at local midnight even after 21h in Brasília', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T01:00:00.000Z'));
    expect(new Date().getTimezoneOffset()).toBe(180);

    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{}} onChange={onChange} />);

    const periodLabel = screen.getByText('events.filters.period');
    const trigger = periodLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('events.filters.periodPresets.today'));

    expect(onChange).toHaveBeenCalledWith({ occurred_after: '2026-10-06T03:00:00.000Z' });
  });

  it('selecting "Todo o período" clears occurred_after', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{ occurred_after: '2026-01-01' }} onChange={onChange} />);

    const periodLabel = screen.getByText('events.filters.period');
    const trigger = periodLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('events.filters.periodPresets.all'));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('only shows "Clear filters" when at least one filter is active', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ContactEventsFilters value={{}} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /events\.filters\.clear/i })).not.toBeInTheDocument();

    rerender(<ContactEventsFilters value={{ event_type: 'track' }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /events\.filters\.clear/i })).toBeInTheDocument();
  });

  it('clicking "Clear filters" resets to an empty object', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{ event_type: 'track', occurred_after: '2026-01-01' }} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /events\.filters\.clear/i }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('disabled propagates to both selects', () => {
    render(<ContactEventsFilters value={{}} onChange={vi.fn()} disabled />);
    const eventTypeLabel = screen.getByText('events.filters.eventType');
    const eventTypeTrigger = eventTypeLabel.parentElement!.querySelector('[role="combobox"]');
    expect(eventTypeTrigger).toBeDisabled();

    const periodLabel = screen.getByText('events.filters.period');
    const periodTrigger = periodLabel.parentElement!.querySelector('[role="combobox"]');
    expect(periodTrigger).toBeDisabled();
  });
});
