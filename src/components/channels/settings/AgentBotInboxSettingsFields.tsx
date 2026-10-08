import { useEffect, useState } from 'react';
import {
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
import { Bot, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import InboxesService from '@/services/channels/inboxesService';
import { AgentBot } from './helpers/agentBotHelpers';
import { AgentBotInboxConfiguration, FacebookPost } from '@/types';

export interface AgentBotInboxLabelOption {
  id: string;
  title: string;
  color: string;
}

interface AgentBotInboxSettingsFieldsProps {
  inboxId: string;
  /** Keeps element ids unique when several bindings render on one page. */
  idPrefix: string;
  agentBotId: string;
  isFacebookInbox: boolean;
  agentBots: AgentBot[];
  labels: AgentBotInboxLabelOption[];
  value: AgentBotInboxConfiguration;
  onChange: (value: AgentBotInboxConfiguration) => void;
}

/** Per-binding settings of an agent on a channel, saved to its agent_bot_inbox. */
export default function AgentBotInboxSettingsFields({
  inboxId,
  idPrefix,
  agentBotId,
  isFacebookInbox,
  agentBots,
  labels,
  value,
  onChange,
}: AgentBotInboxSettingsFieldsProps) {
  const { t } = useLanguage('channels');

  const allowedConversationStatuses = value.allowed_conversation_statuses || [];
  const allowedLabelIds = value.allowed_label_ids || [];
  const ignoredLabelIds = value.ignored_label_ids || [];
  const facebookCommentRepliesEnabled = value.facebook_comment_replies_enabled || false;
  const facebookCommentAgentBotId = value.facebook_comment_agent_bot_id || null;
  const facebookInteractionType = value.facebook_interaction_type || 'both';
  const facebookAllowedPostIds = value.facebook_allowed_post_ids || [];
  const moderationEnabled = value.moderation_enabled || false;
  const explicitWordsFilter = value.explicit_words_filter || [];

  const [labelSelectValue, setLabelSelectValue] = useState<string>('');
  const [ignoredLabelSelectValue, setIgnoredLabelSelectValue] = useState<string>('');
  const [postSelectionMode, setPostSelectionMode] = useState<'all' | 'specific'>(
    facebookAllowedPostIds.length > 0 ? 'specific' : 'all',
  );
  const [explicitWordsInput, setExplicitWordsInput] = useState<string>(
    explicitWordsFilter.join('\n'),
  );
  const [showModerationConfig, setShowModerationConfig] = useState<boolean>(false);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);

  const update = (changes: Partial<AgentBotInboxConfiguration>) => onChange({ ...value, ...changes });

  const conversationStatusOptions = [
    { value: 'open', label: t('settings.agentBotConfiguration.statusOptions.open') },
    { value: 'resolved', label: t('settings.agentBotConfiguration.statusOptions.resolved') },
    { value: 'pending', label: t('settings.agentBotConfiguration.statusOptions.pending') },
    { value: 'snoozed', label: t('settings.agentBotConfiguration.statusOptions.snoozed') },
  ];

  useEffect(() => {
    if (!isFacebookInbox || !inboxId) return;

    let cancelled = false;
    setIsLoadingPosts(true);
    InboxesService.getFacebookPosts(inboxId, 50)
      .then(posts => {
        if (!cancelled) setFacebookPosts(posts as FacebookPost[]);
      })
      .catch(error => {
        console.error('Error loading Facebook posts:', error);
        if (!cancelled) {
          toast.error(t('settings.agentBotConfiguration.errors.loadPostsError'));
          setFacebookPosts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPosts(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxId, isFacebookInbox]);

  const handleStatusToggle = (status: string) => {
    update({
      allowed_conversation_statuses: allowedConversationStatuses.includes(status)
        ? allowedConversationStatuses.filter(s => s !== status)
        : [...allowedConversationStatuses, status],
    });
  };

  const handleLabelAdd = (labelId: string) => {
    if (labelId && !allowedLabelIds.includes(labelId)) {
      update({ allowed_label_ids: [...allowedLabelIds, labelId] });
      setLabelSelectValue('');
    }
  };

  const handleLabelRemove = (labelId: string) => {
    update({ allowed_label_ids: allowedLabelIds.filter(id => id !== labelId) });
  };

  const handleIgnoredLabelAdd = (labelId: string) => {
    if (labelId && !ignoredLabelIds.includes(labelId)) {
      update({ ignored_label_ids: [...ignoredLabelIds, labelId] });
      setIgnoredLabelSelectValue('');
    }
  };

  const handleIgnoredLabelRemove = (labelId: string) => {
    update({ ignored_label_ids: ignoredLabelIds.filter(id => id !== labelId) });
  };

  const handlePostIdAdd = (postId: string) => {
    if (postId && !facebookAllowedPostIds.includes(postId)) {
      update({ facebook_allowed_post_ids: [...facebookAllowedPostIds, postId] });
    }
  };

  const handlePostIdRemove = (postId: string) => {
    update({ facebook_allowed_post_ids: facebookAllowedPostIds.filter(id => id !== postId) });
  };

  const handleExplicitWordsInputChange = (input: string) => {
    setExplicitWordsInput(input);
    update({
      explicit_words_filter: input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0),
    });
  };

  const handleExplicitWordRemove = (index: number) => {
    const newWords = explicitWordsFilter.filter((_, i) => i !== index);
    setExplicitWordsInput(newWords.join('\n'));
    update({ explicit_words_filter: newWords });
  };

  const availableLabels = labels.filter(label => !allowedLabelIds.includes(label.id));
  const availableIgnoredLabels = labels.filter(
    label => !ignoredLabelIds.includes(label.id) && !allowedLabelIds.includes(label.id),
  );
  const selectedLabelsData = labels.filter(label => allowedLabelIds.includes(label.id));
  const selectedIgnoredLabelsData = labels.filter(label => ignoredLabelIds.includes(label.id));
  const otherBots = agentBots.filter(bot => bot.id !== agentBotId);
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-6">
      {/* Conversation Status Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">
          {t('settings.agentBotConfiguration.advanced.conversationStatus.title')}
        </Label>
        <p className="text-xs text-muted-foreground">
          {t('settings.agentBotConfiguration.advanced.conversationStatus.description')}
        </p>
        <div className="space-y-2">
          {conversationStatusOptions.map(status => (
            <div key={status.value} className="flex items-center space-x-2">
              <Checkbox
                id={fieldId(`status-${status.value}`)}
                checked={allowedConversationStatuses.includes(status.value)}
                onCheckedChange={() => handleStatusToggle(status.value)}
              />
              <Label
                htmlFor={fieldId(`status-${status.value}`)}
                className="text-sm font-normal cursor-pointer"
              >
                {status.label}
              </Label>
            </div>
          ))}
        </div>
        {allowedConversationStatuses.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            {t('settings.agentBotConfiguration.advanced.conversationStatus.emptyHint')}
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

          {availableLabels.length > 0 && (
            <Select value={labelSelectValue} onValueChange={handleLabelAdd}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder={t('settings.agentBotConfiguration.advanced.labels.addLabel')} />
              </SelectTrigger>
              <SelectContent>
                {availableLabels.map(label => (
                  <SelectItem key={label.id} value={label.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
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

          {availableIgnoredLabels.length > 0 && (
            <Select value={ignoredLabelSelectValue} onValueChange={handleIgnoredLabelAdd}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue
                  placeholder={t('settings.agentBotConfiguration.advanced.ignoredLabels.addLabel')}
                />
              </SelectTrigger>
              <SelectContent>
                {availableIgnoredLabels.map(label => (
                  <SelectItem key={label.id} value={label.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
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
            {t('settings.agentBotConfiguration.advanced.ignoredLabels.noAvailableLabels')}
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
              {t('settings.agentBotConfiguration.advanced.facebookMessenger.description')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t('settings.agentBotConfiguration.advanced.facebookMessenger.interactionType')}
            </Label>
            <Select
              value={facebookInteractionType}
              onValueChange={(type: 'comments_only' | 'messages_only' | 'both') =>
                // Comment replies follow the interaction type, as on the channel screen.
                update({
                  facebook_interaction_type: type,
                  facebook_comment_replies_enabled: type === 'comments_only' || type === 'both',
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">
                  {t('settings.agentBotConfiguration.advanced.facebookMessenger.interactionTypes.both')}
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

          {(facebookInteractionType === 'comments_only' || facebookInteractionType === 'both') && (
            <div className="space-y-4 pl-6 border-l-2 border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label
                    htmlFor={fieldId('facebook-comment-replies')}
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    {t('settings.agentBotConfiguration.advanced.facebookMessenger.enableCommentReplies')}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      'settings.agentBotConfiguration.advanced.facebookMessenger.enableCommentRepliesDescription',
                    )}
                  </p>
                </div>
                <Switch
                  id={fieldId('facebook-comment-replies')}
                  checked={facebookCommentRepliesEnabled}
                  onCheckedChange={checked => update({ facebook_comment_replies_enabled: checked })}
                />
              </div>

              {facebookCommentRepliesEnabled && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    {t('settings.agentBotConfiguration.advanced.facebookMessenger.commentAgentBot')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'settings.agentBotConfiguration.advanced.facebookMessenger.commentAgentBotDescription',
                    )}
                  </p>
                  <Select
                    value={facebookCommentAgentBotId || 'same'}
                    onValueChange={botId =>
                      update({ facebook_comment_agent_bot_id: botId === 'same' ? null : botId })
                    }
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
                        {t('settings.agentBotConfiguration.advanced.facebookMessenger.useSameAgent')}
                      </SelectItem>
                      {otherBots.map(bot => (
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
                              <div className="text-xs text-muted-foreground">{bot.bot_provider}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {otherBots.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      {t('settings.agentBotConfiguration.advanced.facebookMessenger.noOtherBots')}
                    </p>
                  )}
                </div>
              )}

              {facebookCommentRepliesEnabled && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-sm font-medium text-foreground">
                    {t('settings.agentBotConfiguration.advanced.facebookMessenger.postSelection')}
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
                        id={fieldId('all-posts')}
                        name={fieldId('post-selection')}
                        checked={postSelectionMode === 'all'}
                        onChange={() => {
                          setPostSelectionMode('all');
                          update({ facebook_allowed_post_ids: [] });
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={fieldId('all-posts')} className="text-sm font-normal cursor-pointer">
                        {t('settings.agentBotConfiguration.advanced.facebookMessenger.allPosts')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={fieldId('specific-posts')}
                        name={fieldId('post-selection')}
                        checked={postSelectionMode === 'specific'}
                        onChange={() => setPostSelectionMode('specific')}
                        className="w-4 h-4"
                      />
                      <Label
                        htmlFor={fieldId('specific-posts')}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {t('settings.agentBotConfiguration.advanced.facebookMessenger.specificPosts')}
                      </Label>
                    </div>
                  </div>

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
                            const isSelected = facebookAllowedPostIds.includes(post.id);
                            const toggle = () =>
                              isSelected ? handlePostIdRemove(post.id) : handlePostIdAdd(post.id);
                            return (
                              <div
                                key={post.id}
                                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary'
                                    : 'bg-background border-border hover:bg-muted/50'
                                }`}
                                onClick={toggle}
                              >
                                <Checkbox checked={isSelected} onCheckedChange={toggle} className="mt-1" />
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
                                    <p className="text-sm text-foreground line-clamp-2">{post.message}</p>
                                  )}
                                  {post.created_time && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(post.created_time).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          {t('settings.agentBotConfiguration.advanced.facebookMessenger.noPostsFound')}
                        </div>
                      )}

                      {facebookAllowedPostIds.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-foreground">
                            {t('settings.agentBotConfiguration.advanced.facebookMessenger.selectedPosts')}{' '}
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
            <ModerationSwitch
              id={fieldId('moderation-enabled')}
              titleKey="settings.agentBotConfiguration.advanced.moderation.enableModeration"
              descriptionKey="settings.agentBotConfiguration.advanced.moderation.enableModerationDescription"
              checked={moderationEnabled}
              onCheckedChange={checked => update({ moderation_enabled: checked })}
            />

            {moderationEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    {t('settings.agentBotConfiguration.advanced.moderation.explicitWords.title')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('settings.agentBotConfiguration.advanced.moderation.explicitWords.description')}
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
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
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

                <ModerationSwitch
                  id={fieldId('sentiment-analysis')}
                  titleKey="settings.agentBotConfiguration.advanced.moderation.sentimentAnalysis.title"
                  descriptionKey="settings.agentBotConfiguration.advanced.moderation.sentimentAnalysis.description"
                  checked={value.sentiment_analysis_enabled || false}
                  onCheckedChange={checked => update({ sentiment_analysis_enabled: checked })}
                />
                <ModerationSwitch
                  id={fieldId('auto-approve-responses')}
                  titleKey="settings.agentBotConfiguration.advanced.moderation.autoApproveResponses.title"
                  descriptionKey="settings.agentBotConfiguration.advanced.moderation.autoApproveResponses.description"
                  checked={value.auto_approve_responses || false}
                  onCheckedChange={checked => update({ auto_approve_responses: checked })}
                />
                <ModerationSwitch
                  id={fieldId('auto-reject-explicit-words')}
                  titleKey="settings.agentBotConfiguration.advanced.moderation.autoRejectExplicitWords.title"
                  descriptionKey="settings.agentBotConfiguration.advanced.moderation.autoRejectExplicitWords.description"
                  checked={value.auto_reject_explicit_words || false}
                  onCheckedChange={checked => update({ auto_reject_explicit_words: checked })}
                />
                <ModerationSwitch
                  id={fieldId('auto-reject-offensive-sentiment')}
                  titleKey="settings.agentBotConfiguration.advanced.moderation.autoRejectOffensiveSentiment.title"
                  descriptionKey="settings.agentBotConfiguration.advanced.moderation.autoRejectOffensiveSentiment.description"
                  checked={value.auto_reject_offensive_sentiment || false}
                  onCheckedChange={checked => update({ auto_reject_offensive_sentiment: checked })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModerationSwitch({
  id,
  titleKey,
  descriptionKey,
  checked,
  onCheckedChange,
}: {
  id: string;
  titleKey: string;
  descriptionKey: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const { t } = useLanguage('channels');

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {t(titleKey)}
        </Label>
        <p className="text-xs text-muted-foreground mt-1">{t(descriptionKey)}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
