import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { Inbox } from '@/types/channels/inbox';
import InboxesService from '@/services/channels/inboxesService';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import type { ScheduledAction } from '@/types/automation';
import { ScheduleActionModal } from './ScheduleActionModal';

const originalTZ = process.env.TZ;
process.env.TZ = 'America/Sao_Paulo';

afterAll(() => {
  process.env.TZ = originalTZ;
});

vi.mock('lucide-react', () => ({
  Search: () => null,
  Loader2: () => null,
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/services/channels/inboxesService', () => ({
  default: {
    list: vi.fn(),
  },
}));

vi.mock('@/services/contacts', () => ({
  contactsService: {
    getContact: vi.fn().mockResolvedValue(null),
    searchContacts: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('@/services/scheduledActions/scheduledActionsService', () => ({
  scheduledActionsService: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@evoapi/design-system', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  const extractOptionNodes = (children: React.ReactNode): React.ReactNode[] => {
    return React.Children.toArray(children).flatMap(child => {
      if (!React.isValidElement(child)) {
        return [];
      }

      if (child.type === SelectItem) {
        return [child];
      }

      return extractOptionNodes(child.props.children);
    });
  };

  const Select = ({
    value,
    onValueChange,
    children,
    disabled,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <select
      aria-label="mock-select"
      value={value || ''}
      onChange={event => onValueChange?.(event.target.value)}
      disabled={disabled}
    >
      <option value="">placeholder</option>
      {extractOptionNodes(children)}
    </select>
  );

  const SelectItem = ({
    value,
    children,
  }: {
    value: string;
    children?: React.ReactNode;
  }) => <option value={value}>{children}</option>;

  return {
    Dialog: passthrough,
    DialogContent: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
    DialogFooter: passthrough,
    Button: ({ children }: { children?: React.ReactNode }) => <button type="button">{children}</button>,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Label: ({
      htmlFor,
      children,
    }: {
      htmlFor?: string;
      children?: React.ReactNode;
    }) => <label htmlFor={htmlFor}>{children}</label>,
    Select,
    SelectContent: passthrough,
    SelectItem,
    SelectTrigger: passthrough,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  };
});

const mockedInboxesService = vi.mocked(InboxesService);
const mockedScheduledActionsService = vi.mocked(scheduledActionsService);

const buildInbox = (overrides: Partial<Inbox>): Inbox => ({
  id: overrides.id || 'inbox-id',
  name: overrides.name || 'Inbox',
  account_id: 'acc-1',
  channel_id: 'channel-1',
  channel_type: overrides.channel_type || 'Channel::Telegram',
  ...overrides,
});

describe('ScheduleActionModal', () => {
  it('shows unique channel options for mixed inbox types', async () => {
    mockedInboxesService.list.mockResolvedValue({
      success: true,
      data: [
        buildInbox({ id: 'wa-cloud', name: 'WhatsApp Cloud', channel_type: 'Channel::WhatsappCloud' }),
        buildInbox({ id: 'wa-legacy', name: 'WhatsApp Legacy', channel_type: 'Channel::Whatsapp' }),
        buildInbox({ id: 'sms-twilio', name: 'Twilio SMS', channel_type: 'Channel::TwilioSms' }),
        buildInbox({ id: 'sms-legacy', name: 'SMS', channel_type: 'Channel::Sms' }),
        buildInbox({ id: 'email-team', name: 'Email Team', channel_type: 'Channel::Email' }),
        buildInbox({ id: 'telegram-team', name: 'Telegram Team', channel_type: 'Channel::Telegram' }),
        buildInbox({ id: 'api-team', name: 'API Team', channel_type: 'Channel::Api' }),
      ],
      meta: {} as never,
      message: '',
    });

    render(
      <ScheduleActionModal
        open
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockedInboxesService.list).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'WhatsApp Cloud (scheduledActions.channelWhatsapp)' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Twilio SMS (scheduledActions.channelSms)' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Email Team (scheduledActions.channelEmail)' })).toBeTruthy();
      expect(screen.getByRole('option', { name: 'Telegram Team (scheduledActions.channelTelegram)' })).toBeTruthy();
    });

    expect(screen.queryByRole('option', { name: 'WhatsApp Legacy (scheduledActions.channelWhatsapp)' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'SMS (scheduledActions.channelSms)' })).toBeNull();
    expect(screen.queryByRole('option', { name: /API Team/ })).toBeNull();
  });

  describe('editing', () => {
    const scheduledFor = '2099-03-10T11:40:00.000Z';

    const buildAction = (): ScheduledAction => ({
      id: 'action-1',
      contact_id: 'contact-1',
      action_type: 'send_message',
      status: 'scheduled',
      scheduled_for: scheduledFor,
      payload: { channel: 'telegram', message: 'Oi' },
      created_by: 'user-1',
      retry_count: 0,
      max_retries: 3,
      recurrence_type: 'once',
    });

    const renderEditing = async () => {
      mockedInboxesService.list.mockResolvedValue({
        success: true,
        data: [buildInbox({ id: 'telegram-team', name: 'Telegram Team', channel_type: 'Channel::Telegram' })],
        meta: {} as never,
        message: '',
      });
      mockedScheduledActionsService.update.mockResolvedValue({} as never);

      const view = render(<ScheduleActionModal open onClose={vi.fn()} action={buildAction()} />);
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Telegram Team (scheduledActions.channelTelegram)' })).toBeTruthy();
      });
      return view;
    };

    it('runs in a timezone other than UTC', () => {
      expect(new Date(scheduledFor).getTimezoneOffset()).toBe(180);
    });

    it('fills the field with the local time of scheduled_for', async () => {
      await renderEditing();
      expect(screen.getByLabelText('scheduledActions.dateTime')).toHaveValue('2099-03-10T08:40');
    });

    it('keeps scheduled_for identical when saved without touching the time', async () => {
      const { container } = await renderEditing();
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(mockedScheduledActionsService.update).toHaveBeenCalledWith(
          'action-1',
          expect.objectContaining({ scheduled_for: scheduledFor }),
        );
      });
    });

    it('saves the time typed by the user', async () => {
      const { container } = await renderEditing();
      fireEvent.change(screen.getByLabelText('scheduledActions.dateTime'), {
        target: { value: '2099-03-10T09:15' },
      });
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(mockedScheduledActionsService.update).toHaveBeenCalledWith(
          'action-1',
          expect.objectContaining({ scheduled_for: '2099-03-10T12:15:00.000Z' }),
        );
      });
    });
  });
});
