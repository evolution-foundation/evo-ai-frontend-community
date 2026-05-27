import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContactEventsFilters } from '../ContactEventsFilters';
import { CONTACT_EVENT_CHANNEL_OPTIONS } from '@/constants/contactEventsChannels';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    currentLanguage: 'en',
  }),
}));

describe('ContactEventsFilters', () => {
  it('exposes 11 unique channel options plus an "all channels" entry', async () => {
    const user = userEvent.setup();
    render(<ContactEventsFilters value={{}} onChange={vi.fn()} />);

    // Open the channel select via its associated label
    const channelLabel = screen.getByText('events.filters.channel');
    const trigger = channelLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    // 11 deduped backend channels + 1 "all"
    expect(options.length).toBe(CONTACT_EVENT_CHANNEL_OPTIONS.length + 1);
    // The mock t() returns the i18n key — so we assert the keys are rendered,
    // proving the dropdown goes through the translation layer (Sourcery #2).
    expect(within(listbox).getByText('events.channels.facebook')).toBeInTheDocument();
    expect(within(listbox).getByText('events.channels.twitter')).toBeInTheDocument();
  });

  it('selecting "Facebook" emits channel=facebook (first key of the group)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ContactEventsFilters value={{}} onChange={onChange} />);

    const channelLabel = screen.getByText('events.filters.channel');
    const trigger = channelLabel.parentElement!.querySelector('[role="combobox"]') as HTMLElement;
    await user.click(trigger);

    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('events.channels.facebook'));

    expect(onChange).toHaveBeenCalledWith({ channel: 'facebook' });
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
    render(<ContactEventsFilters value={{ event_type: 'track', channel: 'whatsapp' }} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /events\.filters\.clear/i }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('disabled propagates to inputs', () => {
    render(<ContactEventsFilters value={{}} onChange={vi.fn()} disabled />);
    const campaignInput = screen.getByLabelText('events.filters.campaign');
    expect(campaignInput).toBeDisabled();
    const occurredAfter = screen.getByLabelText('events.filters.occurredAfter');
    expect(occurredAfter).toBeDisabled();
  });
});
