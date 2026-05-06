import type { MessageTemplate, MessageTemplateComponent } from '@/types/channels/inbox';

export const UNSUPPORTED_FORMATS = ['DOCUMENT', 'IMAGE', 'VIDEO'] as const;

export type TemplateStatusKey =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'paused'
  | 'inactive'
  | 'unknown';

export const getTemplateStatus = (template: MessageTemplate): string | undefined => {
  const fromSettings = (template.settings as Record<string, unknown> | undefined)?.status;
  const raw = (template.status ?? fromSettings) as string | undefined;
  return raw?.toLowerCase();
};

export const isTemplateApproved = (template: MessageTemplate): boolean =>
  getTemplateStatus(template) === 'approved';

export const hasUnsupportedFormat = (template: MessageTemplate): boolean => {
  if (!template.components) return false;

  if (Array.isArray(template.components)) {
    return template.components.some(
      (c: MessageTemplateComponent) =>
        !!c.format &&
        (UNSUPPORTED_FORMATS as readonly string[]).includes(c.format),
    );
  }

  const headerFormat = (template.components as Record<string, MessageTemplateComponent | undefined>)
    ?.header?.format;
  return !!headerFormat && (UNSUPPORTED_FORMATS as readonly string[]).includes(headerFormat);
};

export const isTemplateSendable = (template: MessageTemplate): boolean =>
  isTemplateApproved(template) && !hasUnsupportedFormat(template);

export const getStatusBadgeKey = (template: MessageTemplate): TemplateStatusKey => {
  const status = getTemplateStatus(template);
  switch (status) {
    case 'approved':
      return 'approved';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'paused':
      return 'paused';
    case 'inactive':
      return 'inactive';
    case undefined:
      return 'pending';
    default:
      return 'unknown';
  }
};
