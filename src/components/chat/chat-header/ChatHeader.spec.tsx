import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatHeader from './ChatHeader';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import chatService from '@/services/chat/chatService';
import { conversationAPI } from '@/services/conversations/conversationService';
import { toast } from 'sonner';
import type { Inbox } from '@/types/channels/inbox';

let mockInboxes: Inbox[] = [];
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: (selector: (s: { inboxes: Inbox[] }) => unknown) =>
    selector({ get inboxes() { return mockInboxes; } }),
}));

vi.mock('@/services/conversations/conversationService', () => ({
  conversationAPI: {
    moveChannel: vi.fn(),
  },
}));

vi.mock('@/services/pipelines/pipelinesService', () => ({
  pipelinesService: {
    getPipelines: vi.fn(),
    getPipelinesByConversation: vi.fn(),
    addItemToPipeline: vi.fn(),
    moveItem: vi.fn(),
    removeItemFromPipeline: vi.fn(),
  },
}));

vi.mock('@/services/chat/chatService', () => ({
  default: {
    getConversation: vi.fn(),
  },
}));

const mockUpdateConversation = vi.fn();
vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({
    conversations: { updateConversation: mockUpdateConversation },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/utils/chat/conversationStatus', () => ({
  getStatusLabel: (s: string) => s,
  isPendingStatus: () => false,
}));

vi.mock('@/utils/channelUtils', () => ({
  isPhoneBearingChannel: () => false,
}));

vi.mock('@/utils/contact/formatContactPhone', () => ({
  formatContactPhone: (p: string) => p,
}));

vi.mock('@/components/chat/contact/ContactAvatar', () => ({
  default: () => <div data-testid="contact-avatar" />,
}));

const makePipeline = (
  id: string,
  stages: { id: string; name: string }[],
  items: { id: string; item_id: string; stage_id: string }[] = [],
) => ({
  id,
  name: `Pipeline ${id}`,
  pipeline_type: 'custom' as const,
  visibility: 'public' as const,
  is_active: true,
  stages: stages.map(s => ({ ...s, color: '#000', position: 0, created_at: '', updated_at: '' })),
  items,
  created_at: '',
  updated_at: '',
});

const makeConversation = (id = '42') =>
  ({
    id,
    status: 'open' as const,
    inbox: { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' },
    contact: { id: '1', name: 'Test Contact' },
    custom_attributes: {},
  }) as never;

const defaultProps = {
  conversation: makeConversation(),
  onBackClick: vi.fn(),
  onCloseConversation: vi.fn(),
  onContactSidebarOpen: vi.fn(),
  onMarkAsRead: vi.fn(),
  onMarkAsUnread: vi.fn(),
  onMarkAsOpen: vi.fn(),
  onMarkAsResolved: vi.fn(),
  onPostpone: vi.fn(),
  onMarkAsSnoozed: vi.fn(),
  onSetPriority: vi.fn(),
  onPinConversation: vi.fn(),
  onUnpinConversation: vi.fn(),
  onArchiveConversation: vi.fn(),
  onUnarchiveConversation: vi.fn(),
  onAssignAgent: vi.fn(),
  onAssignTeam: vi.fn(),
  onAssignTag: vi.fn(),
  onDeleteConversation: vi.fn(),
  unreadCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(chatService.getConversation).mockResolvedValue({ data: makeConversation() } as never);
});

const openPipelineAndSelectStage = async (
  user: ReturnType<typeof userEvent.setup>,
  pipelineName: string,
  stageName: string,
) => {
  // Open main dropdown
  const menuTrigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
  await user.click(menuTrigger);

  // Find and focus the pipeline.addTo sub-trigger, then open it with ArrowRight
  const addToTrigger = await screen.findByText('pipeline.addTo');
  const addToSubTrigger = (addToTrigger.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? addToTrigger) as HTMLElement;
  addToSubTrigger.focus();
  await user.keyboard('{ArrowRight}');

  // Find and focus the specific pipeline sub-trigger, then open with ArrowRight
  await waitFor(() => screen.getByText(pipelineName), { timeout: 2000 });
  const pipelineEl = screen.getByText(pipelineName);
  const pipelineSubTrigger = (pipelineEl.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? pipelineEl) as HTMLElement;
  pipelineSubTrigger.focus();
  await user.keyboard('{ArrowRight}');

  // Find and click the stage
  await waitFor(() => screen.getByText(stageName), { timeout: 2000 });
  await user.click(screen.getByText(stageName));
};

