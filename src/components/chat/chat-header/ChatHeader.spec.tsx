import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatHeader from './ChatHeader';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import chatService from '@/services/chat/chatService';
import { toast } from 'sonner';

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

  it('removes ALL pipelines when conversation is in 2+ pipelines before adding to new one (H1)', async () => {
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
