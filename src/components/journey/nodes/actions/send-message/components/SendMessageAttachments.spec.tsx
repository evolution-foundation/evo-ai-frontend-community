import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SendMessageAttachments, type AttachmentFile } from './SendMessageAttachments';
import i18n from '@/i18n/config';

const j = (key: string) => i18n.t(`journey:${key}`);

function renderAttachments(attachments: AttachmentFile[] = []) {
  return render(
    <SendMessageAttachments
      attachments={attachments}
      isDragOver={false}
      loading={false}
      fileInputRef={createRef<HTMLInputElement>()}
      onDragOver={vi.fn()}
      onDragLeave={vi.fn()}
      onDrop={vi.fn()}
      onFileInputChange={vi.fn()}
      onRemoveAttachment={vi.fn()}
    />,
  );
}

describe('SendMessageAttachments — rótulo pareado com o que existe na tela', () => {
  it('names the dropzone as a group instead of labelling the hidden file input', () => {
    const { container } = renderAttachments();

    const dropzone = screen.getByRole('group', { name: j('panels.sendMessage.attachments') });
    expect(within(dropzone).getByRole('button')).toBeTruthy();

    // A display:none input is out of the a11y tree — htmlFor pointing at it
    // would name nothing and would make the label open the file dialog.
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    expect(fileInput!.getAttribute('id')).toBeNull();
  });

  it('names the attachment list as its own group', () => {
    renderAttachments([
      { id: 'a1', name: 'brief.pdf', size: 1024, type: 'application/pdf', status: 'uploaded' },
    ]);

    const list = screen.getByRole('group', {
      name: i18n.t('journey:panels.sendMessage.attachmentsList', { count: 1 }),
    });
    expect(within(list).getByText('brief.pdf')).toBeTruthy();
  });
});