describe('ChatHeader pipeline', () => {
  const makeItem = (id: string, pipelineId: string) => ({
    id,
    item_id: '42',
    stage_id: `stage-${pipelineId}`,
    pipeline_id: pipelineId,
    type: 'conversation',
    is_lead: false,
    created_at: '',
    updated_at: '',
  });

  it('loads pipelines on mount and calls getPipelinesByConversation when menu opens', async () => {
    const pipeline = makePipeline('p1', [{ id: 'stage-1', name: 'Lead' }]);
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);

    render(<ChatHeader {...defaultProps} />);

    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalledWith({ is_active: true }));

    const user = userEvent.setup();
    const menuTrigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    await user.click(menuTrigger);

    await waitFor(() =>
      expect(pipelinesService.getPipelinesByConversation).toHaveBeenCalledWith('42'),
    );
  });

  it('adds conversation to pipeline using conversation.id not item.id (H1)', async () => {
    const pipeline = makePipeline('p1', [{ id: 'stage-1', name: 'Lead' }]);
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);
    vi.mocked(pipelinesService.addItemToPipeline).mockResolvedValue({} as never);

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p1', 'Lead');

    await waitFor(() => {
      expect(pipelinesService.addItemToPipeline).toHaveBeenCalledWith('p1', {
        item_id: '42',
        type: 'conversation',
        pipeline_stage_id: 'stage-1',
      });
    });
  });

  it('calls moveItem with item.id when moving within same pipeline (M1)', async () => {
    const existingItem = {
      id: 'item-99',
      item_id: '42',
      stage_id: 'stage-1',
      pipeline_id: 'p1',
      type: 'conversation',
      is_lead: false,
      created_at: '',
      updated_at: '',
    };
    const pipeline = makePipeline(
      'p1',
      [
        { id: 'stage-1', name: 'Lead' },
        { id: 'stage-2', name: 'Qualified' },
      ],
      [existingItem],
    );

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pipeline]);
    vi.mocked(pipelinesService.moveItem).mockResolvedValue({ success: true, message: '' });

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p1', 'Qualified');

    await waitFor(() => {
      expect(pipelinesService.moveItem).toHaveBeenCalledWith({
        pipeline_id: 'p1',
        item_id: 'item-99',
        from_stage_id: 'stage-1',
        to_stage_id: 'stage-2',
      });
      expect(pipelinesService.addItemToPipeline).not.toHaveBeenCalled();
    });
  });

  it('removes from old pipeline before adding to new pipeline (C1)', async () => {
    const existingItem = {
      id: 'item-old',
      item_id: '42',
      stage_id: 'stage-A',
      pipeline_id: 'p-old',
      type: 'conversation',
      is_lead: false,
      created_at: '',
      updated_at: '',
    };
    const oldPipeline = makePipeline('p-old', [{ id: 'stage-A', name: 'StageOld' }], [existingItem]);
    const newPipeline = makePipeline('p-new', [{ id: 'stage-B', name: 'StageNew' }]);

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [oldPipeline, newPipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([oldPipeline]);
    vi.mocked(pipelinesService.removeItemFromPipeline).mockResolvedValue({ success: true, message: '' });
    vi.mocked(pipelinesService.addItemToPipeline).mockResolvedValue({} as never);

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p-new', 'StageNew');

    await waitFor(() => {
      expect(pipelinesService.removeItemFromPipeline).toHaveBeenCalledWith('p-old', 'item-old');
      expect(pipelinesService.addItemToPipeline).toHaveBeenCalledWith('p-new', {
        item_id: '42',
        type: 'conversation',
        pipeline_stage_id: 'stage-B',
      });
    });
  });

  it('dispatches updateConversation after pipeline action to refresh badge (C1)', async () => {
    const pipeline = makePipeline('p1', [{ id: 'stage-1', name: 'Lead' }]);
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);
    vi.mocked(pipelinesService.addItemToPipeline).mockResolvedValue({} as never);
    const updatedConv = makeConversation('42');
    vi.mocked(chatService.getConversation).mockResolvedValue({ data: updatedConv } as never);

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p1', 'Lead');

    await waitFor(() => {
      expect(mockUpdateConversation).toHaveBeenCalledWith(updatedConv);
    });
  });

  it('dispatches moveItem when conversation is already in same pipeline with items inside stages (real API structure)', async () => {
    const existingItem = {
      id: 'item-99',
      item_id: '42',
      stage_id: 'stage-1',
      pipeline_id: 'p1',
      type: 'conversation',
      is_lead: false,
      created_at: '',
      updated_at: '',
    };
    const pipelineWithItemsInStages = {
      id: 'p1',
      name: 'Pipeline p1',
      pipeline_type: 'custom' as const,
      visibility: 'public' as const,
      is_active: true,
      stages: [
        { id: 'stage-1', name: 'Lead', color: '#000', position: 0, created_at: '', updated_at: '', items: [existingItem] },
        { id: 'stage-2', name: 'Qualified', color: '#000', position: 1, created_at: '', updated_at: '', items: [] },
      ],
      created_at: '',
      updated_at: '',
    };

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipelineWithItemsInStages] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pipelineWithItemsInStages]);
    vi.mocked(pipelinesService.moveItem).mockResolvedValue({ success: true, message: '' });

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p1', 'Qualified');

    await waitFor(() => {
      expect(pipelinesService.moveItem).toHaveBeenCalledWith({
        pipeline_id: 'p1',
        item_id: 'item-99',
        from_stage_id: 'stage-1',
        to_stage_id: 'stage-2',
      });
      expect(pipelinesService.addItemToPipeline).not.toHaveBeenCalled();
    });
  });

  it('removes from pipeline when item lives inside stage.items (real API structure)', async () => {
    const existingItem = {
      id: 'item-77',
      item_id: '42',
      stage_id: 'stage-1',
      pipeline_id: 'p1',
      type: 'conversation',
      is_lead: false,
      created_at: '',
      updated_at: '',
    };
    const pipelineWithItemsInStages = {
      id: 'p1',
      name: 'Pipeline p1',
      pipeline_type: 'custom' as const,
      visibility: 'public' as const,
      is_active: true,
      stages: [
        { id: 'stage-1', name: 'Lead', color: '#000', position: 0, created_at: '', updated_at: '', items: [existingItem] },
      ],
      created_at: '',
      updated_at: '',
    };

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipelineWithItemsInStages] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pipelineWithItemsInStages]);
    vi.mocked(pipelinesService.removeItemFromPipeline).mockResolvedValue({ success: true, message: '' });
    const updatedConv = makeConversation('42');
    vi.mocked(chatService.getConversation).mockResolvedValue({ data: updatedConv } as never);

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    const menuTrigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    await user.click(menuTrigger);

    const addToTrigger = await screen.findByText('pipeline.addTo');
    const addToSubTrigger = (
      addToTrigger.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? addToTrigger
    ) as HTMLElement;
    addToSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => screen.getByText('Pipeline p1'), { timeout: 2000 });
    const pipelineEl = screen.getByText('Pipeline p1');
    const pipelineSubTrigger = (
      pipelineEl.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? pipelineEl
    ) as HTMLElement;
    pipelineSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => screen.getByText('pipeline.removeFrom'), { timeout: 2000 });
    await user.click(screen.getByText('pipeline.removeFrom'));

    await waitFor(() => {
      expect(pipelinesService.removeItemFromPipeline).toHaveBeenCalledWith('p1', 'item-77');
      expect(mockUpdateConversation).toHaveBeenCalledWith(updatedConv);
    });
  });

  it('removes ALL pipelines when conversation is in 2+ pipelines before adding to new one (H1)', async () => {
    const pOld1 = makePipeline('p-old1', [{ id: 'stage-p-old1', name: 'StageA' }], [makeItem('item-1', 'p-old1')]);
    const pOld2 = makePipeline('p-old2', [{ id: 'stage-p-old2', name: 'StageB' }], [makeItem('item-2', 'p-old2')]);
    const pNew  = makePipeline('p-new',  [{ id: 'stage-new',    name: 'StageC' }]);

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pOld1, pOld2, pNew] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pOld1, pOld2]);
    vi.mocked(pipelinesService.removeItemFromPipeline).mockResolvedValue({ success: true, message: '' });
    vi.mocked(pipelinesService.addItemToPipeline).mockResolvedValue({} as never);

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p-new', 'StageC');

    await waitFor(() => {
      expect(pipelinesService.removeItemFromPipeline).toHaveBeenCalledWith('p-old1', 'item-1');
      expect(pipelinesService.removeItemFromPipeline).toHaveBeenCalledWith('p-old2', 'item-2');
      expect(pipelinesService.removeItemFromPipeline).toHaveBeenCalledTimes(2);
      expect(pipelinesService.addItemToPipeline).toHaveBeenCalledWith('p-new', {
        item_id: '42',
        type: 'conversation',
        pipeline_stage_id: 'stage-new',
      });
    });
  });

  it('shows loading label in stage submenu while getPipelinesByConversation is pending (isLoadingConvPipelines guard)', async () => {
    const pipeline = makePipeline('p1', [{ id: 'stage-1', name: 'Lead' }]);
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockReturnValue(new Promise(() => {}));

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    const menuTrigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    await user.click(menuTrigger);

    const addToTrigger = await screen.findByText('pipeline.addTo');
    const addToSubTrigger = (addToTrigger.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? addToTrigger) as HTMLElement;
    addToSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => screen.getByText('Pipeline p1'), { timeout: 2000 });
    const pipelineEl = screen.getByText('Pipeline p1');
    const pipelineSubTrigger = (pipelineEl.closest('[data-slot="dropdown-menu-sub-trigger"]') ?? pipelineEl) as HTMLElement;
    pipelineSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(screen.getByText('pipeline.loading')).toBeInTheDocument();
      expect(screen.queryByText('Lead')).not.toBeInTheDocument();
    });
  });

  it('reloads conv pipeline data when a cross-pipeline remove fails partially', async () => {
    const pOld1 = makePipeline('p-old1', [{ id: 'stage-p-old1', name: 'StageA' }], [makeItem('item-1', 'p-old1')]);
    const pOld2 = makePipeline('p-old2', [{ id: 'stage-p-old2', name: 'StageB' }], [makeItem('item-2', 'p-old2')]);
    const pNew  = makePipeline('p-new',  [{ id: 'stage-new',    name: 'StageC' }]);

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pOld1, pOld2, pNew] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pOld1, pOld2]);
    vi.mocked(pipelinesService.removeItemFromPipeline)
      .mockResolvedValueOnce({ success: true, message: '' })
      .mockRejectedValueOnce(new Error('network'));

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p-new', 'StageC');

    await waitFor(() => {
      expect(pipelinesService.addItemToPipeline).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('pipeline.removeError');
      expect(pipelinesService.getPipelinesByConversation.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows pipeline.moveError toast when move fails (M2 - distinct from addError)', async () => {
    const existingItem = {
      id: 'item-99',
      item_id: '42',
      stage_id: 'stage-1',
      pipeline_id: 'p1',
      type: 'conversation',
      is_lead: false,
      created_at: '',
      updated_at: '',
    };
    const pipeline = makePipeline(
      'p1',
      [
        { id: 'stage-1', name: 'Lead' },
        { id: 'stage-2', name: 'Qualified' },
      ],
      [existingItem],
    );

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pipeline]);
    vi.mocked(pipelinesService.moveItem).mockRejectedValue(new Error('Server error'));

    render(<ChatHeader {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openPipelineAndSelectStage(user, 'Pipeline p1', 'Qualified');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('pipeline.moveError');
      expect(toast.error).not.toHaveBeenCalledWith('pipeline.addError');
    });
  });
});

