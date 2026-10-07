import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Inbox } from '@/types/channels/inbox';
import InboxesService from '@/services/channels/inboxesService';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import type { ScheduledAction } from '@/types/automation';
import { ScheduleActionModal } from './ScheduleActionModal';

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

  describe('create_task payload', () => {
    const futureDateTime = () => {
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const submit = (container: HTMLElement) => {
      fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    };

    it('sends the card the modal was opened from', async () => {
      mockedInboxesService.list.mockResolvedValue({ success: true, data: [], meta: {} as never, message: '' });

      const { container } = render(
        <ScheduleActionModal open onClose={vi.fn()} contactId="contact-1" pipelineItemId="item-1" />
      );

      const actionTypeSelect = screen
        .getAllByLabelText('mock-select')
        .find(select => select.querySelector('option[value="create_task"]')) as HTMLSelectElement;
      fireEvent.change(actionTypeSelect, { target: { value: 'create_task' } });
      fireEvent.change(container.querySelector('#scheduled_for') as HTMLInputElement, {
        target: { value: futureDateTime() },
      });
      fireEvent.change(container.querySelector('#task_title') as HTMLInputElement, {
        target: { value: 'Call back' },
      });
      submit(container);

      await waitFor(() => {
        expect(mockedScheduledActionsService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            contact_id: 'contact-1',
            payload: expect.objectContaining({ task_title: 'Call back', pipeline_item_id: 'item-1' }),
          })
        );
      });
    });

    it('keeps the card of an action being edited', async () => {
      mockedInboxesService.list.mockResolvedValue({ success: true, data: [], meta: {} as never, message: '' });
      const action = {
        id: 'action-1',
        contact_id: 'contact-1',
        action_type: 'create_task',
        status: 'scheduled',
        scheduled_for: `${futureDateTime()}:00.000Z`,
        payload: { task_title: 'Call back', pipeline_item_id: 'item-9' },
        created_by: 'user-1',
        retry_count: 0,
        max_retries: 3,
        created_at: '',
        updated_at: '',
      } as ScheduledAction;

      const { container } = render(<ScheduleActionModal open onClose={vi.fn()} action={action} />);

      await waitFor(() => {
        expect((container.querySelector('#task_title') as HTMLInputElement).value).toBe('Call back');
      });
      submit(container);

      await waitFor(() => {
        expect(mockedScheduledActionsService.update).toHaveBeenCalledWith(
          'action-1',
          expect.objectContaining({
            payload: expect.objectContaining({ pipeline_item_id: 'item-9' }),
          })
        );
      });
    });
  });
});
