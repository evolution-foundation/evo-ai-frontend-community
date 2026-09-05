export type SocialChannelType = 'Channel::Instagram' | 'Channel::FacebookPage';

export interface SocialChannelOption {
  channel_type: SocialChannelType;
  channel_id: string;
  username: string;
  page_id?: string;
}

export interface InstagramAccountInfo {
  username: string;
  followers_count: number;
  media_count: number;
  follows_count?: number;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
}

export interface InstagramMediaInsight {
  name: string;
  values?: { value: number }[];
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  insights?: { data: InstagramMediaInsight[] };
}

export interface InstagramComment {
  id: string;
  text: string;
  username?: string;
  timestamp?: string;
  like_count?: number;
  from?: { username?: string };
}

export type PublicationPlatform = 'instagram' | 'facebook';
export type PublicationContentType = 'feed' | 'stories' | 'reels';
export type PublicationStatus = 'pending' | 'publishing' | 'published' | 'failed';

export interface Publication {
  id: string;
  caption?: string;
  platforms: PublicationPlatform[];
  content_type: PublicationContentType;
  status: PublicationStatus;
  error_message?: string;
  external_post_ids: Record<string, string>;
  created_at: string;
}

export interface CreatePublicationPayload {
  caption: string;
  platforms: PublicationPlatform[];
  content_type: PublicationContentType;
  media: File;
  channel_type: SocialChannelType;
  channel_id: string;
}

export type CarouselBatchStatus = 'collecting' | 'publishing' | 'published' | 'failed' | 'abandoned';

export interface CarouselBatch {
  id: string;
  caption?: string;
  platforms: PublicationPlatform[];
  total_cards: number;
  status: CarouselBatchStatus;
  error_message?: string;
  external_post_ids: Record<string, string>;
  cards_collected: Record<string, number>;
  created_at: string;
}

export interface CreateCarouselBatchPayload {
  caption: string;
  platforms: PublicationPlatform[];
  total_cards: number;
  channel_type: SocialChannelType;
  channel_id: string;
}

export type ScheduledPostStatus = 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled';

export interface ScheduledPostItem {
  id: string;
  caption?: string;
  platforms: PublicationPlatform[];
  content_type: PublicationContentType;
  status: ScheduledPostStatus;
  error_message?: string;
  external_post_ids: Record<string, string>;
  scheduled_for: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface CreateScheduledPostPayload {
  caption: string;
  platforms: PublicationPlatform[];
  content_type: PublicationContentType;
  media: File;
  channel_type: SocialChannelType;
  channel_id: string;
  scheduled_for: string;
}

export type WhatsappStatusType = 'text' | 'image' | 'video' | 'audio';

export interface WhatsappStatusChannelOption {
  channel_id: string;
  name: string;
}

export interface CreateWhatsappStatusPayload {
  channel_id: string;
  type: WhatsappStatusType;
  content?: string;
  media?: File;
  caption?: string;
}

export type YoutubePrivacyStatus = 'public' | 'unlisted' | 'private';
export type YoutubeUploadStatus = 'pending' | 'uploading' | 'published' | 'failed';

export interface YoutubeUploadItem {
  id: string;
  title: string;
  description?: string;
  privacy_status: YoutubePrivacyStatus;
  status: YoutubeUploadStatus;
  error_message?: string;
  external_video_id?: string;
  created_at: string;
}

export interface CreateYoutubeUploadPayload {
  title: string;
  description: string;
  privacy_status: YoutubePrivacyStatus;
  video: File;
}
