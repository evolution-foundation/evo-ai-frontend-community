/**
 * AC12 — lazy mount: when ContactDetails opens with a non-events tab active,
 * the events service must not be hit. Uses real Radix Tabs (not the mocked
 * hook from ContactEventsTab.spec.tsx) so we exercise the actual lazy-mount
 * behavior of TabsContent.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@evoapi/design-system';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
vi.mock('@/services/contacts/contactEventsService', () => ({
  contactEventsService: { list: (...args: unknown[]) => listMock(...args) },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

import { ContactEventsTab } from '../ContactEventsTab';
import { useContactEventsStore } from '@/store/contactEventsStore';

function Harness({ defaultValue }: { defaultValue: 'pipeline' | 'events' }) {
  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="events">Eventos</TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline">pipeline content</TabsContent>
      <TabsContent value="events">
        <ContactEventsTab contactId="contact-lazy-1" />
      </TabsContent>
    </Tabs>
  );
}

function resetStore() {
  useContactEventsStore.setState({
    contactId: null,
    events: [],
    filters: {},
    nextCursor: undefined,
    hasMore: false,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    errorCode: null,
    degraded: false,
    softCapped: false,
    hasFetched: false,
    requestId: 0,
    abortController: null,
  });
}

describe('ContactEventsTab lazy mount (AC12)', () => {
  beforeEach(() => {
    listMock.mockReset();
    listMock.mockResolvedValue({ events: [] });
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call contactEventsService.list when the events tab is inactive', () => {
    render(<Harness defaultValue="pipeline" />);
    expect(listMock).not.toHaveBeenCalled();
  });

  it('calls the service exactly once after the user clicks the events tab', async () => {
    const user = userEvent.setup();
    render(<Harness defaultValue="pipeline" />);
    expect(listMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /eventos/i }));
    // Service is invoked synchronously from the hook's useEffect on mount.
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock.mock.calls[0][0]).toBe('contact-lazy-1');
  });
});
