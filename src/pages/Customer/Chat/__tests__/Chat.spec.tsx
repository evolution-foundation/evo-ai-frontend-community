/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Chat from '../Chat';
import type { Conversation } from '@/types/chat/api';

// ─── Mutable test state ───────────────────────────────────────────────────────
const mockState = vi.hoisted(() => ({
  selectedConversationId: null as string | null,
}));

const mockHookResolve = vi.hoisted(() => ({
  fn: vi.fn<[Conversation, (() => Promise<void>)?], Promise<void>>(),
}));

const capturedProps = vi.hoisted(() => ({
  onMarkAsResolved: null as ((conv: Conversation) => Promise<void>) | null,
}));

const capturedHeaderProps = vi.hoisted(() => ({
  onMarkAsResolved: null as ((conv: Conversation) => Promise<void>) | null,
  conversation: null as Conversation | null,
}));

const mockSelectedConversation = vi.hoisted(() => ({
  value: null as Conversation | null,
}));

// ─── react-router-dom ─────────────────────────────────────────────────────────
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useParams: () => ({ conversationId: undefined }),
  useNavigate: () => mockNavigate,
}));

// ─── i18n ─────────────────────────────────────────────────────────────────────
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

// ─── Permissions ──────────────────────────────────────────────────────────────
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: vi.fn().mockReturnValue(true), isReady: true }),
}));

// ─── Chat context ─────────────────────────────────────────────────────────────
const mockSelectConversation = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/chat/ChatContext', () => ({
  useChatContext: () => ({
    conversations: {
      state: {
        selectedConversationId: mockState.selectedConversationId,
        conversationsLoading: false,
        conversationsError: null,
        conversations: [],
      },
      selectConversation: mockSelectConversation,
      getConversation: vi.fn().mockReturnValue(null),
      getUnreadCount: vi.fn().mockReturnValue(0),
      loadConversations: vi.fn().mockResolvedValue(undefined),
    },
    messages: {
      loadMessages: vi.fn(),
      loadMoreMessages: vi.fn(),
      state: { messages: [], messagesLoading: false },
    },
    selectedConversation: mockSelectedConversation.value,
    selectedMessages: [],
  }),
}));

// ─── Conversation handlers hook ───────────────────────────────────────────────
vi.mock('@/hooks/chat/useConversationHandlers', () => ({
  useConversationHandlers: () => ({
    handleMarkAsResolved: mockHookResolve.fn,
    handleMarkAsRead: vi.fn().mockResolvedValue(undefined),
    handleMarkAsUnread: vi.fn().mockResolvedValue(undefined),
    handlePostpone: vi.fn().mockResolvedValue(undefined),
    handleMarkAsOpen: vi.fn().mockResolvedValue(undefined),
    handleMarkAsSnoozed: vi.fn().mockResolvedValue(undefined),
    handleSetPriority: vi.fn().mockResolvedValue(undefined),
    handlePinConversation: vi.fn().mockResolvedValue(undefined),
    handleUnpinConversation: vi.fn().mockResolvedValue(undefined),
    handleArchiveConversation: vi.fn().mockResolvedValue(undefined),
    handleUnarchiveConversation: vi.fn().mockResolvedValue(undefined),
    handleDeleteConversation: vi.fn(),
  }),
}));

// ─── Assignment handlers hook ─────────────────────────────────────────────────
vi.mock('@/hooks/chat/useAssignmentHandlers', () => ({
  useAssignmentHandlers: () => ({
    handleAssignAgent: vi.fn(),
    handleAssignTeam: vi.fn(),
    handleAssignTag: vi.fn(),
    handleAssignmentConfirm: vi.fn(),
  }),
}));