describe('ChatHeader contact panel', () => {
  beforeEach(() => {
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);
  });

  it('keeps avatar click opening the contact sidebar (existing behavior preserved)', async () => {
    const onContactSidebarOpen = vi.fn();
    render(<ChatHeader {...defaultProps} onContactSidebarOpen={onContactSidebarOpen} />);

    const user = userEvent.setup();
    await user.click(screen.getByTestId('contact-avatar'));

    expect(onContactSidebarOpen).toHaveBeenCalledTimes(1);
  });

});

describe('ChatHeader change channel', () => {
  beforeEach(() => {
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);
    mockInboxes = [];
  });

  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    const menuTrigger = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-trigger"]')!;
    await user.click(menuTrigger);
  };

  it('hides the Change channel action when fewer than 2 eligible target inboxes exist', async () => {
    // Current inbox itself never counts as a target, and an archived inbox is
    // never eligible — so this account only has 1 eligible target (none).
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'Old WhatsApp', channel_type: 'Channel::Whatsapp', archived_at: '2026-01-01T00:00:00Z' } as Inbox,
    ];

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);

    expect(screen.queryByText('moveChannel.action')).not.toBeInTheDocument();
  });

  it('shows the Change channel action and opens the modal when 2+ eligible target inboxes exist', async () => {
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' } as Inbox,
    ];

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);

    await user.click(await screen.findByText('moveChannel.action'));

    expect(await screen.findByText('moveChannel.modalTitle')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Support')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp Sales')).toBeInTheDocument();
  });

  it('excludes a Chat Widget inbox from eligible targets even for a same-type conversation', async () => {
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '4', name: 'Website Chat', channel_type: 'Channel::WebWidget' } as Inbox,
    ];

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);
    await user.click(await screen.findByText('moveChannel.action'));

    await screen.findByText('moveChannel.modalTitle');
    expect(screen.getByText('WhatsApp Support')).toBeInTheDocument();
    expect(screen.queryByText('Website Chat')).not.toBeInTheDocument();
  });

  it('only makes a cross-type Email inbox eligible when the contact has an email', async () => {
    const conversationWithEmail = {
      id: '42',
      status: 'open' as const,
      inbox: { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' },
      contact: { id: '1', name: 'Test Contact', email: 'contact@example.com' },
      custom_attributes: {},
    } as never;
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'Support Email', channel_type: 'Channel::Email' } as Inbox,
    ];

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} conversation={conversationWithEmail} />);
    await openMenu(user);
    await user.click(await screen.findByText('moveChannel.action'));

    await screen.findByText('moveChannel.modalTitle');
    expect(screen.getByText('Support Email')).toBeInTheDocument();
  });

  it('excludes a cross-type Email inbox when the contact has no email', async () => {
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '4', name: 'Support Email', channel_type: 'Channel::Email' } as Inbox,
    ];

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);
    await user.click(await screen.findByText('moveChannel.action'));

    await screen.findByText('moveChannel.modalTitle');
    expect(screen.queryByText('Support Email')).not.toBeInTheDocument();
  });

  it('calls moveChannel and shows a success toast on confirm', async () => {
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' } as Inbox,
    ];
    vi.mocked(conversationAPI.moveChannel).mockResolvedValue({} as never);

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);
    await user.click(await screen.findByText('moveChannel.action'));
    await screen.findByText('moveChannel.modalTitle');

    await user.click(screen.getByText('WhatsApp Support'));
    await user.click(screen.getByText('moveChannel.confirm'));

    await waitFor(() => {
      expect(conversationAPI.moveChannel).toHaveBeenCalledWith('42', '2');
      expect(toast.success).toHaveBeenCalledWith('moveChannel.movedToast');
    });
  });

  it('shows the ineligible-channel error toast on a 422 failure', async () => {
    mockInboxes = [
      { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '2', name: 'WhatsApp Support', channel_type: 'Channel::Whatsapp' } as Inbox,
      { id: '3', name: 'WhatsApp Sales', channel_type: 'Channel::Whatsapp' } as Inbox,
    ];
    vi.mocked(conversationAPI.moveChannel).mockRejectedValue({
      response: { status: 422 },
    });

    const user = userEvent.setup();
    render(<ChatHeader {...defaultProps} />);
    await openMenu(user);
    await user.click(await screen.findByText('moveChannel.action'));
    await screen.findByText('moveChannel.modalTitle');

    await user.click(screen.getByText('WhatsApp Support'));
    await user.click(screen.getByText('moveChannel.confirm'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('moveChannel.errorIneligible');
    });
  });
});

