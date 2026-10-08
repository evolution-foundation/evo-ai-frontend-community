import api from '@/services/core/api';
import { AgentBot } from '@/components/channels/settings/helpers/agentBotHelpers';
import type {
  AgentBotsResponse,
  AgentBotResponse,
  ChannelAccessTokenResponse,
  AgentBotInboxConfiguration,
  AgentBotInboxBinding,
  AgentBotInboxStatus,
  InboxAgentBotResponse,
} from '@/types/channels/inbox';

const AgentBotsService = {
  // Get all agent bots
  async getAll(params?: { per_page?: number }): Promise<AgentBot[]> {
    try {
      const { data } = await api.get<AgentBotsResponse>(`/agent_bots`, { params });

      let result = data.data || data;
      if (!Array.isArray(result)) {
        result = [];
      }

      return result;
    } catch (error) {
      console.error('AgentBotsService.getAll error:', error);
      return [];
    }
  },

  // Get single agent bot
  async getById(botId: string): Promise<AgentBot | null> {
    try {
      const { data } = await api.get<AgentBotResponse>(`/agent_bots/${botId}`);

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.getById error:', error);
      return null;
    }
  },

  // Create new agent bot
  async create(formData: FormData): Promise<(AgentBot & { access_token?: string }) | null> {
    try {
      const { data } = await api.post<AgentBotResponse & ChannelAccessTokenResponse>(
        `/agent_bots`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.create error:', error);
      throw error;
    }
  },

  // Update agent bot
  async update(botId: string, formData: FormData): Promise<AgentBot | null> {
    try {
      const { data } = await api.patch<AgentBotResponse>(`/agent_bots/${botId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return data.data || data;
    } catch (error) {
      console.error('AgentBotsService.update error:', error);
      throw error;
    }
  },

  // Delete agent bot
  async delete(botId: string): Promise<boolean> {
    try {
      await api.delete(`/agent_bots/${botId}`);
      return true;
    } catch (error) {
      console.error('AgentBotsService.delete error:', error);
      throw error;
    }
  },

  // Delete agent bot avatar
  async deleteAvatar(botId: string): Promise<boolean> {
    try {
      await api.delete(`/agent_bots/${botId}/avatar`);
      return true;
    } catch (error) {
      console.error('AgentBotsService.deleteAvatar error:', error);
      throw error;
    }
  },

  // Reset access token
  async resetAccessToken(botId: string): Promise<string | null> {
    try {
      const { data } = await api.post<ChannelAccessTokenResponse>(
        `/agent_bots/${botId}/reset_access_token`,
      );

      return data.access_token;
    } catch (error) {
      console.error('AgentBotsService.resetAccessToken error:', error);
      throw error;
    }
  },

  // Get agent bot for inbox
  async getInboxAgentBot(inboxId: string): Promise<AgentBot | null> {
    try {
      const response = await api.get<InboxAgentBotResponse>(`/inboxes/${inboxId}/agent_bot`);

      const data = response.data || response;

      // Handle different response structures: { agent_bot: {...} } or { data: { agent_bot: {...} } }
      const agentBot = data.agent_bot || data.data?.agent_bot;

      return agentBot || null;
    } catch (error) {
      console.error('AgentBotsService.getInboxAgentBot error:', error);
      return null;
    }
  },

  // Get inbox agent bot configuration
  async getInboxAgentBotConfiguration(inboxId: string): Promise<AgentBotInboxConfiguration | null> {
    try {
      const response = await api.get<InboxAgentBotResponse>(`/inboxes/${inboxId}/agent_bot`);

      const data = response.data || response;
      const configuration = data.configuration || data.data?.configuration;

      // Return configuration if it exists (even if arrays are empty)
      if (configuration) {
        return {
          allowed_conversation_statuses: configuration.allowed_conversation_statuses || [],
          allowed_label_ids: configuration.allowed_label_ids || [],
          ignored_label_ids: configuration.ignored_label_ids || [],
          facebook_comment_replies_enabled: configuration.facebook_comment_replies_enabled || false,
          facebook_comment_agent_bot_id: configuration.facebook_comment_agent_bot_id || null,
          facebook_interaction_type: configuration.facebook_interaction_type || 'both',
          facebook_allowed_post_ids: configuration.facebook_allowed_post_ids || [],
          moderation_enabled: configuration.moderation_enabled || false,
          explicit_words_filter: configuration.explicit_words_filter || [],
          sentiment_analysis_enabled: configuration.sentiment_analysis_enabled || false,
          auto_approve_responses: configuration.auto_approve_responses || false,
          auto_reject_explicit_words: configuration.auto_reject_explicit_words || false,
          auto_reject_offensive_sentiment: configuration.auto_reject_offensive_sentiment || false,
        };
      }

      return null;
    } catch (error) {
      console.error('AgentBotsService.getInboxAgentBotConfiguration error:', error);
      return null;
    }
  },

  // Set agent bot for inbox with configuration
  async setInboxAgentBot(
    inboxId: string,
    botId: string | null,
    configuration?: AgentBotInboxConfiguration,
  ): Promise<boolean> {
    try {
      const payload: {
        agent_bot: string | null;
        agent_bot_config?: {
          allowed_conversation_statuses: string[];
          allowed_label_ids: string[];
          ignored_label_ids?: string[];
          facebook_comment_replies_enabled?: boolean;
          facebook_comment_agent_bot_id?: string | null;
          facebook_interaction_type?: 'comments_only' | 'messages_only' | 'both';
          facebook_allowed_post_ids?: string[];
          moderation_enabled?: boolean;
          explicit_words_filter?: string[];
          sentiment_analysis_enabled?: boolean;
          auto_approve_responses?: boolean;
          auto_reject_explicit_words?: boolean;
          auto_reject_offensive_sentiment?: boolean;
        };
      } = {
        agent_bot: botId,
      };

      if (configuration) {
        payload.agent_bot_config = {
          allowed_conversation_statuses: configuration.allowed_conversation_statuses || [],
          allowed_label_ids: configuration.allowed_label_ids || [],
          ignored_label_ids: configuration.ignored_label_ids || [],
        };

        // Include Facebook-specific configuration if provided
        if (configuration.facebook_comment_replies_enabled !== undefined) {
          payload.agent_bot_config.facebook_comment_replies_enabled =
            configuration.facebook_comment_replies_enabled;
        }
        if (configuration.facebook_comment_agent_bot_id !== undefined) {
          payload.agent_bot_config.facebook_comment_agent_bot_id =
            configuration.facebook_comment_agent_bot_id;
        }
        if (configuration.facebook_interaction_type !== undefined) {
          payload.agent_bot_config.facebook_interaction_type =
            configuration.facebook_interaction_type;
        }
        if (configuration.facebook_allowed_post_ids !== undefined) {
          payload.agent_bot_config.facebook_allowed_post_ids =
            configuration.facebook_allowed_post_ids;
        }
        if (configuration.moderation_enabled !== undefined) {
          payload.agent_bot_config.moderation_enabled = configuration.moderation_enabled;
        }
        if (configuration.explicit_words_filter !== undefined) {
          payload.agent_bot_config.explicit_words_filter = configuration.explicit_words_filter;
        }
        if (configuration.sentiment_analysis_enabled !== undefined) {
          payload.agent_bot_config.sentiment_analysis_enabled =
            configuration.sentiment_analysis_enabled;
        }
        if (configuration.auto_approve_responses !== undefined) {
          payload.agent_bot_config.auto_approve_responses = configuration.auto_approve_responses;
        }
        if (configuration.auto_reject_explicit_words !== undefined) {
          payload.agent_bot_config.auto_reject_explicit_words =
            configuration.auto_reject_explicit_words;
        }
        if (configuration.auto_reject_offensive_sentiment !== undefined) {
          payload.agent_bot_config.auto_reject_offensive_sentiment =
            configuration.auto_reject_offensive_sentiment;
        }
      }

      await api.post(`/inboxes/${inboxId}/set_agent_bot`, payload);

      return true;
    } catch (error) {
      console.error('AgentBotsService.setInboxAgentBot error:', error);
      throw error;
    }
  },

  // Channels bound to an agent bot, active and inactive (CRM-41)
  async listBotInboxes(botId: string): Promise<AgentBotInboxBinding[]> {
    const { data } = await api.get<{ data: AgentBotInboxBinding[] }>(
      `/agent_bots/${botId}/inboxes`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  // Binds the inbox to `botId` on the backend defaults. `expectedBotId` is the agent
  // the caller saw on the channel (null = none): the backend answers 409 if the
  // channel has meanwhile changed hands, so a transfer never goes unconfirmed.
  async linkInboxBot(inboxId: string, botId: string, expectedBotId: string | null): Promise<void> {
    await api.post(`/inboxes/${inboxId}/set_agent_bot`, {
      agent_bot: botId,
      expected_agent_bot_id: expectedBotId,
    });
  },

  // Edits the inbox's binding in place: unlinking is `status: 'inactive'`, which
  // keeps the configuration for a later reactivation. `botId` makes the backend
  // answer 409 if the channel has meanwhile moved to another agent.
  async updateInboxBinding(
    inboxId: string,
    botId: string,
    changes: { status?: AgentBotInboxStatus; configuration?: AgentBotInboxConfiguration },
  ): Promise<AgentBotInboxBinding> {
    const { data } = await api.patch<{ data: AgentBotInboxBinding }>(
      `/inboxes/${inboxId}/agent_bot_inbox`,
      {
        agent_bot_id: botId,
        ...(changes.status ? { status: changes.status } : {}),
        ...(changes.configuration ? { agent_bot_config: changes.configuration } : {}),
      },
    );
    return data.data;
  },
};

export default AgentBotsService;
