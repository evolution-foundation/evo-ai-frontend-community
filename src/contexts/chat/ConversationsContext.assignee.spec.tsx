import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationsProvider } from './ConversationsContext';
import { useConversations } from '@/hooks/chat/useConversations';
import type { Conversation, ConversationsQuery } from '@/types/chat/api';

const service = vi.hoisted(() => ({ getConversations: vi.fn(), filterConversations: vi.fn() }));
vi.mock('@/services/chat/chatService', () => ({ chatService: service }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const pagination = { page: 1, page_size: 1, total: 2, total_pages: 2 };
const conversation = (id: string) => ({ id, assignee_id: 'agent-a' } as Conversation);
const response = (id: string, total = 2) => ({ data: { payload: [conversation(id)], meta: { ...pagination, total } } });
const query: ConversationsQuery = { kind: 'list', params: { status: 'all', assignee_id: ['agent-a', 'agent-b'], archived: false, q: 'term' } };
const advanced: ConversationsQuery = { kind: 'filter', request: { filters: [{
  attribute_key: 'assignee_id', filter_operator: 'equal_to', values: ['agent-a'], query_operator: null,
}] } };
const wrapper = ({ children }: { children: React.ReactNode }) => <ConversationsProvider>{children}</ConversationsProvider>;

describe('filtered conversation pagination and refresh', () => {
  beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });

  it('replays every GET criterion when loading the next page', async () => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('first')], pagination, query));
    service.getConversations.mockResolvedValue(response('next'));
    await act(() => result.current.loadMoreConversations());
    expect(service.getConversations).toHaveBeenCalledWith({ ...query.params, page: 2 });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['first', 'next']);
  });

  it.each([query, advanced])('ignores a pending old page when the active query changes ($kind)', async activeQuery => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('first')], pagination, activeQuery));
    let finish!: (value: ReturnType<typeof response>) => void;
    const pending = new Promise<ReturnType<typeof response>>(resolve => { finish = resolve; });
    service.getConversations.mockReturnValue(pending);
    service.filterConversations.mockReturnValue(pending);
    let loading!: Promise<void>;
    act(() => { loading = result.current.loadMoreConversations(); });
    act(() => result.current.setConversations([conversation('new-query')], pagination, { kind: 'list', params: { status: 'open' } }));
    await act(async () => { finish(response('obsolete-page')); await loading; });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['new-query']);
    expect(result.current.state.conversationsLoading).toBe(false);
  });

  it.each([query, advanced])('refreshes the saved query and resets pagination/totals ($kind)', async activeQuery => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('old')], { ...pagination, page: 2 }, activeQuery));
    service.getConversations.mockResolvedValue(response('fresh', 1));
    service.filterConversations.mockResolvedValue(response('fresh', 1));
    await act(() => result.current.refreshCurrentQuery());
    const api = activeQuery.kind === 'list' ? service.getConversations : service.filterConversations;
    const params = activeQuery.kind === 'list' ? activeQuery.params : activeQuery.request;
    expect(api).toHaveBeenCalledWith({ ...params, page: 1 });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['fresh']);
    expect(result.current.state.conversationsPagination?.page).toBe(1);
    expect(result.current.state.conversationsPagination?.total).toBe(1);
  });

  it('drops a refresh response when the filter is removed', async () => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('old')], pagination, query));
    let finish!: (value: ReturnType<typeof response>) => void;
    service.getConversations.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    let refreshing!: Promise<void>;
    act(() => { refreshing = result.current.refreshCurrentQuery(); });
    act(() => result.current.setConversations([conversation('unfiltered')], pagination, { kind: 'list', params: { status: 'all' } }));
    await act(async () => { finish(response('obsolete')); await refreshing; });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['unfiltered']);
  });

  it('drops a previously requested page after a realtime page-one refresh', async () => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('old')], pagination, query));
    let finishPage!: (value: ReturnType<typeof response>) => void;
    service.getConversations.mockImplementation(({ page }: { page: number }) => page === 1
      ? Promise.resolve(response('fresh', 1))
      : new Promise(resolve => { finishPage = resolve; }));
    let loading!: Promise<void>;
    act(() => { loading = result.current.loadMoreConversations(); });
    await act(() => result.current.refreshCurrentQuery());
    await act(async () => { finishPage(response('old-page')); await loading; });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['fresh']);
    expect(result.current.state.conversationsPagination?.total).toBe(1);
  });

  it('does not let an older overlapping refresh overwrite the latest total', async () => {
    const { result } = renderHook(useConversations, { wrapper });
    act(() => result.current.setConversations([conversation('old')], pagination, query));
    let finishOld!: (value: ReturnType<typeof response>) => void;
    service.getConversations.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
    service.getConversations.mockResolvedValueOnce(response('latest', 1));
    let oldRefresh!: Promise<void>;
    act(() => { oldRefresh = result.current.refreshCurrentQuery(); });
    await act(() => result.current.refreshCurrentQuery());
    await act(async () => { finishOld(response('older', 10)); await oldRefresh; });
    expect(result.current.state.conversations.map(c => c.id)).toEqual(['latest']);
    expect(result.current.state.conversationsPagination?.total).toBe(1);
  });
});