// jsdom does not evaluate media queries, so these lock the responsive classes
// themselves — a className "cleanup" is exactly how EVO-2234 would come back.
describe('ChatHeader mobile layout (EVO-2234)', () => {
  beforeEach(() => {
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([]);
  });

  it('names the mobile back button (the only exit once the close X is desktop-only)', () => {
    render(<ChatHeader {...defaultProps} />);

    const back = screen.getByRole('button', { name: 'chatHeader.backToConversations' });
    expect(back).toHaveClass('md:hidden');
  });

  it('keeps the close (X) button out of the mobile header', () => {
    render(<ChatHeader {...defaultProps} />);

    const close = screen.getByRole('button', { name: 'chatHeader.closeConversation' });
    expect(close).toHaveClass('hidden');
    expect(close).toHaveClass('md:inline-flex');
  });

  it('lets the contact name truncate instead of pushing the actions off-screen', () => {
    render(<ChatHeader {...defaultProps} />);

    const name = screen.getByRole('heading', { name: 'Test Contact' });
    expect(name).toHaveClass('truncate');
    expect(name).toHaveClass('max-w-full');
  });

  it('lets the inbox name shrink and truncate instead of overflowing the header', () => {
    render(<ChatHeader {...defaultProps} />);

    const inbox = screen.getByText('WhatsApp');
    // min-w-0 is what actually allows the shrink: a flex item's automatic minimum
    // size is its content, so truncate alone would never engage.
    expect(inbox).toHaveClass('min-w-0');
    expect(inbox).toHaveClass('truncate');
  });

  it('still states the status as text on mobile, not by color alone', () => {
    render(<ChatHeader {...defaultProps} />);

    const longPill = screen.getByText('• chatHeader.statusPill.open');
    expect(longPill).toHaveClass('hidden');
    expect(longPill).toHaveClass('md:inline');

    const shortStatus = screen.getByText('• open');
    expect(shortStatus).toHaveClass('md:hidden');
  });
});
