import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Checkbox,
  Label,
  Badge,
  Switch,
} from '@evoapi/design-system';
import {
  Bot,
  Trash2,
  Settings,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import AgentBotsService from '@/services/channels/agentBotsService';
import { labelsService } from '@/services/contacts/labelsService';
import InboxesService from '@/services/channels/inboxesService';
import { Label as LabelType } from '@/types/settings';
import { AgentBot, isBotConnectedToInbox, getBotStatusColor } from './helpers/agentBotHelpers';
import { AgentBotInboxConfiguration, FacebookPost } from '@/types';

interface AgentBotConfigurationFormProps {
  inboxId: string;
  onUpdate?: (success: boolean) => void;
}

export default function AgentBotConfigurationForm({
  inboxId,
  onUpdate,
}: AgentBotConfigurationFormProps) {
  const { t } = useLanguage('channels');
  const [agentBots, setAgentBots] = useState<AgentBot[]>([]);
  const [selectedAgentBotId, setSelectedAgentBotId] = useState<string | null>(null);
  const [activeAgentBot, setActiveAgentBot] = useState<AgentBot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Configuration state - default to pending only
  const [allowedConversationStatuses, setAllowedConversationStatuses] = useState<string[]>([
    'pending',
  ]);
  const [allowedLabelIds, setAllowedLabelIds] = useState<string[]>([]);
  const [ignoredLabelIds, setIgnoredLabelIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<Array<{ id: string; title: string; color: string }>>([]);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [labelSelectValue, setLabelSelectValue] = useState<string>('');
  const [ignoredLabelSelectValue, setIgnoredLabelSelectValue] = useState<string>('');

  // Facebook-specific configuration
  const [facebookCommentRepliesEnabled, setFacebookCommentRepliesEnabled] =
    useState<boolean>(false);
  const [facebookCommentAgentBotId, setFacebookCommentAgentBotId] = useState<string | null>(null);
  const [facebookInteractionType, setFacebookInteractionType] = useState<
    'comments_only' | 'messages_only' | 'both'
  >('both');
  const [facebookAllowedPostIds, setFacebookAllowedPostIds] = useState<string[]>([]);
  const [postSelectionMode, setPostSelectionMode] = useState<'all' | 'specific'>('all');
  const [isFacebookInbox, setIsFacebookInbox] = useState<boolean>(false);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);

  // Moderation configuration
  const [moderationEnabled, setModerationEnabled] = useState<boolean>(false);
  const [explicitWordsFilter, setExplicitWordsFilter] = useState<string[]>([]);
  const [explicitWordsInput, setExplicitWordsInput] = useState<string>('');
  const [sentimentAnalysisEnabled, setSentimentAnalysisEnabled] = useState<boolean>(false);
  const [autoApproveResponses, setAutoApproveResponses] = useState<boolean>(false);
  const [autoRejectExplicitWords, setAutoRejectExplicitWords] = useState<boolean>(false);
  const [autoRejectOffensiveSentiment, setAutoRejectOffensiveSentiment] = useState<boolean>(false);
  const [showModerationConfig, setShowModerationConfig] = useState<boolean>(false);

  // Conversation status options
  const conversationStatusOptions = [
    { value: 'open', label: t('settings.agentBotConfiguration.statusOptions.open') },
    { value: 'resolved', label: t('settings.agentBotConfiguration.statusOptions.resolved') },
    { value: 'pending', label: t('settings.agentBotConfiguration.statusOptions.pending') },
    { value: 'snoozed', label: t('settings.agentBotConfiguration.statusOptions.snoozed') },
  ];

  // Load agent bots and current configuration
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load inbox to check channel type
      const inboxResponse = await InboxesService.getById(inboxId);
      const isFacebook = inboxResponse?.data?.channel_type === 'Channel::FacebookPage';
      setIsFacebookInbox(isFacebook);

      // Load all agent bots, current bot, configuration, and labels
      const [bots, currentBot, configuration, labelsData] = await Promise.all([
        AgentBotsService.getAll(),
        AgentBotsService.getInboxAgentBot(inboxId),
        AgentBotsService.getInboxAgentBotConfiguration(inboxId),
        labelsService.getLabels(),
      ]);

      setAgentBots(bots);
      setActiveAgentBot(currentBot);
      setSelectedAgentBotId(currentBot?.id || null);

      // Set configuration - always use saved configuration if it exists
      if (configuration) {
        // Use saved configuration, default to ['pending'] if statuses array is empty
        setAllowedConversationStatuses(
          configuration.allowed_conversation_statuses &&
            configuration.allowed_conversation_statuses.length > 0
            ? configuration.allowed_conversation_statuses
            : ['pending'],
        );
        setAllowedLabelIds(configuration.allowed_label_ids || []);
        setIgnoredLabelIds(configuration.ignored_label_ids || []);

        // Moderation configuration (available for all channels)
        setModerationEnabled(configuration.moderation_enabled || false);
        setExplicitWordsFilter(configuration.explicit_words_filter || []);
        setExplicitWordsInput((configuration.explicit_words_filter || []).join('\n'));
        setSentimentAnalysisEnabled(configuration.sentiment_analysis_enabled || false);
        setAutoApproveResponses(configuration.auto_approve_responses || false);
        setAutoRejectExplicitWords(configuration.auto_reject_explicit_words || false);
        setAutoRejectOffensiveSentiment(configuration.auto_reject_offensive_sentiment || false);

        // Facebook-specific configuration
        if (isFacebook) {
          setFacebookCommentRepliesEnabled(configuration.facebook_comment_replies_enabled || false);
          setFacebookCommentAgentBotId(configuration.facebook_comment_agent_bot_id || null);
          setFacebookInteractionType(configuration.facebook_interaction_type || 'both');
          setFacebookAllowedPostIds(configuration.facebook_allowed_post_ids || []);
          setPostSelectionMode(
            configuration.facebook_allowed_post_ids &&
              configuration.facebook_allowed_post_ids.length > 0
              ? 'specific'
              : 'all',
          );
        }
      } else {
        // Default to pending if no configuration exists
        setAllowedConversationStatuses(['pending']);
        setAllowedLabelIds([]);
        setIgnoredLabelIds([]);

        // Default moderation configuration (available for all channels)
        setModerationEnabled(false);
        setExplicitWordsFilter([]);
        setExplicitWordsInput('');
        setSentimentAnalysisEnabled(false);
        setAutoApproveResponses(false);
        setAutoRejectExplicitWords(false);
        setAutoRejectOffensiveSentiment(false);

        if (isFacebook) {
          setFacebookCommentRepliesEnabled(false);
          setFacebookCommentAgentBotId(null);
          setFacebookInteractionType('both');
          setFacebookAllowedPostIds([]);
          setPostSelectionMode('all');
        }
      }

      // Set labels
      const labelsPayload = labelsData.data || [];
      setLabels(
        labelsPayload.map((label: LabelType) => ({
          id: label.id,
          title: label.title,
          color: label.color || '#1f93ff',
        })),
      );

      // Load Facebook posts if it's a Facebook inbox
      if (isFacebook) {
        // Set state first, then load posts
        setIsFacebookInbox(true);
        loadFacebookPosts();
      } else {
        setIsFacebookInbox(false);
      }
    } catch (error) {
      console.error('Error loading agent bot data:', error);
      toast.error(t('settings.agentBotConfiguration.errors.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Load Facebook posts
  const loadFacebookPosts = async () => {
    if (!inboxId) {
      return;
    }

    setIsLoadingPosts(true);
    try {
      const posts = await InboxesService.getFacebookPosts(inboxId, 50);
      setFacebookPosts(posts as FacebookPost[]);
    } catch (error) {
      console.error('Error loading Facebook posts:', error);
      toast.error(t('settings.agentBotConfiguration.errors.loadPostsError'));
      setFacebookPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Load data on mount and when inboxId changes
  useEffect(() => {
    if (inboxId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId]);

  // Handle bot assignment
  const handleUpdateAgentBot = async () => {
    if (!selectedAgentBotId) {
      toast.error(t('settings.agentBotConfiguration.validation.selectBot'));
      return;
    }

    setIsUpdating(true);
    try {
      const configuration: AgentBotInboxConfiguration = {
        allowed_conversation_statuses:
          allowedConversationStatuses.length > 0 ? allowedConversationStatuses : ['pending'],
        allowed_label_ids: allowedLabelIds,
        ignored_label_ids: ignoredLabelIds,
        facebook_comment_replies_enabled: isFacebookInbox
          ? facebookCommentRepliesEnabled
          : undefined,
        facebook_comment_agent_bot_id: isFacebookInbox ? facebookCommentAgentBotId : undefined,
        facebook_interaction_type: isFacebookInbox ? facebookInteractionType : undefined,
        // Always send facebook_allowed_post_ids for Facebook inboxes, empty array for "all posts"
        facebook_allowed_post_ids: isFacebookInbox
          ? postSelectionMode === 'specific'
            ? facebookAllowedPostIds
            : []
          : undefined,
        // Moderation configuration (available for all channels)
        moderation_enabled: moderationEnabled,
        explicit_words_filter: explicitWordsFilter,
        sentiment_analysis_enabled: sentimentAnalysisEnabled,
        auto_approve_responses: autoApproveResponses,
        auto_reject_explicit_words: autoRejectExplicitWords,
        auto_reject_offensive_sentiment: autoRejectOffensiveSentiment,
      };

      await AgentBotsService.setInboxAgentBot(inboxId, selectedAgentBotId, configuration);

      // Update local state
      const newActiveBot = agentBots.find(bot => bot.id === selectedAgentBotId) || null;
      setActiveAgentBot(newActiveBot);

      toast.success(t('settings.agentBotConfiguration.success.configured'));

      // Reload data to ensure state is synchronized
      await loadData();

      if (onUpdate) {
        onUpdate(true);
      }
    } catch (error) {
      console.error('Error updating agent bot:', error);
      toast.error(t('settings.agentBotConfiguration.errors.configureError'));

      if (onUpdate) {
        onUpdate(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle status toggle
  const handleStatusToggle = (status: string) => {
    setAllowedConversationStatuses(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      }
      return [...prev, status];
    });
  };

  // Handle label add
  const handleLabelAdd = (labelId: string) => {
    if (labelId && !allowedLabelIds.includes(labelId)) {
      setAllowedLabelIds(prev => [...prev, labelId]);
      // Reset select to allow selecting another label
      setLabelSelectValue('');
    }
  };

  // Handle label remove
  const handleLabelRemove = (labelId: string) => {
    setAllowedLabelIds(prev => prev.filter(id => id !== labelId));
  };

  // Handle ignored label add
  const handleIgnoredLabelAdd = (labelId: string) => {
    if (labelId && !ignoredLabelIds.includes(labelId)) {
      setIgnoredLabelIds(prev => [...prev, labelId]);
      // Reset select to allow selecting another label
      setIgnoredLabelSelectValue('');
    }
  };

  // Handle ignored label remove
  const handleIgnoredLabelRemove = (labelId: string) => {
    setIgnoredLabelIds(prev => prev.filter(id => id !== labelId));
  };

  // Handle post ID add
  const handlePostIdAdd = (postId: string) => {
    if (postId && !facebookAllowedPostIds.includes(postId)) {
      setFacebookAllowedPostIds(prev => [...prev, postId]);
    }
  };

  // Handle post ID remove
  const handlePostIdRemove = (postId: string) => {
    setFacebookAllowedPostIds(prev => prev.filter(id => id !== postId));
  };

  // Handle explicit words filter update
  const handleExplicitWordsInputChange = (value: string) => {
    setExplicitWordsInput(value);
    // Parse lines and filter empty strings
    const words = value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    setExplicitWordsFilter(words);
  };

  // Handle explicit word remove
  const handleExplicitWordRemove = (index: number) => {
    const newWords = explicitWordsFilter.filter((_, i) => i !== index);
    setExplicitWordsFilter(newWords);
    setExplicitWordsInput(newWords.join('\n'));
  };

  // Get available labels (not yet selected)
  const availableLabels = labels.filter(label => !allowedLabelIds.includes(label.id));

  // Get available labels for ignored (not yet selected and not in allowed)
  const availableIgnoredLabels = labels.filter(
    label => !ignoredLabelIds.includes(label.id) && !allowedLabelIds.includes(label.id),
  );

  // Get selected labels data
  const selectedLabelsData = labels.filter(label => allowedLabelIds.includes(label.id));

  // Get selected ignored labels data
  const selectedIgnoredLabelsData = labels.filter(label => ignoredLabelIds.includes(label.id));

  // Handle bot disconnection
  const handleDisconnectBot = async () => {
    setIsDisconnecting(true);
    try {
      await AgentBotsService.disconnectInboxBot(inboxId);

      // Update local state
      setActiveAgentBot(null);
      setSelectedAgentBotId(null);

      toast.success(t('settings.agentBotConfiguration.success.disconnected'));

      // Reload data to ensure state is synchronized
      await loadData();

      if (onUpdate) {
        onUpdate(true);
      }
    } catch (error) {
      console.error('Error disconnecting bot:', error);
      toast.error(t('settings.agentBotConfiguration.errors.disconnectError'));

      if (onUpdate) {
        onUpdate(false);
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = isBotConnectedToInbox(agentBots, activeAgentBot?.id);
  const hasSelectedBot = selectedAgentBotId !== null;
  const hasAvailableBots = agentBots.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  {t('settings.agentBotConfiguration.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.agentBotConfiguration.description')}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            {!isLoading && (
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-slate-500" />
                )}
                <span className={`text-sm font-medium ${getBotStatusColor(isConnected)}`}>
                  {isConnected
                    ? t('settings.agentBotConfiguration.status.connected')
                    : t('settings.agentBotConfiguration.status.disconnected')}
                </span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && (
            <div className="space-y-6 mt-6">
              {/* Current Bot Info */}
              {activeAgentBot && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {activeAgentBot.thumbnail ? (
                        <img
                          src={activeAgentBot.thumbnail}
                          alt={activeAgentBot.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium text-foreground">{activeAgentBot.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {activeAgentBot.description}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>
                            {t('settings.agentBotConfiguration.fields.provider')}:{' '}
                            {activeAgentBot.bot_provider}
                          </span>
                          <span>
                            {t('settings.agentBotConfiguration.fields.type')}:{' '}
                            {activeAgentBot.bot_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        {t('settings.agentBotConfiguration.status.active')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bot Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('settings.agentBotConfiguration.fields.selectBot')}
                  </label>

                  {hasAvailableBots ? (
                    <Select
                      value={selectedAgentBotId?.toString() || ''}
                      onValueChange={value => setSelectedAgentBotId(value ? value : null)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('settings.agentBotConfiguration.placeholders.selectBot')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {agentBots.map(bot => (
                          <SelectItem key={bot.id} value={bot.id.toString()}>
                            <div className="flex items-center gap-2">
                              {bot.thumbnail ? (
                                <img
                                  src={bot.thumbnail}
                                  alt={bot.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <Bot className="w-4 h-4 text-muted-foreground" />
                              )}
                              <div>
                                <div className="font-medium">{bot.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {bot.bot_provider}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h5 className="font-medium text-foreground mb-1">
                        {t('settings.agentBotConfiguration.noBots.title')}
                      </h5>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('settings.agentBotConfiguration.noBots.description')}
                      </p>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('settings.agentBotConfiguration.buttons.manageBots')}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {hasAvailableBots && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleUpdateAgentBot}
                      disabled={!hasSelectedBot || isUpdating}
                      className="min-w-32"
                    >
                      {isUpdating
                        ? t('settings.agentBotConfiguration.buttons.configuring')
                        : t('settings.agentBotConfiguration.buttons.configure')}
                    </Button>

                    {activeAgentBot && (
                      <Button
                        variant="destructive"
                        onClick={handleDisconnectBot}
                        disabled={isDisconnecting}
                        className="min-w-32"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDisconnecting
                          ? t('settings.agentBotConfiguration.buttons.disconnecting')
                          : t('settings.agentBotConfiguration.buttons.disconnect')}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Information Box */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-5 h-5 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h6 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('settings.agentBotConfiguration.info.title')}
                  </h6>
                  <div className="text-blue-600 dark:text-blue-400 space-y-1">
                    <p>• {t('settings.agentBotConfiguration.info.point1')}</p>
                    <p>• {t('settings.agentBotConfiguration.info.point2')}</p>
                    <p>• {t('settings.agentBotConfiguration.info.point3')}</p>
                    <p>• {t('settings.agentBotConfiguration.info.point4')}</p>
                  </div>
                </div>
              </div>

              {/* Advanced Configuration */}
              {activeAgentBot && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {t('settings.agentBotConfiguration.advanced.title')}
                      </span>
                    </div>
                    {showAdvancedConfig ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {showAdvancedConfig && (
                    <div className="space-y-6 pl-6">
                      {/* Conversation Status Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          {t('settings.agentBotConfiguration.advanced.conversationStatus.title')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            'settings.agentBotConfiguration.advanced.conversationStatus.description',
                          )}
                        </p>
                        <div className="space-y-2">
                          {conversationStatusOptions.map(status => (
                            <div key={status.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status.value}`}
                                checked={allowedConversationStatuses.includes(status.value)}
                                onCheckedChange={() => handleStatusToggle(status.value)}
                              />
                              <Label
                                htmlFor={`status-${status.value}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {status.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {allowedConversationStatuses.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            {t(
                              'settings.agentBotConfiguration.advanced.conversationStatus.emptyHint',
                            )}
                          </p>
                        )}
                      </div>

                      {/* Labels Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          {t('settings.agentBotConfiguration.advanced.labels.title')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.agentBotConfiguration.advanced.labels.description')}
                        </p>

                        {/* Selected Labels */}
                        <div className="flex flex-wrap gap-2">
                          {selectedLabelsData.map(label => (
                            <Badge
                              key={label.id}
                              variant="secondary"
                              className="flex items-center gap-1 px-2 py-1"
                              style={{
                                backgroundColor: label.color ? `${label.color}20` : undefined,
                                color: label.color,
                              }}
                            >
                              {label.title}
                              <button
                                onClick={() => handleLabelRemove(label.id)}
                                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                type="button"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}

                          {/* Add Label */}
                          {availableLabels.length > 0 && (
                            <Select value={labelSelectValue} onValueChange={handleLabelAdd}>
                              <SelectTrigger className="w-auto min-w-32">
                                <SelectValue
                                  placeholder={t(
                                    'settings.agentBotConfiguration.advanced.labels.addLabel',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableLabels.map(label => (
                                  <SelectItem key={label.id} value={label.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: label.color }}
                                      />
                                      {label.title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {labels.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            {t('settings.agentBotConfiguration.advanced.labels.noLabels')}
                          </p>
                        )}

                        {allowedLabelIds.length === 0 && labels.length > 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            {t('settings.agentBotConfiguration.advanced.labels.emptyHint')}
                          </p>
                        )}
                      </div>

                      {/* Ignored Labels Selection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          {t('settings.agentBotConfiguration.advanced.ignoredLabels.title')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('settings.agentBotConfiguration.advanced.ignoredLabels.description')}
                        </p>

                        {/* Selected Ignored Labels */}
                        <div className="flex flex-wrap gap-2">
                          {selectedIgnoredLabelsData.map(label => (
                            <Badge
                              key={label.id}
                              variant="destructive"
                              className="flex items-center gap-1 px-2 py-1"
                              style={{
                                backgroundColor: label.color ? `${label.color}20` : undefined,
                                color: label.color,
                              }}
                            >
                              {label.title}
                              <button
                                onClick={() => handleIgnoredLabelRemove(label.id)}
                                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                type="button"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}

                          {/* Add Ignored Label */}
                          {availableIgnoredLabels.length > 0 && (
                            <Select
                              value={ignoredLabelSelectValue}
                              onValueChange={handleIgnoredLabelAdd}
                            >
                              <SelectTrigger className="w-auto min-w-32">
                                <SelectValue
                                  placeholder={t(
                                    'settings.agentBotConfiguration.advanced.ignoredLabels.addLabel',
                                  )}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableIgnoredLabels.map(label => (
                                  <SelectItem key={label.id} value={label.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: label.color }}
                                      />
                                      {label.title}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {availableIgnoredLabels.length === 0 && labels.length > 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            {t(
                              'settings.agentBotConfiguration.advanced.ignoredLabels.noAvailableLabels',
                            )}
                          </p>
                        )}
                      </div>

                      {/* Facebook Messenger Configuration */}
                      {isFacebookInbox && (
                        <div className="space-y-4 pt-4 border-t border-border">
                          <div>
                            <Label className="text-sm font-medium text-foreground">
                              {t('settings.agentBotConfiguration.advanced.facebookMessenger.title')}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t(
                                'settings.agentBotConfiguration.advanced.facebookMessenger.description',
                              )}
                            </p>
                          </div>

                          {/* Interaction Type Selection */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-foreground">
                              {t(
                                'settings.agentBotConfiguration.advanced.facebookMessenger.interactionType',
                              )}
                            </Label>
                            <Select
                              value={facebookInteractionType}
                              onValueChange={(
                                value: 'comments_only' | 'messages_only' | 'both',
                              ) => {
                                setFacebookInteractionType(value);
                                // Auto-enable comment replies if comments are selected
                                if (value === 'comments_only' || value === 'both') {
                                  setFacebookCommentRepliesEnabled(true);
                                } else {
                                  setFacebookCommentRepliesEnabled(false);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="both">
                                  {t(
                                    'settings.agentBotConfiguration.advanced.facebookMessenger.interactionTypes.both',
                                  )}
                                </SelectItem>
                                <SelectItem value="comments_only">
                                  {t(
                                    'settings.agentBotConfiguration.advanced.facebookMessenger.interactionTypes.commentsOnly',
                                  )}
                                </SelectItem>
                                <SelectItem value="messages_only">
                                  {t(
                                    'settings.agentBotConfiguration.advanced.facebookMessenger.interactionTypes.messagesOnly',
                                  )}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Comment Replies Configuration (only if comments are enabled) */}
                          {(facebookInteractionType === 'comments_only' ||
                            facebookInteractionType === 'both') && (
                            <div className="space-y-4 pl-6 border-l-2 border-border">
                              {/* Enable Comment Replies Toggle */}
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <Label
                                    htmlFor="facebook-comment-replies"
                                    className="text-sm font-medium text-foreground cursor-pointer"
                                  >
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.enableCommentReplies',
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.enableCommentRepliesDescription',
                                    )}
                                  </p>
                                </div>
                                <Switch
                                  id="facebook-comment-replies"
                                  checked={facebookCommentRepliesEnabled}
                                  onCheckedChange={setFacebookCommentRepliesEnabled}
                                />
                              </div>

                              {/* Comment Agent Bot Selection */}
                              {facebookCommentRepliesEnabled && (
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.commentAgentBot',
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.commentAgentBotDescription',
                                    )}
                                  </p>
                                  <Select
                                    value={facebookCommentAgentBotId || 'same'}
                                    onValueChange={value => {
                                      setFacebookCommentAgentBotId(value === 'same' ? null : value);
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue
                                        placeholder={t(
                                          'settings.agentBotConfiguration.advanced.facebookMessenger.useSameAgent',
                                        )}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="same">
                                        {t(
                                          'settings.agentBotConfiguration.advanced.facebookMessenger.useSameAgent',
                                        )}
                                      </SelectItem>
                                      {agentBots
                                        .filter(bot => bot.id !== selectedAgentBotId)
                                        .map(bot => (
                                          <SelectItem key={bot.id} value={bot.id}>
                                            <div className="flex items-center gap-2">
                                              {bot.thumbnail ? (
                                                <img
                                                  src={bot.thumbnail}
                                                  alt={bot.name}
                                                  className="w-6 h-6 rounded-full object-cover"
                                                />
                                              ) : (
                                                <Bot className="w-4 h-4 text-muted-foreground" />
                                              )}
                                              <div>
                                                <div className="font-medium">{bot.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {bot.bot_provider}
                                                </div>
                                              </div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {agentBots.filter(bot => bot.id !== selectedAgentBotId).length ===
                                    0 && (
                                    <p className="text-xs text-muted-foreground italic">
                                      {t(
                                        'settings.agentBotConfiguration.advanced.facebookMessenger.noOtherBots',
                                      )}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Post Selection (only if comment replies are enabled) */}
                              {facebookCommentRepliesEnabled && (
                                <div className="space-y-3 pt-2 border-t border-border">
                                  <Label className="text-sm font-medium text-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.postSelection',
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.facebookMessenger.postSelectionDescription',
                                    )}
                                  </p>

                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id="all-posts"
                                        name="post-selection"
                                        checked={postSelectionMode === 'all'}
                                        onChange={() => {
                                          setPostSelectionMode('all');
                                          setFacebookAllowedPostIds([]);
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <Label
                                        htmlFor="all-posts"
                                        className="text-sm font-normal cursor-pointer"
                                      >
                                        {t(
                                          'settings.agentBotConfiguration.advanced.facebookMessenger.allPosts',
                                        )}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id="specific-posts"
                                        name="post-selection"
                                        checked={postSelectionMode === 'specific'}
                                        onChange={() => setPostSelectionMode('specific')}
                                        className="w-4 h-4"
                                      />
                                      <Label
                                        htmlFor="specific-posts"
                                        className="text-sm font-normal cursor-pointer"
                                      >
                                        {t(
                                          'settings.agentBotConfiguration.advanced.facebookMessenger.specificPosts',
                                        )}
                                      </Label>
                                    </div>
                                  </div>

                                  {/* Post Selection List (only if specific posts selected) */}
                                  {postSelectionMode === 'specific' && (
                                    <div className="space-y-3 pl-6">
                                      {isLoadingPosts ? (
                                        <div className="space-y-2">
                                          <Skeleton className="h-16 w-full" />
                                          <Skeleton className="h-16 w-full" />
                                          <Skeleton className="h-16 w-full" />
                                        </div>
                                      ) : facebookPosts.length > 0 ? (
                                        <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-md p-2">
                                          {facebookPosts.map(post => {
                                            const isSelected = facebookAllowedPostIds.includes(
                                              post.id,
                                            );
                                            return (
                                              <div
                                                key={post.id}
                                                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                                  isSelected
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'bg-background border-border hover:bg-muted/50'
                                                }`}
                                                onClick={() => {
                                                  if (isSelected) {
                                                    handlePostIdRemove(post.id);
                                                  } else {
                                                    handlePostIdAdd(post.id);
                                                  }
                                                }}
                                              >
                                                <Checkbox
                                                  checked={isSelected}
                                                  onCheckedChange={() => {
                                                    if (isSelected) {
                                                      handlePostIdRemove(post.id);
                                                    } else {
                                                      handlePostIdAdd(post.id);
                                                    }
                                                  }}
                                                  className="mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-xs font-mono text-muted-foreground truncate">
                                                      {post.id}
                                                    </span>
                                                    {post.permalink_url && (
                                                      <a
                                                        href={post.permalink_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-xs text-primary hover:underline"
                                                      >
                                                        {t(
                                                          'settings.agentBotConfiguration.advanced.facebookMessenger.viewOnFacebook',
                                                        )}
                                                      </a>
                                                    )}
                                                  </div>
                                                  {post.message && (
                                                    <p className="text-sm text-foreground line-clamp-2">
                                                      {post.message}
                                                    </p>
                                                  )}
                                                  {post.created_time && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      {new Date(
                                                        post.created_time,
                                                      ).toLocaleDateString()}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                          {t(
                                            'settings.agentBotConfiguration.advanced.facebookMessenger.noPostsFound',
                                          )}
                                        </div>
                                      )}

                                      {/* Selected Posts Summary */}
                                      {facebookAllowedPostIds.length > 0 && (
                                        <div className="space-y-2">
                                          <Label className="text-xs font-medium text-foreground">
                                            {t(
                                              'settings.agentBotConfiguration.advanced.facebookMessenger.selectedPosts',
                                            )}{' '}
                                            ({facebookAllowedPostIds.length})
                                          </Label>
                                          <div className="flex flex-wrap gap-2">
                                            {facebookAllowedPostIds.map(postId => (
                                              <Badge
                                                key={postId}
                                                variant="secondary"
                                                className="flex items-center gap-1 px-2 py-1"
                                              >
                                                {postId}
                                                <button
                                                  onClick={() => handlePostIdRemove(postId)}
                                                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                                  type="button"
                                                >
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Moderation Configuration */}
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-foreground">
                              {t('settings.agentBotConfiguration.advanced.moderation.title')}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('settings.agentBotConfiguration.advanced.moderation.description')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowModerationConfig(!showModerationConfig)}
                            className="p-1 hover:bg-muted rounded-md transition-colors"
                          >
                            {showModerationConfig ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        {showModerationConfig && (
                          <div className="space-y-4 pl-6 border-l-2 border-border">
                            {/* Enable Moderation Toggle */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <Label
                                  htmlFor="moderation-enabled"
                                  className="text-sm font-medium text-foreground cursor-pointer"
                                >
                                  {t(
                                    'settings.agentBotConfiguration.advanced.moderation.enableModeration',
                                  )}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t(
                                    'settings.agentBotConfiguration.advanced.moderation.enableModerationDescription',
                                  )}
                                </p>
                              </div>
                              <Switch
                                id="moderation-enabled"
                                checked={moderationEnabled}
                                onCheckedChange={setModerationEnabled}
                              />
                            </div>

                            {moderationEnabled && (
                              <div className="space-y-4">
                                {/* Explicit Words Filter */}
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.moderation.explicitWords.title',
                                    )}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t(
                                      'settings.agentBotConfiguration.advanced.moderation.explicitWords.description',
                                    )}
                                  </p>
                                  <textarea
                                    value={explicitWordsInput}
                                    onChange={e => handleExplicitWordsInputChange(e.target.value)}
                                    placeholder={t(
                                      'settings.agentBotConfiguration.advanced.moderation.explicitWords.placeholder',
                                    )}
                                    className="w-full min-h-24 p-2 text-sm border border-border rounded-md bg-background text-foreground resize-y"
                                  />
                                  {explicitWordsFilter.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {explicitWordsFilter.map((word, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="flex items-center gap-1 px-2 py-1"
                                        >
                                          {word}
                                          <button
                                            onClick={() => handleExplicitWordRemove(index)}
                                            className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                                            type="button"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Sentiment Analysis Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="sentiment-analysis"
                                      className="text-sm font-medium text-foreground cursor-pointer"
                                    >
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.sentimentAnalysis.title',
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.sentimentAnalysis.description',
                                      )}
                                    </p>
                                  </div>
                                  <Switch
                                    id="sentiment-analysis"
                                    checked={sentimentAnalysisEnabled}
                                    onCheckedChange={setSentimentAnalysisEnabled}
                                  />
                                </div>

                                {/* Auto Approve Responses Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="auto-approve-responses"
                                      className="text-sm font-medium text-foreground cursor-pointer"
                                    >
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoApproveResponses.title',
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoApproveResponses.description',
                                      )}
                                    </p>
                                  </div>
                                  <Switch
                                    id="auto-approve-responses"
                                    checked={autoApproveResponses}
                                    onCheckedChange={setAutoApproveResponses}
                                  />
                                </div>

                                {/* Auto Reject Explicit Words Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="auto-reject-explicit-words"
                                      className="text-sm font-medium text-foreground cursor-pointer"
                                    >
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoRejectExplicitWords.title',
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoRejectExplicitWords.description',
                                      )}
                                    </p>
                                  </div>
                                  <Switch
                                    id="auto-reject-explicit-words"
                                    checked={autoRejectExplicitWords}
                                    onCheckedChange={setAutoRejectExplicitWords}
                                  />
                                </div>

                                {/* Auto Reject Offensive Sentiment Toggle */}
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <Label
                                      htmlFor="auto-reject-offensive-sentiment"
                                      className="text-sm font-medium text-foreground cursor-pointer"
                                    >
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoRejectOffensiveSentiment.title',
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {t(
                                        'settings.agentBotConfiguration.advanced.moderation.autoRejectOffensiveSentiment.description',
                                      )}
                                    </p>
                                  </div>
                                  <Switch
                                    id="auto-reject-offensive-sentiment"
                                    checked={autoRejectOffensiveSentiment}
                                    onCheckedChange={setAutoRejectOffensiveSentiment}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
