import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatSidebar from './ChatSidebar';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
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
  default: { getConversation: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (v: unknown) => v,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/utils/channelUtils', () => ({
  isPhoneBearingChannel: () => false,
}));

vi.mock('@/utils/contact/formatContactPhone', () => ({
  formatContactPhone: (p: string) => p,
}));

vi.mock('@/utils/time/timeHelpers', () => ({
  formatConversationTime: () => '10:00',
  formatDetailedTime: () => '2026-05-13 10:00',
  normalizeToUnixSeconds: (v: number) => v,
}));

vi.mock('@/utils/chat/mediaLabels', () => ({
  attachmentLabel: () => '',
  mediaTypeFromAttributes: () => null,
  senderNameFromAttributes: () => null,
}));

vi.mock('../loading-states', () => ({
  ConversationSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('../empty-states', () => ({
  NoConversations: () => <div data-testid="no-conversations" />,
}));

vi.mock('../contact/ContactAvatar', () => ({
  default: () => <div data-testid="contact-avatar" />,
}));

vi.mock('../conversation/ConversationBadges', () => ({
  default: () => <div data-testid="conversation-badges" />,
}));

vi.mock('../conversation/ConversationsFilter', () => ({
  default: () => <div data-testid="conversations-filter" />,
}));

vi.mock('../search/GlobalSearchPanel', () => ({
  default: () => <div data-testid="global-search-panel" />,
}));

const makeConversation = (id = '42') =>
  ({
    id,
    status: 'open' as const,
    inbox: { id: '1', name: 'WhatsApp', channel_type: 'Channel::Whatsapp' },
    contact: { id: '1', name: 'Test Contact' },
    custom_attributes: {},
    timestamp: Date.now(),
    unread_count: 0,
  }) as never;

const makePipeline = (
  id: string,
  stages: { id: string; name: string }[],
  items: { id: string; item_id: string; stage_id: string; pipeline_id: string }[] = [],
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

const mockConversation = makeConversation();

const makeMockContext = () => ({
  conversations: {
    state: {
      conversations: [mockConversation],
      conversationsLoading: false,
      conversationsError: null,
      selectedConversationId: null,
      conversationsPagination: null,
    },
    getUnreadCount: () => 0,
    loadConversations: vi.fn().mockResolvedValue(undefined),
    loadMoreConversations: vi.fn().mockResolvedValue(undefined),
    updateConversation: vi.fn(),
  },
  filters: {
    state: { activeFilters: [], isApplyingFilters: false },
    applyFilters: vi.fn(),
    clearFilters: vi.fn(),
  },
});

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => makeMockContext(),
}));

const defaultProps = {
  mobileView: 'list' as const,
  searchInput: '',
  onSearchChange: vi.fn(),
  onConversationSelect: vi.fn(),
  onFilterApply: vi.fn(),
  onFilterClear: vi.fn(),
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
};

beforeEach(() => {
  vi.clearAllMocks();
});

const openContextMenuPipelineStage = async (
  user: ReturnType<typeof userEvent.setup>,
  pipelineName: string,
  stageName: string,
) => {
  const row = screen.getByText('Test Contact').closest('div[class*="p-4"]') as HTMLElement;
  fireEvent.contextMenu(row);

  const addToTrigger = await screen.findByText('pipeline.addTo', {}, { timeout: 2000 });
  const addToSubTrigger = (
    addToTrigger.closest('[data-slot="context-menu-sub-trigger"]') ?? addToTrigger
  ) as HTMLElement;
  addToSubTrigger.focus();
  await user.keyboard('{ArrowRight}');

  await waitFor(() => screen.getByText(pipelineName), { timeout: 2000 });
  const pipelineEl = screen.getByText(pipelineName);
  const pipelineSubTrigger = (
    pipelineEl.closest('[data-slot="context-menu-sub-trigger"]') ?? pipelineEl
  ) as HTMLElement;
  pipelineSubTrigger.focus();
  await user.keyboard('{ArrowRight}');

  await waitFor(() => screen.getByText(stageName), { timeout: 3000 });
  await user.click(screen.getByText(stageName));
};

describe('ChatSidebar pipeline', () => {
  it('shows loading label in stage submenu while getPipelinesByConversation is pending (isLoadingConvPipelines guard)', async () => {
    const pipeline = makePipeline('p1', [{ id: 'stage-1', name: 'Lead' }]);
    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({ data: [pipeline] } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockReturnValue(new Promise(() => {}));

    render(<ChatSidebar {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    const row = screen.getByText('Test Contact').closest('div[class*="p-4"]') as HTMLElement;
    fireEvent.contextMenu(row);

    await waitFor(() =>
      expect(pipelinesService.getPipelinesByConversation).toHaveBeenCalledWith('42'),
    );

    const addToTrigger = await screen.findByText('pipeline.addTo', {}, { timeout: 2000 });
    const addToSubTrigger = (
      addToTrigger.closest('[data-slot="context-menu-sub-trigger"]') ?? addToTrigger
    ) as HTMLElement;
    addToSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => screen.getByText('Pipeline p1'), { timeout: 2000 });
    const pipelineEl = screen.getByText('Pipeline p1');
    const pipelineSubTrigger = (
      pipelineEl.closest('[data-slot="context-menu-sub-trigger"]') ?? pipelineEl
    ) as HTMLElement;
    pipelineSubTrigger.focus();
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(screen.getByText('pipeline.loading')).toBeInTheDocument();
      expect(screen.queryByText('Lead')).not.toBeInTheDocument();
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
    const pOld1 = makePipeline(
      'p-old1',
      [{ id: 'stage-p-old1', name: 'StageA' }],
      [makeItem('item-1', 'p-old1')],
    );
    const pOld2 = makePipeline(
      'p-old2',
      [{ id: 'stage-p-old2', name: 'StageB' }],
      [makeItem('item-2', 'p-old2')],
    );
    const pNew = makePipeline('p-new', [{ id: 'stage-new', name: 'StageC' }]);

    vi.mocked(pipelinesService.getPipelines).mockResolvedValue({
      data: [pOld1, pOld2, pNew],
    } as never);
    vi.mocked(pipelinesService.getPipelinesByConversation).mockResolvedValue([pOld1, pOld2]);
    vi.mocked(pipelinesService.removeItemFromPipeline).mockResolvedValue({
      success: true,
      message: '',
    });
    vi.mocked(pipelinesService.addItemToPipeline).mockResolvedValue({} as never);

    render(<ChatSidebar {...defaultProps} />);
    await waitFor(() => expect(pipelinesService.getPipelines).toHaveBeenCalled());

    const user = userEvent.setup();
    await openContextMenuPipelineStage(user, 'Pipeline p-new', 'StageC');

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
});