// ─── Filter handlers hook ─────────────────────────────────────────────────────
vi.mock('@/hooks/chat/useFilterHandlers', () => ({
  useFilterHandlers: () => ({
    handleApplyFilters: vi.fn().mockResolvedValue(undefined),
    handleClearFilters: vi.fn().mockResolvedValue(undefined),
    reloadCurrentFilters: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ─── Storage utils ────────────────────────────────────────────────────────────
vi.mock('@/utils/storage/filtersStorage', () => ({
  loadConversationFilters: vi.fn().mockReturnValue([]),
  getDefaultFilter: vi.fn().mockReturnValue([]),
}));

// ─── App store ────────────────────────────────────────────────────────────────
vi.mock('@/store/appDataStore', () => ({
  useAppDataStore: (selector: (s: any) => any) => selector({ fetchLabels: vi.fn() }),
}));

// ─── Services ─────────────────────────────────────────────────────────────────
vi.mock('@/services/contacts/labelsService', () => ({
  labelsService: { createLabel: vi.fn() },
}));

// ─── Sub-components — capture onMarkAsResolved from ChatSidebar ───────────────
vi.mock('@/components/chat/chat-sidebar/ChatSidebar', () => ({
  default: (props: any) => {
    capturedProps.onMarkAsResolved = props.onMarkAsResolved;
    return <div data-testid="chat-sidebar" />;
  },
}));

vi.mock('@/components/chat/chat-header/ChatHeader', () => ({
  default: (props: any) => {
    capturedHeaderProps.onMarkAsResolved = props.onMarkAsResolved;
    capturedHeaderProps.conversation = props.conversation;
    return <div data-testid="chat-header" />;
  },
}));

vi.mock('@/components/chat/chat-area/ChatArea', () => ({
  default: () => <div data-testid="chat-area" />,
}));

vi.mock('@/components/chat/chat-tabs/ChatTabs', () => ({
  default: () => <div data-testid="chat-tabs" />,
}));

vi.mock('../../../components/ErrorBoundary', () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/tours', () => ({
  ChatTour: () => null,
}));

vi.mock('@evoapi/design-system/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <>{children}</>,
  AlertDialogContent: ({ children }: any) => <>{children}</>,
  AlertDialogHeader: ({ children }: any) => <>{children}</>,
  AlertDialogTitle: ({ children }: any) => <>{children}</>,
  AlertDialogDescription: ({ children }: any) => <>{children}</>,
  AlertDialogFooter: ({ children }: any) => <>{children}</>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: any) => <button type="button">{children}</button>,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const selectedConv: Conversation = {
  id: 'conv-selected',
  uuid: 'uuid-selected',
  status: 'open',
} as any;

const otherConv: Conversation = {
  id: 'conv-other',
  uuid: 'uuid-other',
  status: 'open',
} as any;

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Chat — handleMarkAsResolved navigation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps.onMarkAsResolved = null;
    capturedHeaderProps.onMarkAsResolved = null;
    capturedHeaderProps.conversation = null;
    mockState.selectedConversationId = null;
    mockSelectedConversation.value = null;
    mockHookResolve.fn.mockResolvedValue(undefined);
    mockSelectConversation.mockResolvedValue(undefined);
  });

  it('clears URL and selection when resolving the currently-selected conversation', async () => {
    mockState.selectedConversationId = 'uuid-selected';

    const { unmount } = render(<Chat />);

    await act(async () => {
      await capturedProps.onMarkAsResolved!(selectedConv);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/conversations', { replace: true });
    expect(mockSelectConversation).toHaveBeenCalledWith(null);

    unmount();
  });

  it('does not navigate when resolving a non-selected conversation', async () => {
    mockState.selectedConversationId = 'uuid-selected';

    const { unmount } = render(<Chat />);

    await act(async () => {
      await capturedProps.onMarkAsResolved!(otherConv);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSelectConversation).not.toHaveBeenCalled();

    unmount();
  });

  it('does not navigate when no conversation is selected', async () => {
    mockState.selectedConversationId = null;

    const { unmount } = render(<Chat />);

    await act(async () => {
      await capturedProps.onMarkAsResolved!(selectedConv);
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    unmount();
  });

  it('clears URL and selection when resolving via ChatHeader (primary resolve path)', async () => {
    mockState.selectedConversationId = 'uuid-selected';
    mockSelectedConversation.value = selectedConv;

    const { unmount } = render(<Chat />);

    expect(capturedHeaderProps.conversation).toEqual(selectedConv);

    await act(async () => {
      await capturedHeaderProps.onMarkAsResolved!(selectedConv);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/conversations', { replace: true });
    expect(mockSelectConversation).toHaveBeenCalledWith(null);

    unmount();
  });

  it('does not navigate when resolve fails on the selected conversation', async () => {
    mockState.selectedConversationId = 'uuid-selected';
    mockHookResolve.fn.mockRejectedValueOnce(new Error('API error'));

    const { unmount } = render(<Chat />);

    await act(async () => {
      await capturedProps.onMarkAsResolved!(selectedConv);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSelectConversation).not.toHaveBeenCalled();

    unmount();
  });
});
