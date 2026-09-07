import i18n from '@/i18n/config';
// Centralized media-type and attachment-label helpers used by the chat UI to
// preview WhatsApp messages whose body is empty (media-only) and to render
// reply previews consistently across MessageBubble, ChatSidebar, ReplyPreview
// and MessageInput.
//
// The backend tags `content_attributes.media_type` even when the binary
// attachment didn't materialize (e.g. inline base64 from Evolution Go), so we
// fall back to it when `attachments[0].file_type` is absent.

export type MediaType =
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'sticker'
  | 'location'
  | 'contact';

const EMOJI_LABEL: Record<MediaType, string> = {
  get image() { return i18n.t("interface:medialabels.photo"); },
  get video() { return i18n.t("chat:messages.replyPreview.videoAttachment"); },
  get audio() { return i18n.t("chat:messages.replyPreview.audioAttachment"); },
  get file() { return i18n.t("interface:medialabels.document"); },
  sticker: '💟 Figurinha',
  get location() { return i18n.t("chat:messages.replyPreview.locationAttachment"); },
  get contact() { return i18n.t("interface:medialabels.contact"); },
};

const isKnownMediaType = (value: unknown): value is MediaType =>
  typeof value === 'string' && value in EMOJI_LABEL;

export const attachmentLabel = (fileType?: string | null): string => {
  if (!fileType) return i18n.t("interface:medialabels.attachment");
  return isKnownMediaType(fileType) ? EMOJI_LABEL[fileType] : `📎 ${fileType}`;
};

// i18n key fragment matching the existing `messages.replyPreview.*` translations.
const I18N_KEY: Record<MediaType, string> = {
  image: 'imageAttachment',
  video: 'videoAttachment',
  audio: 'audioAttachment',
  file: 'fileAttachment',
  sticker: 'fileAttachment',
  location: 'locationAttachment',
  contact: 'fileAttachment',
};

export const attachmentI18nKey = (fileType?: string | null): string =>
  isKnownMediaType(fileType) ? I18N_KEY[fileType] : I18N_KEY.file;

export const senderNameFromAttributes = (
  attrs: Record<string, unknown> | undefined,
): string | undefined => {
  const value = attrs?.sender_name;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const mediaTypeFromAttributes = (
  attrs: Record<string, unknown> | undefined,
): MediaType | undefined => {
  const value = attrs?.media_type;
  return isKnownMediaType(value) ? value : undefined;
};
