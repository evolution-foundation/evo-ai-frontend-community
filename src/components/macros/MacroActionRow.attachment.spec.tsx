import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Interpolates the values so a test can read which filename the row shows.
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    currentLanguage: 'pt-BR',
  }),
}));

const uploadAttachment = vi.fn();
vi.mock('@/services/macros', () => ({
  macrosService: { uploadAttachment: (...args: unknown[]) => uploadAttachment(...args) },
}));

vi.mock('@evoapi/design-system', () => ({
  Select: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
    <select data-testid="action-type" disabled={disabled}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
  Input: (props: Record<string, unknown>) => <input {...props} />,
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
  Button: ({ children, ...props }: { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

import MacroActionRow from './MacroActionRow';
import type { MacroFile } from '@/types/automation';

const BLOB_ID = 'ae3d777f-63bc-4ace-9387-106db5278298';
const EMPTY_OPTIONS = { inboxes: [], agents: [], teams: [], labels: [], campaigns: [] };

function renderRow(actionParams: string[] = [], files: MacroFile[] = []) {
  const onUpdate = vi.fn();
  const onUploadingChange = vi.fn();
  const { container } = render(
    <MacroActionRow
      action={{ action_name: 'send_attachment', action_params: actionParams }}
      index={0}
      options={EMPTY_OPTIONS}
      onUpdate={onUpdate}
      onRemove={vi.fn()}
      canRemove={false}
      errors={{}}
      disabled={false}
      optionsLoading={false}
      failedSources={[]}
      files={files}
      onUploadingChange={onUploadingChange}
    />,
  );
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  return { onUpdate, onUploadingChange, input };
}

function pick(input: HTMLInputElement, name = 'tabela-precos.pdf') {
  const file = new File(['%PDF-1.4'], name, { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('MacroActionRow send_attachment', () => {
  beforeEach(() => {
    uploadAttachment.mockReset();
  });

  it('uploads the file and stores the real blob id', async () => {
    uploadAttachment.mockResolvedValue(BLOB_ID);
    const { onUpdate, input } = renderRow();

    const file = pick(input);

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(0, {
        action_name: 'send_attachment',
        action_params: [BLOB_ID],
      }),
    );
    expect(uploadAttachment).toHaveBeenCalledWith(file, expect.any(Function));
  });

  it('shows the upload progress while the file is sent', async () => {
    let finish: (id: string) => void = () => {};
    uploadAttachment.mockImplementation((_file: File, onProgress: (p: number) => void) => {
      onProgress(42);
      return new Promise<string>(resolve => {
        finish = resolve;
      });
    });
    const { input, onUploadingChange } = renderRow();

    pick(input);

    expect(await screen.findByText('actionRow.fileUploadProgress {"progress":42}')).toBeTruthy();
    // The id lands on this row, so its action cannot change under the upload.
    expect((screen.getByTestId('action-type') as HTMLSelectElement).disabled).toBe(true);
    expect(onUploadingChange).toHaveBeenLastCalledWith(true);

    finish(BLOB_ID);
    await waitFor(() => expect(screen.getByText('actionRow.fileSelectButton')).toBeTruthy());
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    expect((screen.getByTestId('action-type') as HTMLSelectElement).disabled).toBe(false);
  });

  it('shows an error and keeps the params untouched when the upload fails', async () => {
    uploadAttachment.mockRejectedValue(new Error('413'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { onUpdate, input } = renderRow();

    pick(input);

    expect((await screen.findByRole('alert')).textContent).toBe('actionRow.fileUploadError');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('names the file of a saved macro when it is reopened', () => {
    renderRow(
      [BLOB_ID],
      [
        {
          id: 'att-1',
          macro_id: 'macro-1',
          file_type: 'application/pdf',
          file_url: 'http://localhost:3000/rails/active_storage/blobs/x/tabela-precos.pdf',
          blob_id: BLOB_ID,
          filename: 'tabela-precos.pdf',
        },
      ],
    );

    expect(screen.getByText('actionRow.fileSelected {"filename":"tabela-precos.pdf"}')).toBeTruthy();
    expect(screen.queryByText(new RegExp(BLOB_ID))).toBeNull();
  });

  it('flags an id with no file behind it instead of printing it', () => {
    renderRow(['blob_1759700000000']);

    expect(screen.getByText('actionRow.fileMissing')).toBeTruthy();
    expect(screen.queryByText(/blob_1759700000000/)).toBeNull();
  });
});
