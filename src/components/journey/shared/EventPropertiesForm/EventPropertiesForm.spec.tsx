import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventPropertiesForm, type EventPropertiesValue } from './EventPropertiesForm';
import i18n from '@/i18n/config';

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: { getPipelines: vi.fn(), getPipelineStages: vi.fn() },
}));
vi.mock('@/services/channels/inboxesService', () => ({
  default: { list: vi.fn() },
}));
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { getLabels: vi.fn() },
}));
vi.mock('@/services/users/usersService', () => ({
  default: { getUsers: vi.fn() },
}));
vi.mock('@/services/campaigns/campaignsService', () => ({
  campaignsService: { getCampaigns: vi.fn() },
}));
vi.mock('@/services/messageTemplates/globalMessageTemplatesService', () => ({
  default: { getTemplates: vi.fn() },
}));

import { pipelinesService } from '@/services/pipelines/pipelinesService';
import InboxesService from '@/services/channels/inboxesService';

const mockGetPipelines = pipelinesService.getPipelines as unknown as ReturnType<typeof vi.fn>;
const mockGetStages = pipelinesService.getPipelineStages as unknown as ReturnType<typeof vi.fn>;
const mockListInboxes = InboxesService.list as unknown as ReturnType<typeof vi.fn>;

const INBOXES = {
  data: [
    { id: 'i1', name: 'WhatsApp Vendas', channel_type: 'Channel::Whatsapp' },
    { id: 'i2', name: 'Insta Suporte', channel_type: 'Channel::Instagram' },
  ],
};

const e = (key: string) => i18n.t(`events:${key}`);

afterEach(() => {
  vi.clearAllMocks();
});

