import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  SocialChannelOption,
  SocialChannelType,
  InstagramAccountInfo,
  InstagramMedia,
  InstagramComment,
  Publication,
  CreatePublicationPayload,
  CarouselBatch,
  CreateCarouselBatchPayload,
  ScheduledPostItem,
  CreateScheduledPostPayload,
  WhatsappStatusChannelOption,
  CreateWhatsappStatusPayload,
  YoutubeUploadItem,
  CreateYoutubeUploadPayload,
} from '@/types/marketing/gestorPosts';

class GestorPostsService {
  private readonly baseUrl = '/gestor_posts';

  async getChannels(): Promise<SocialChannelOption[]> {
    const response = await api.get(`${this.baseUrl}/channels`);
    return extractData<SocialChannelOption[]>(response);
  }

  async getAccountInfo(channel?: SocialChannelOption): Promise<InstagramAccountInfo> {
    const response = await api.get(`${this.baseUrl}/gallery/account_info`, { params: channelParams(channel) });
    return extractData<InstagramAccountInfo>(response);
  }

  async getMedia(channel?: SocialChannelOption, limit = 25): Promise<InstagramMedia[]> {
    const response = await api.get(`${this.baseUrl}/gallery/media`, { params: { ...channelParams(channel), limit } });
    return extractData<InstagramMedia[]>(response);
  }

  async getComments(postId: string, channel?: SocialChannelOption): Promise<InstagramComment[]> {
    const response = await api.get(`${this.baseUrl}/comments`, { params: { ...channelParams(channel), post_id: postId } });
    return extractData<InstagramComment[]>(response);
  }

  async replyComment(commentId: string, text: string, channel?: SocialChannelOption): Promise<unknown> {
    const response = await api.post(`${this.baseUrl}/comments/reply`, { ...channelParams(channel), comment_id: commentId, text });
    return extractData<unknown>(response);
  }

  async getPublications(): Promise<Publication[]> {
    const response = await api.get(`${this.baseUrl}/publications`);
    return extractData<Publication[]>(response);
  }

  async getPublication(id: string): Promise<Publication> {
    const response = await api.get(`${this.baseUrl}/publications/${id}`);
    return extractData<Publication>(response);
  }

  async createPublication(payload: CreatePublicationPayload): Promise<{ id: string; status: string }> {
    const formData = new FormData();
    formData.append('caption', payload.caption);
    formData.append('content_type', payload.content_type);
    formData.append('channel_type', payload.channel_type);
    formData.append('channel_id', payload.channel_id);
    payload.platforms.forEach((p) => formData.append('platforms[]', p));
    formData.append('media', payload.media);

    const response = await api.post(`${this.baseUrl}/publications`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<{ id: string; status: string }>(response);
  }

  async createCarouselBatch(payload: CreateCarouselBatchPayload): Promise<CarouselBatch> {
    const response = await api.post(`${this.baseUrl}/carousel_uploads`, payload);
    return extractData<CarouselBatch>(response);
  }

  async getCarouselBatch(id: string): Promise<CarouselBatch> {
    const response = await api.get(`${this.baseUrl}/carousel_uploads/${id}`);
    return extractData<CarouselBatch>(response);
  }

  async addCarouselCard(batchId: string, media: File): Promise<CarouselBatch> {
    const formData = new FormData();
    formData.append('media', media);
    const response = await api.post(`${this.baseUrl}/carousel_uploads/${batchId}/cards`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<CarouselBatch>(response);
  }

  async getScheduledPosts(): Promise<ScheduledPostItem[]> {
    const response = await api.get(`${this.baseUrl}/scheduled_posts`);
    return extractData<ScheduledPostItem[]>(response);
  }

  async createScheduledPost(payload: CreateScheduledPostPayload): Promise<ScheduledPostItem> {
    const formData = new FormData();
    formData.append('caption', payload.caption);
    formData.append('content_type', payload.content_type);
    formData.append('channel_type', payload.channel_type);
    formData.append('channel_id', payload.channel_id);
    formData.append('scheduled_for', payload.scheduled_for);
    payload.platforms.forEach((p) => formData.append('platforms[]', p));
    formData.append('media', payload.media);

    const response = await api.post(`${this.baseUrl}/scheduled_posts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<ScheduledPostItem>(response);
  }

  async cancelScheduledPost(id: string): Promise<ScheduledPostItem> {
    const response = await api.post(`${this.baseUrl}/scheduled_posts/${id}/cancel`);
    return extractData<ScheduledPostItem>(response);
  }

  async retryScheduledPost(id: string): Promise<ScheduledPostItem> {
    const response = await api.post(`${this.baseUrl}/scheduled_posts/${id}/retry`);
    return extractData<ScheduledPostItem>(response);
  }

  async getWhatsappStatusChannels(): Promise<WhatsappStatusChannelOption[]> {
    const response = await api.get(`${this.baseUrl}/whatsapp_status/channels`);
    return extractData<WhatsappStatusChannelOption[]>(response);
  }

  async createWhatsappStatus(payload: CreateWhatsappStatusPayload): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('channel_id', payload.channel_id);
    formData.append('type', payload.type);
    if (payload.content) formData.append('content', payload.content);
    if (payload.media) formData.append('media', payload.media);
    if (payload.caption) formData.append('caption', payload.caption);

    const response = await api.post(`${this.baseUrl}/whatsapp_status`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<{ id: string }>(response);
  }

  async getYoutubeConnected(): Promise<boolean> {
    const response = await api.get(`${this.baseUrl}/youtube/connected`);
    return extractData<{ connected: boolean }>(response).connected;
  }

  async createYoutubeUpload(payload: CreateYoutubeUploadPayload): Promise<YoutubeUploadItem> {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('privacy_status', payload.privacy_status);
    formData.append('video', payload.video);

    const response = await api.post(`${this.baseUrl}/youtube`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<YoutubeUploadItem>(response);
  }

  async getYoutubeUpload(id: string): Promise<YoutubeUploadItem> {
    const response = await api.get(`${this.baseUrl}/youtube/${id}`);
    return extractData<YoutubeUploadItem>(response);
  }
}

function channelParams(channel?: SocialChannelOption): { channel_type?: SocialChannelType; channel_id?: string } {
  if (!channel) return {};
  return { channel_type: channel.channel_type, channel_id: channel.channel_id };
}

export const gestorPostsService = new GestorPostsService();
