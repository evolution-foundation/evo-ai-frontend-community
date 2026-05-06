import { describe, expect, it } from 'vitest';
import type { MessageTemplate } from '@/types/channels/inbox';
import {
  UNSUPPORTED_FORMATS,
  getStatusBadgeKey,
  getTemplateStatus,
  hasUnsupportedFormat,
  isTemplateApproved,
  isTemplateSendable,
} from './templateStatus';

const base: MessageTemplate = {
  name: 'ini_conversa',
  content: 'Olá, tudo bem?',
  language: 'pt_BR',
};

describe('getTemplateStatus', () => {
  it('reads top-level status and normalizes to lowercase', () => {
    expect(getTemplateStatus({ ...base, status: 'APPROVED' })).toBe('approved');
    expect(getTemplateStatus({ ...base, status: 'PENDING' })).toBe('pending');
  });

  it('falls back to settings.status when top-level is missing', () => {
    expect(
      getTemplateStatus({ ...base, settings: { status: 'APPROVED' } }),
    ).toBe('approved');
  });

  it('prefers top-level status over settings.status', () => {
    expect(
      getTemplateStatus({
        ...base,
        status: 'REJECTED',
        settings: { status: 'APPROVED' },
      }),
    ).toBe('rejected');
  });

  it('returns undefined when neither source has a status', () => {
    expect(getTemplateStatus({ ...base, settings: {} })).toBeUndefined();
    expect(getTemplateStatus({ ...base })).toBeUndefined();
  });
});

describe('isTemplateApproved', () => {
  it('returns true only when normalized status is "approved"', () => {
    expect(isTemplateApproved({ ...base, status: 'APPROVED' })).toBe(true);
    expect(isTemplateApproved({ ...base, settings: { status: 'approved' } })).toBe(true);
  });

  it('returns false for any non-approved status and for missing status', () => {
    expect(isTemplateApproved({ ...base, status: 'PENDING' })).toBe(false);
    expect(isTemplateApproved({ ...base, status: 'REJECTED' })).toBe(false);
    expect(isTemplateApproved({ ...base })).toBe(false);
    expect(isTemplateApproved({ ...base, settings: {} })).toBe(false);
  });
});

describe('hasUnsupportedFormat', () => {
  it('returns false when components is absent', () => {
    expect(hasUnsupportedFormat({ ...base })).toBe(false);
  });

  it('detects unsupported header formats in object-shaped components', () => {
    for (const format of UNSUPPORTED_FORMATS) {
      expect(
        hasUnsupportedFormat({
          ...base,
          components: { header: { type: 'HEADER', format } },
        }),
      ).toBe(true);
    }
  });

  it('allows TEXT header format in object-shaped components', () => {
    expect(
      hasUnsupportedFormat({
        ...base,
        components: { header: { type: 'HEADER', format: 'TEXT' } },
      }),
    ).toBe(false);
  });

  it('detects unsupported formats in array-shaped components', () => {
    expect(
      hasUnsupportedFormat({
        ...base,
        components: [
          { type: 'BODY', text: 'hello' },
          { type: 'HEADER', format: 'IMAGE' },
        ],
      }),
    ).toBe(true);
  });

  it('allows array-shaped components without media header', () => {
    expect(
      hasUnsupportedFormat({
        ...base,
        components: [{ type: 'BODY', text: 'hello' }],
      }),
    ).toBe(false);
  });
});

describe('isTemplateSendable', () => {
  it('requires approved + no unsupported format', () => {
    expect(
      isTemplateSendable({ ...base, status: 'APPROVED' }),
    ).toBe(true);

    expect(
      isTemplateSendable({
        ...base,
        status: 'APPROVED',
        components: { header: { type: 'HEADER', format: 'IMAGE' } },
      }),
    ).toBe(false);

    expect(
      isTemplateSendable({ ...base, status: 'PENDING' }),
    ).toBe(false);

    expect(isTemplateSendable({ ...base })).toBe(false);
  });
});

describe('getStatusBadgeKey', () => {
  it('maps each normalized status to its key', () => {
    expect(getStatusBadgeKey({ ...base, status: 'APPROVED' })).toBe('approved');
    expect(getStatusBadgeKey({ ...base, status: 'PENDING' })).toBe('pending');
    expect(getStatusBadgeKey({ ...base, status: 'REJECTED' })).toBe('rejected');
    expect(getStatusBadgeKey({ ...base, status: 'PAUSED' })).toBe('paused');
    expect(getStatusBadgeKey({ ...base, status: 'INACTIVE' })).toBe('inactive');
  });

  it('treats missing status as pending (locally-created, awaiting sync)', () => {
    expect(getStatusBadgeKey({ ...base, settings: {} })).toBe('pending');
    expect(getStatusBadgeKey({ ...base })).toBe('pending');
  });

  it('returns "unknown" for unrecognized status values', () => {
    expect(
      getStatusBadgeKey({
        ...base,
        settings: { status: 'SOMETHING_ELSE' },
      }),
    ).toBe('unknown');
  });
});