function Harness({ eventName, initial = {} }: { eventName: string; initial?: EventPropertiesValue }) {
  const [value, setValue] = useState<EventPropertiesValue>(initial);
  const onChange = vi.fn((next: EventPropertiesValue) => setValue(next));
  return (
    <>
      <EventPropertiesForm eventName={eventName} value={value} onChange={onChange} />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

function persisted(): Record<string, unknown> {
  return JSON.parse(screen.getByTestId('value').textContent ?? '{}');
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  // A combobox takes no name from content: locate the picker by its label text.
  await user.click(screen.getByText(e('propertiesForm.addFieldLabel')));
  return screen.findByRole('listbox');
}

describe('EventPropertiesForm', () => {
  it('returns null for an unknown event name', () => {
    const { container } = render(
      <EventPropertiesForm eventName="not.a.real.event" value={{}} onChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // CRM-519: a catalog "required" key is what the producer always sends, not
  // what the user must type. Nothing is required; ids of the event itself are
  // not even offered.
  it('offers schema keys as optional filters and never asks for the event ids', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="campaign.triggered" />);

    expect(screen.queryByText('*')).toBeNull();
    expect(screen.queryByText('pipeline_item_id')).toBeNull();
    expect(screen.queryByText('contact_id')).toBeNull();
    expect(screen.getByText(e('propertiesForm.filtersHint'))).toBeTruthy();

    const listbox = await openPicker(user);
    for (const key of ['pipeline_id', 'pipeline_stage_id', 'is_lead', 'assigned_by_id']) {
      expect(within(listbox).getByText(key)).toBeTruthy();
    }
    // Identity of the event itself, producer bookkeeping, raw dumps and the
    // display names that duplicate an id with a select are not filters.
    for (const key of [
      'pipeline_item_id',
      'contact_id',
      'conversation_id',
      'source',
      'custom_fields',
      'pipeline_name',
      'pipeline_stage_name',
    ]) {
      expect(within(listbox).queryByText(key)).toBeNull();
    }
  });

  it('hides conversation_id and message_id for conversation and message events', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="conversation.created" />);
    expect(screen.queryByText('conversation_id')).toBeNull();

    const listbox = await openPicker(user);
    expect(within(listbox).getByText('inbox_id')).toBeTruthy();
    expect(within(listbox).queryByText('conversation_id')).toBeNull();
  });

  it('shows the human label with the raw key and a help line for a translated field', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="conversation.created" />);

    const listbox = await openPicker(user);
    expect(within(listbox).getByText(e('fields.inbox_id.label'))).toBeTruthy();
    await user.click(within(listbox).getByText('inbox_id'));

    expect(screen.getByText(e('fields.inbox_id.label'))).toBeTruthy();
    expect(screen.getByText('inbox_id')).toBeTruthy();
    expect(screen.getByText(e('fields.inbox_id.help'))).toBeTruthy();
  });

  it('adds a filter from the picker, writes the typed value and removes it again', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.created" />);

    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('content'));
    await user.type(screen.getByRole('textbox', { name: /content/ }), 'oi');
    expect(persisted().content).toBe('oi');

    await user.click(
      screen.getByRole('button', { name: `${e('propertiesForm.removeFilterAriaLabel')} content` }),
    );
    expect(persisted()).toEqual({});
    expect(screen.queryByText('content')).toBeNull();
  });

  it('renders a closed-set key as a select with translated option labels', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.created" />);

    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('message_type'));

    await user.click(screen.getByTestId('enum-message_type'));
    const options = await screen.findByRole('listbox');
    expect(within(options).getByText(e('fields.message_type.options.incoming'))).toBeTruthy();
    await user.click(within(options).getByText(e('fields.message_type.options.outgoing')));
    expect(persisted().message_type).toBe('outgoing');
  });

  it('hides timestamps and objects from the contact events and labels the contact fields', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="contact.created" />);

    const listbox = await openPicker(user);
    for (const key of ['created_at', 'updated_at', 'customAttributes', 'additionalAttributes', 'id']) {
      expect(within(listbox).queryByText(key)).toBeNull();
    }
    expect(within(listbox).getByText(e('fields.email.label'))).toBeTruthy();
    expect(within(listbox).getByText(e('fields.phone_number.label'))).toBeTruthy();
  });

  it('renders pipeline_id as a select fed by the pipelines list', async () => {
    mockGetPipelines.mockResolvedValueOnce({ data: [{ id: 'p1', name: 'Vendas' }, { id: 'p2', name: 'Suporte' }] });
    const user = userEvent.setup();
    render(<Harness eventName="campaign.triggered" />);

    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('pipeline_id'));
    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());

    await user.click(screen.getByTestId('lookup-pipeline'));
    const options = await screen.findByRole('listbox');
    await user.click(within(options).getByText('Vendas'));
    expect(persisted().pipeline_id).toBe('p1');
  });

  it('keeps the stage select disabled until a pipeline filter is chosen, then loads its stages', async () => {
    mockGetPipelines.mockResolvedValue({ data: [{ id: 'p1', name: 'Vendas' }] });
    mockGetStages.mockResolvedValue({ data: [{ id: 's1', name: 'Novo' }] });
    const user = userEvent.setup();
    render(<Harness eventName="campaign.triggered" initial={{ pipeline_stage_id: '' }} />);

    // No pipeline yet: the stage select says so and is disabled.
    const stage = screen.getByTestId('lookup-pipeline_stage');
    expect(stage).toHaveProperty('disabled', true);
    expect(within(stage).getByText(e('propertiesForm.lookupNeedsPipeline'))).toBeTruthy();
    expect(mockGetStages).not.toHaveBeenCalled();

    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('pipeline_id'));
    await waitFor(() => expect(mockGetPipelines).toHaveBeenCalled());
    await user.click(screen.getByTestId('lookup-pipeline'));
    await user.click(within(await screen.findByRole('listbox')).getByText('Vendas'));

    await waitFor(() => expect(mockGetStages).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(screen.getByTestId('lookup-pipeline_stage')).toHaveProperty('disabled', false));
  });

  // CRM-519 item 10: an inbox and its channel type are one filter, not two.
  describe('inbox_id × channel_type', () => {
    it('narrows the channel list to the chosen channel type', async () => {
      mockListInboxes.mockResolvedValue(INBOXES);
      const user = userEvent.setup();
      render(<Harness eventName="conversation.created" initial={{ channel_type: 'Channel::Instagram' }} />);

      const listbox = await openPicker(user);
      await user.click(within(listbox).getByText('inbox_id'));
      await waitFor(() => expect(mockListInboxes).toHaveBeenCalled());

      await user.click(screen.getByTestId('lookup-inbox'));
      const options = await screen.findByRole('listbox');
      expect(within(options).getByText('Insta Suporte')).toBeTruthy();
      expect(within(options).queryByText('WhatsApp Vendas')).toBeNull();
    });

    it('stops offering channel_type once an inbox is chosen', async () => {
      mockListInboxes.mockResolvedValue(INBOXES);
      const user = userEvent.setup();
      // conversation.resolved still has other keys to offer, so the picker renders.
      render(<Harness eventName="conversation.resolved" initial={{ inbox_id: 'i1' }} />);

      const listbox = await openPicker(user);
      expect(within(listbox).getByText('resolved_by_type')).toBeTruthy();
      expect(within(listbox).queryByText('channel_type')).toBeNull();
    });

    it('flags a legacy pair that contradicts itself and keeps the remove button', async () => {
      mockListInboxes.mockResolvedValue(INBOXES);
      render(
        <Harness
          eventName="conversation.created"
          initial={{ inbox_id: 'i1', channel_type: 'Channel::Instagram' }}
        />,
      );

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain(e('fields.channel_type.options.Channel__Whatsapp'));
      expect(
        screen.getByRole('button', { name: `${e('propertiesForm.removeFilterAriaLabel')} channel_type` }),
      ).toBeTruthy();
    });
  });

  // The event the card names as blocked: purchase.approved (CRM-316).
  describe('purchase.approved', () => {
    it('offers the purchase fields as filters and hides the ids of the purchase and the card', async () => {
      const user = userEvent.setup();
      render(<Harness eventName="purchase.approved" />);

      expect(screen.queryByText('*')).toBeNull();
      const listbox = await openPicker(user);
      for (const key of ['provider', 'product', 'amount', 'currency', 'outcome', 'new_contact', 'pipeline_id']) {
        expect(within(listbox).getByText(key)).toBeTruthy();
      }
      for (const key of ['purchase_id', 'pipeline_item_id', 'contact_id', 'source']) {
        expect(within(listbox).queryByText(key)).toBeNull();
      }
    });

    it('keeps product as free text (the platform string, not a CRM product) and amount numeric', async () => {
      const user = userEvent.setup();
      render(<Harness eventName="purchase.approved" />);

      let listbox = await openPicker(user);
      await user.click(within(listbox).getByText('product'));
      await user.type(screen.getByRole('textbox', { name: /product/ }), 'Curso X');
      expect(persisted().product).toBe('Curso X');

      listbox = await openPicker(user);
      await user.click(within(listbox).getByText('amount'));
      await user.type(screen.getByRole('spinbutton', { name: /amount/ }), '197.5');
      expect(persisted().amount).toBe(197.5);
    });

    it('renders outcome as a select with the two CRM outcomes', async () => {
      const user = userEvent.setup();
      render(<Harness eventName="purchase.approved" />);

      const listbox = await openPicker(user);
      await user.click(within(listbox).getByText('outcome'));
      await user.click(screen.getByTestId('enum-outcome'));
      const options = await screen.findByRole('listbox');
      expect(within(options).getByText(e('fields.outcome.options.created'))).toBeTruthy();
      await user.click(within(options).getByText(e('fields.outcome.options.already_in_pipeline')));
      expect(persisted().outcome).toBe('already_in_pipeline');
    });
  });

  it('still shows a persisted legacy id filter so it can be removed', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.delivered" initial={{ message_id: 'm-1' }} />);

    expect(screen.getByLabelText(/^message_id$/)).toHaveProperty('value', 'm-1');
    await user.click(
      screen.getByRole('button', { name: `${e('propertiesForm.removeFilterAriaLabel')} message_id` }),
    );
    expect(persisted()).toEqual({});
  });

  // AC4: custom event -> free key/value editor
  it('renders a free key/value editor when eventName=custom', () => {
    render(<Harness eventName="custom" />);
    expect(screen.getByPlaceholderText(/^key|^chave/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/^value|^valor/i)).toBeTruthy();
  });

  it('emits {key: value} pairs from the custom editor', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="custom" />);

    await user.type(screen.getByPlaceholderText(/^key|^chave/i), 'env');
    await user.type(screen.getByPlaceholderText(/^value|^valor/i), 'staging');

    expect(persisted().env).toBe('staging');
  });

  it('seeds the custom editor with existing value entries', () => {
    render(<Harness eventName="custom" initial={{ env: 'prod', user_id: '42' }} />);
    const keys = screen.getAllByPlaceholderText(/^key|^chave/i);
    expect(keys[0]).toHaveProperty('value', 'env');
    expect(keys[1]).toHaveProperty('value', 'user_id');
  });

  // F1: switching eventName drops revealed filters that don't exist in the
  // new schema, so FilterRow never receives spec=undefined.
  it('does not crash when eventName switches away from a schema with revealed filters', async () => {
    const user = userEvent.setup();
    function Switcher() {
      const [eventName, setEventName] = useState('message.delivered');
      const [value, setValue] = useState<EventPropertiesValue>({});
      return (
        <>
          <button onClick={() => setEventName('contact.created')}>switch</button>
          <EventPropertiesForm eventName={eventName} value={value} onChange={setValue} />
        </>
      );
    }
    render(<Switcher />);

    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('previous_status'));
    expect(screen.getByText('previous_status')).toBeTruthy();

    await user.click(screen.getByText('switch'));
    expect(screen.queryByText('previous_status')).toBeNull();
    expect(screen.getByText(e('propertiesForm.addFieldLabel'))).toBeTruthy();
  });
});

describe('EventPropertiesForm — section labels name a group (CRM-141)', () => {
  it('names the filters section as a group', async () => {
    const user = userEvent.setup();
    render(<Harness eventName="message.delivered" />);

    const group = screen.getByRole('group', { name: e('propertiesForm.optionalSectionLabel') });
    const listbox = await openPicker(user);
    await user.click(within(listbox).getByText('previous_status'));
    expect(within(group).getByText('previous_status')).toBeTruthy();
  });

  it('names the custom key/value editor as a group and keeps its id per instance', () => {
    render(
      <>
        <Harness eventName="custom" />
        <Harness eventName="custom" />
      </>,
    );

    const groups = screen.getAllByRole('group', { name: e('propertiesForm.customSectionLabel') });
    expect(groups).toHaveLength(2);
    const ids = groups.map((g) => g.getAttribute('aria-labelledby'));
    expect(ids[0]).not.toBe(ids[1]);
  });
});
