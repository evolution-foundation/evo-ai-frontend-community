import type { ProcedureAttachment } from '@/types/procedures';

const imageExtensionPattern = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function normalizeAttachmentUrl(rawUrl?: string) {
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl, window.location.origin);
    const apiBase = new URL(import.meta.env.VITE_API_URL || window.location.origin, window.location.origin);

    if (
      localHosts.has(url.hostname) &&
      localHosts.has(apiBase.hostname) &&
      url.port === '3000' &&
      apiBase.port &&
      apiBase.port !== url.port
    ) {
      url.protocol = apiBase.protocol;
      url.hostname = apiBase.hostname;
      url.port = apiBase.port;
    }

    return url.href;
  } catch {
    return rawUrl;
  }
}

export function getAttachmentUrl(attachment: ProcedureAttachment) {
  return normalizeAttachmentUrl(attachment.data_url || attachment.file_url);
}

export function getAttachmentPreviewUrl(attachment: ProcedureAttachment) {
  return normalizeAttachmentUrl(attachment.thumb_url) || getAttachmentUrl(attachment);
}

export function getAttachmentName(attachment: ProcedureAttachment) {
  return attachment.file_name || attachment.fallback_title || attachment.file_type || 'Arquivo';
}

export function isImageAttachment(attachment: ProcedureAttachment) {
  const name = getAttachmentName(attachment);
  return (
    attachment.file_type === 'image' ||
    attachment.content_type?.startsWith('image/') ||
    imageExtensionPattern.test(name) ||
    imageExtensionPattern.test(attachment.data_url || attachment.file_url || '')
  );
}
