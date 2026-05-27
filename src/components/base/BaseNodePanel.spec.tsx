import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BaseNodePanel, type NodeCategory, type NodeType } from './BaseNodePanel';
import { MoveRight, Send, UserCog, MessageSquare, Bot, Clock, Tag } from 'lucide-react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'base.flow.panel.title': 'Journey Components',
        'base.flow.panel.subtitle': 'Drag a component to the canvas',
        'base.flow.panel.allComponents': 'All',
        'base.flow.panel.allDescription': 'Every available component',
        'base.flow.panel.search': 'Search components…',
        'base.flow.panel.searchAll': 'Searching all categories',
        'base.flow.panel.noResults': 'No results found',
        'base.flow.panel.dragToAdd': 'Drag to add',
      };
      return map[key] ?? key;
    },
    currentLanguage: 'en',
    changeLanguage: () => undefined,
  }),
}));

const mockSetType = vi.fn();
vi.mock('@/contexts/DnDContext', () => ({
  useDnD: () => ({
    setType: mockSetType,
    type: null,
    setPointerEvents: () => undefined,
    pointerEvents: 'auto',
  }),
}));

const categories: NodeCategory[] = [
  { value: 'controlFlow', label: 'Control Flow', icon: MoveRight, description: 'Wait / branch' },
  { value: 'communication', label: 'Communication', icon: Send, description: 'Send messages' },
  { value: 'contact', label: 'Contact', icon: UserCog, description: 'Update / assign / label' },
  { value: 'conversation', label: 'Conversation', icon: MessageSquare, description: 'Manage conversation state' },
];

const nodeTypes: Record<string, NodeType[]> = {
  controlFlow: [
    {
      id: 'wait-node',
      name: 'Wait',
      description: 'Pause execution for a fixed time',
      icon: Clock,
      color: 'text-blue-400',
      category: 'controlFlow',
      searchKeywords: ['delay', 'pause', 'sleep'],
    },
  ],
  communication: [
    {
      id: 'send-message-node',
      name: 'Send Message',
      description: 'Send a message through a channel',
      icon: MessageSquare,
      color: 'text-blue-400',
      category: 'communication',
      searchKeywords: ['chat', 'whatsapp', 'sms'],
    },
  ],
  contact: [
    {
      id: 'add-label-node',
      name: 'Add Label',
      description: 'Add a label to the contact',
      icon: Tag,
      color: 'text-green-400',
      category: 'contact',
      searchKeywords: ['tag', 'etiqueta', 'mark'],
    },
    {
      id: 'assign-bot-node',
      name: 'Assign Bot',
      description: 'Connect a bot to an inbox',
      icon: Bot,
      color: 'text-purple-400',
      category: 'contact',
      searchKeywords: ['bot', 'automation'],
    },
  ],
  conversation: [],
};

describe('BaseNodePanel', () => {
  it('renders every category in the dropdown selector', () => {
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain('All');
  });

  it('shows every node when the "All" category is active (AC#1)', () => {
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    expect(screen.getByText('Wait')).toBeTruthy();
    expect(screen.getByText('Send Message')).toBeTruthy();
    expect(screen.getByText('Add Label')).toBeTruthy();
    expect(screen.getByText('Assign Bot')).toBeTruthy();
  });

  it('search by node name returns matching nodes (AC#2 — by name)', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'message');
    expect(screen.getByText('Send Message')).toBeTruthy();
    expect(screen.queryByText('Wait')).toBeNull();
  });

  it('search matches against searchKeywords (AC#2 — by keyword)', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'delay');
    expect(screen.getByText('Wait')).toBeTruthy();
    expect(screen.queryByText('Send Message')).toBeNull();
  });

  it('search by pt-BR keyword resolves via searchKeywords ("etiqueta" -> add-label)', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'etiqueta');
    expect(screen.getByText('Add Label')).toBeTruthy();
    expect(screen.queryByText('Send Message')).toBeNull();
  });

  it('search is case-insensitive', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'WAIT');
    expect(screen.getByText('Wait')).toBeTruthy();
  });

  it('search miss renders empty-state message', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'zzznotanode');
    expect(screen.getByText(/no results/i)).toBeTruthy();
  });

  it('drag-start invokes setType with the node id (AC#5)', () => {
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const waitCard = screen.getByText('Wait').closest('[draggable]');
    expect(waitCard).toBeTruthy();
    const dataTransfer = { effectAllowed: '', setData: vi.fn() } as unknown as DataTransfer;
    fireEvent.dragStart(waitCard!, { dataTransfer });
    expect(mockSetType).toHaveBeenCalledWith('wait-node');
  });

  it('nodes are absent from the panel when a different category is active', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} defaultCategory="communication" />);
    expect(screen.getByText('Send Message')).toBeTruthy();
    expect(screen.queryByText('Wait')).toBeNull();
    expect(screen.queryByText('Add Label')).toBeNull();
  });

  it('groups nodes under category headers in the "All" view (AC#1)', () => {
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    // A section per non-empty category, each labelled by its translated label.
    const sections = screen.getAllByRole('region');
    expect(sections.length).toBe(3);
    expect(screen.getByRole('region', { name: /control flow/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: /communication/i })).toBeTruthy();
    expect(screen.getByRole('region', { name: /contact/i })).toBeTruthy();
    // Empty conversation category does not produce a section header.
    expect(screen.queryByRole('region', { name: /^conversation$/i })).toBeNull();
  });

  it('grouped view stays scoped to its category — wait is rendered inside the Control Flow section', () => {
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const controlFlow = screen.getByRole('region', { name: /control flow/i });
    expect(within(controlFlow).getByText('Wait')).toBeTruthy();
    expect(within(controlFlow).queryByText('Send Message')).toBeNull();
  });

  it('grouped layout collapses to a flat list while a search query is active', async () => {
    const user = userEvent.setup();
    render(<BaseNodePanel nodeTypes={nodeTypes} categories={categories} />);
    const input = screen.getByPlaceholderText('Search components…');
    await user.type(input, 'wait');
    expect(screen.queryByRole('region', { name: /control flow/i })).toBeNull();
    expect(screen.getByText('Wait')).toBeTruthy();
  });
});
