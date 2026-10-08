import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const createMacro = vi.fn();
vi.mock('@/services/macros', () => ({
  macrosService: {
    getFormData: () =>
      Promise.resolve({
        inboxes: [],
        agents: [],
        teams: [],
        labels: [],
        campaigns: [],
        failedSources: [],
      }),
    createMacro: (...args: unknown[]) => createMacro(...args),
  },
}));

vi.mock('@evoapi/design-system', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? <div>{children}</div> : null,
    DialogContent: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
    DialogFooter: passthrough,
    Separator: () => null,
    Card: passthrough,
    CardContent: passthrough,
    CardDescription: passthrough,
    CardHeader: passthrough,
    CardTitle: passthrough,
    Label: passthrough,
    Input: (props: Record<string, unknown>) => <input {...props} />,
    Button: ({ children, ...props }: { children?: ReactNode }) => (
      <button {...props}>{children}</button>
    ),
  };
});

// The row owns the upload itself (MacroActionRow.attachment.spec); here only its
// contract with the modal matters: it reports uploads, honours `disabled` and names
// files from the `files` it is given.
vi.mock('./MacroActionRow', () => ({
  default: ({
    index,
    disabled,
    onUpdate,
    onRemove,
    files = [],
    onFileUploaded,
    onUploadingChange,
  }: {
    index: number;
    disabled: boolean;
    onUpdate: (index: number, action: { action_name: string; action_params: unknown[] }) => void;
    onRemove: (index: number) => void;
    files?: { blob_id: string; filename: string }[];
    onFileUploaded?: (file: { blob_id: string; filename: string }) => void;
    onUploadingChange?: (uploading: boolean) => void;
  }) => (
    <div
      data-testid={`row-${index}`}
      data-disabled={String(disabled)}
      data-files={files.map(f => f.filename).join(',')}
    >
      <button
        type="button"
        onClick={() => onUpdate(index, { action_name: 'resolve_conversation', action_params: [] })}
      >
        fill-{index}
      </button>
      <button type="button" onClick={() => onUploadingChange?.(true)}>
        start-upload-{index}
      </button>
      <button type="button" onClick={() => onUploadingChange?.(false)}>
        finish-upload-{index}
      </button>
      <button
        type="button"
        onClick={() =>
          onFileUploaded?.({ blob_id: `blob-${index}`, filename: `file-${index}.pdf` })
        }
      >
        uploaded-{index}
      </button>
      <button type="button" onClick={() => onRemove(index)}>
        remove-{index}
      </button>
    </div>
  ),
}));

import MacroFormModal from './MacroFormModal';

function renderModal() {
  const modal = (isOpen: boolean) => (
    <MacroFormModal isOpen={isOpen} onClose={vi.fn()} onSuccess={vi.fn()} macro={null} />
  );
  const { rerender } = render(modal(true));
  fireEvent.change(screen.getByPlaceholderText('modal.form.namePlaceholder'), {
    target: { value: 'Send price list' },
  });
  fireEvent.click(screen.getByText('modal.form.addAction'));
  // A form that passes validation, so only the upload can hold the save back.
  fireEvent.click(screen.getByText('fill-0'));
  fireEvent.click(screen.getByText('fill-1'));
  return {
    reopen: () => {
      rerender(modal(false));
      rerender(modal(true));
    },
  };
}

const submitForm = () => fireEvent.submit(document.querySelector('form') as HTMLFormElement);

const submitButton = () =>
  screen.getByText('modal.buttons.create').closest('button') as HTMLButtonElement;

describe('MacroFormModal while a file uploads', () => {
  beforeEach(() => {
    createMacro.mockReset();
  });

  it('locks every action row and the add button', () => {
    renderModal();

    fireEvent.click(screen.getByText('start-upload-1'));

    expect(screen.getByTestId('row-0').dataset.disabled).toBe('true');
    expect(screen.getByTestId('row-1').dataset.disabled).toBe('true');
    expect(
      (screen.getByText('modal.form.addAction').closest('button') as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByText('finish-upload-1'));

    expect(screen.getByTestId('row-0').dataset.disabled).toBe('false');
    expect(
      (screen.getByText('modal.form.addAction').closest('button') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('does not save until the upload lands', async () => {
    renderModal();

    fireEvent.click(screen.getByText('start-upload-0'));

    expect(submitButton().disabled).toBe(true);
    submitForm();
    expect(createMacro).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('finish-upload-0'));
    expect(submitButton().disabled).toBe(false);
    submitForm();

    await waitFor(() => expect(createMacro).toHaveBeenCalledTimes(1));
  });

  it('unlocks a reopened form even if the closed one was still uploading', () => {
    const { reopen } = renderModal();

    fireEvent.click(screen.getByText('start-upload-0'));
    expect(submitButton().disabled).toBe(true);

    reopen();

    expect(submitButton().disabled).toBe(false);
    expect(screen.getByTestId('row-0').dataset.disabled).toBe('false');
  });

  it('names a just-uploaded file by its blob id after the rows shift', () => {
    const { reopen } = renderModal();

    fireEvent.click(screen.getByText('uploaded-1'));
    fireEvent.click(screen.getByText('remove-0'));

    expect(screen.getByTestId('row-0').dataset.files).toBe('file-1.pdf');

    reopen();
    expect(screen.getByTestId('row-0').dataset.files).toBe('');
  });
});
