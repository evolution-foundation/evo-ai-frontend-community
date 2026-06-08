import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SendCannedResponsePanel } from './SendCannedResponsePanel';
import { SendCannedResponseNodeData } from './SendCannedResponseNode';
import '@/i18n/config';

vi.mock('@/services/cannedResponses/cannedResponsesService', () => ({
  cannedResponsesService: {
    getCannedResponses: vi.fn(),
  },
}));

import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';

const mockGetCannedResponses = cannedResponsesService.getCannedResponses as unknown as ReturnType<
  typeof vi.fn
>;

const CANNED = [
  { id: 'cr-1', short_code: 'greeting', content: 'Hi there', created_at: '' },
  { id: 'cr-2', short_code: 'bye', content: 'Goodbye', created_at: '' },
];

function makeData(overrides: Partial<SendCannedResponseNodeData> = {}): SendCannedResponseNodeData {
  return {
    label: 'Send Canned Response',
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('SendCannedResponsePanel', () => {
  it('shows the loading placeholder while canned responses are fetching', async () => {
    let resolveFn: (value: unknown) => void = () => {};
    mockGetCannedResponses.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFn = resolve;
        }),
    );

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).toBeTruthy();

    resolveFn({ data: CANNED });
    await waitFor(() => expect(mockGetCannedResponses).toHaveBeenCalled());
  });

  it('renders the canned responses returned by the service inside the select', async () => {
    mockGetCannedResponses.mockResolvedValueOnce({ data: CANNED });
    const user = userEvent.setup();

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetCannedResponses).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox'));

    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('/greeting')).toBeTruthy();
    expect(within(listbox).getByText('/bye')).toBeTruthy();
  });

  it('keeps Save disabled until a canned response is selected, then enables it', async () => {
    mockGetCannedResponses.mockResolvedValueOnce({ data: CANNED });
    const user = userEvent.setup();

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetCannedResponses).toHaveBeenCalled());

    const saveBtn = screen.getByRole('button', { name: /save|salvar|guardar|enregistrer|salva/i });
    expect(saveBtn).toBeDisabled();

    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('/greeting'));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /save|salvar|guardar|enregistrer|salva/i }),
      ).not.toBeDisabled(),
    );
  });

  it('emits onUpdate with canned_response_id + canned_response_label on save (AC1 contract)', async () => {
    mockGetCannedResponses.mockResolvedValueOnce({ data: CANNED });
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={onUpdate}
        onClose={onClose}
      />,
    );

    await waitFor(() => expect(mockGetCannedResponses).toHaveBeenCalled());
    await user.click(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    await user.click(within(listbox).getByText('/bye'));

    const saveBtn = await screen.findByRole('button', {
      name: /save|salvar|guardar|enregistrer|salva/i,
    });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    const saveCall = onUpdate.mock.calls.find(
      ([, payload]) => payload?.canned_response_id === 'cr-2',
    );
    expect(saveCall).toBeTruthy();
    expect(saveCall?.[0]).toBe('n1');
    expect(saveCall?.[1]).toMatchObject({
      canned_response_id: 'cr-2',
      canned_response_label: '/bye',
      formDataOptions: {
        cannedResponses: [
          { id: 'cr-1', label: '/greeting' },
          { id: 'cr-2', label: '/bye' },
        ],
      },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty-state message when zero canned responses are returned', async () => {
    mockGetCannedResponses.mockResolvedValueOnce({ data: [] });

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(mockGetCannedResponses).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /no canned responses found|nenhuma resposta r[áa]pida|no se encontraron respuestas|aucune r[ée]ponse|nessuna risposta/i,
      ),
    ).toBeTruthy();
  });

  it('renders an error banner when the fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCannedResponses.mockRejectedValueOnce(new Error('boom'));

    render(
      <SendCannedResponsePanel
        nodeId="n1"
        data={makeData()}
        onUpdate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(
      await screen.findByText(
        /could not load canned responses|n[ãa]o foi poss[íi]vel carregar|no se pudieron cargar|impossible de charger|impossibile caricare/i,
      ),
    ).toBeTruthy();

    consoleError.mockRestore();
  });
});
