import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
} from '@evoapi/design-system';
import { Label } from '@evoapi/design-system';
import { Code2, Upload, Trash2, Eye, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import type { TabSaveHandle } from './tabSave';
import WidgetPreview from './widget/WidgetPreview';
import {
  WidgetConfig,
  getDefaultWidgetConfig,
  getWidgetBubblePositions,
  getWidgetBubbleTypes,
  getWidgetViewOptions,
  getReplyTimeOptions,
  generateWidgetScript,
  generateWidgetIframeEmbed,
  extractWebsiteToken,
  validateWidgetConfig,
  saveWidgetSettings,
  loadWidgetSettings,
  WIDGET_COLOR_PRESETS,
} from './helpers/widgetHelpers';

interface WidgetBuilderFormProps {
  inboxId: string;
  inbox?: {
    name?: string;
    welcome_title?: string;
    welcome_tagline?: string;
    widget_color?: string;
    reply_time?: string;
    avatar_url?: string;
    web_widget_script?: string;
  };
  onUpdate?: (data: {
    name: string;
    channel: {
      widget_color: string;
      welcome_title: string;
      welcome_tagline: string;
      reply_time: string;
    };
    avatar?: File;
  }) => Promise<void>;
  registerSave?: (handle: TabSaveHandle | null) => void;
}

export default function WidgetBuilderForm({
  inboxId,
  inbox,
  onUpdate,
  registerSave,
}: WidgetBuilderFormProps) {
  const { t } = useLanguage('channels');
  const [config, setConfig] = useState<WidgetConfig>(getDefaultWidgetConfig());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'script'>('script');
  const [isUpdating, setIsUpdating] = useState(false);
  const [widgetScript, setWidgetScript] = useState('');
  const [widgetIframeEmbed, setWidgetIframeEmbed] = useState('');
  const [previewWebsiteToken, setPreviewWebsiteToken] = useState('');

  // Initialize form data
  useEffect(() => {
    if (inbox) {
      const savedSettings = loadWidgetSettings(inboxId);

      setConfig({
        websiteName: inbox.name || '',
        welcomeHeading: inbox.welcome_title || '',
        welcomeTagline: inbox.welcome_tagline || '',
        widgetColor: inbox.widget_color || '#1f93ff',
        replyTime: inbox.reply_time || 'in_a_few_minutes',
        avatarUrl: inbox.avatar_url || '',
        widgetBubblePosition: savedSettings?.position || 'right',
        widgetBubbleLauncherTitle:
          savedSettings?.launcherTitle || t('settings.widgetBuilder.defaultLauncherTitle'),
        widgetBubbleType: savedSettings?.type || 'standard',
      });

      if (inbox.web_widget_script) {
        setPreviewWebsiteToken(extractWebsiteToken(inbox.web_widget_script));
        const script = generateWidgetScript(inbox.web_widget_script, {
          position: savedSettings?.position || 'right',
          type: savedSettings?.type || 'standard',
          launcherTitle:
            savedSettings?.launcherTitle || t('settings.widgetBuilder.defaultLauncherTitle'),
        });
        setWidgetScript(script);
        setWidgetIframeEmbed(generateWidgetIframeEmbed(inbox.web_widget_script));
      }
    }
  }, [inbox, inboxId]);

  // Update widget script when config changes
  useEffect(() => {
    if (inbox?.web_widget_script) {
      setPreviewWebsiteToken(extractWebsiteToken(inbox.web_widget_script));
      const script = generateWidgetScript(inbox.web_widget_script, {
        position: config.widgetBubblePosition,
        type: config.widgetBubbleType,
        launcherTitle: config.widgetBubbleLauncherTitle,
      });
      setWidgetScript(script);
      setWidgetIframeEmbed(generateWidgetIframeEmbed(inbox.web_widget_script));
    }
  }, [
    config.widgetBubblePosition,
    config.widgetBubbleType,
    config.widgetBubbleLauncherTitle,
    inbox?.web_widget_script,
  ]);

  // Handle config changes
  const handleConfigChange = useCallback((field: keyof WidgetConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Handle avatar upload
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      handleConfigChange('avatarUrl', url);
    }
  };

  // Handle avatar delete
  const handleAvatarDelete = () => {
    setAvatarFile(null);
    handleConfigChange('avatarUrl', '');
  };

  // Handle bubble position change
  const handleBubblePositionChange = (position: string) => {
    handleConfigChange('widgetBubblePosition', position);
  };

  // Handle bubble type change
  const handleBubbleTypeChange = (type: string) => {
    handleConfigChange('widgetBubbleType', type);
  };

  // Handle form submission
  const handleUpdate = async () => {
    const errors = validateWidgetConfig(config);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    setIsUpdating(true);
    try {
      // Save bubble settings to localStorage
      const bubbleSettings = {
        position: config.widgetBubblePosition,
        launcherTitle: config.widgetBubbleLauncherTitle,
        type: config.widgetBubbleType,
      };
      saveWidgetSettings(inboxId, bubbleSettings);

      // Prepare update payload
      const updateData = {
        name: config.websiteName,
        channel: {
          widget_color: config.widgetColor,
          welcome_title: config.welcomeHeading,
          welcome_tagline: config.welcomeTagline,
          reply_time: config.replyTime,
        },
        ...(avatarFile && { avatar: avatarFile }),
      };

      if (onUpdate) {
        await onUpdate(updateData);
      }

      toast.success(t('settings.widgetBuilder.success.updateSuccess'));
    } catch (error) {
      console.error('Error updating widget:', error);
      toast.error(t('settings.widgetBuilder.errors.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Expose the save to the settings sticky footer registry.
  const canSave = !isUpdating;
  const registerSaveRef = useRef(registerSave);
  registerSaveRef.current = registerSave;
  const handleUpdateRef = useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;
  useEffect(() => {
    registerSaveRef.current?.({ save: () => handleUpdateRef.current(), canSave });
    return () => registerSaveRef.current?.(null);
  }, [canSave]);

  // Widget view options
  const viewOptions = getWidgetViewOptions();
  const replyTimeOptions = getReplyTimeOptions();
  const bubblePositions = getWidgetBubblePositions();
  const bubbleTypes = getWidgetBubbleTypes();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  {t('settings.widgetBuilder.title')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t('settings.widgetBuilder.description')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleUpdate();
                }}
                className="space-y-6"
              >
                {/* Avatar Upload */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t('settings.widgetBuilder.avatar.label')}
                  </Label>
                  <div className="flex items-center gap-4">
                    {config.avatarUrl ? (
                      <div className="relative">
                        <img
                          src={config.avatarUrl}
                          alt="Avatar"
                          className="w-16 h-16 rounded-full object-cover border-2 border-border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                          onClick={handleAvatarDelete}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {config.avatarUrl
                              ? t('settings.widgetBuilder.avatar.change')
                              : t('settings.widgetBuilder.avatar.upload')}
                          </span>
                        </Button>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                  </div>
                </div>

                {/* Website Name */}
                <div className="space-y-2">
                  <Label htmlFor="websiteName">
                    {t('settings.widgetBuilder.websiteName.label')}
                  </Label>
                  <Input
                    id="websiteName"
                    value={config.websiteName}
                    onChange={e => handleConfigChange('websiteName', e.target.value)}
                    placeholder={t('settings.widgetBuilder.websiteName.placeholder')}
                    required
                  />
                </div>

                {/* Welcome Heading */}
                <div className="space-y-2">
                  <Label htmlFor="welcomeHeading">
                    {t('settings.widgetBuilder.welcomeHeading.label')}
                  </Label>
                  <Input
                    id="welcomeHeading"
                    value={config.welcomeHeading}
                    onChange={e => handleConfigChange('welcomeHeading', e.target.value)}
                    placeholder={t('settings.widgetBuilder.welcomeHeading.placeholder')}
                  />
                </div>

                {/* Welcome Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="welcomeTagline">
                    {t('settings.widgetBuilder.welcomeTagline.label')}
                  </Label>
                  <Textarea
                    id="welcomeTagline"
                    value={config.welcomeTagline}
                    onChange={e => handleConfigChange('welcomeTagline', e.target.value)}
                    placeholder={t('settings.widgetBuilder.welcomeTagline.placeholder')}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Reply Time */}
                <div className="space-y-2">
                  <Label htmlFor="replyTime">{t('settings.widgetBuilder.replyTime.label')}</Label>
                  <Select
                    value={config.replyTime}
                    onValueChange={value => handleConfigChange('replyTime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('settings.widgetBuilder.replyTime.placeholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {replyTimeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Widget Color */}
                <div className="space-y-3">
                  <Label>{t('settings.widgetBuilder.widgetColor.label')}</Label>
                  <div className="space-y-3">
                    <Input
                      type="color"
                      value={config.widgetColor}
                      onChange={e => handleConfigChange('widgetColor', e.target.value)}
                      className="w-full h-10"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      {WIDGET_COLOR_PRESETS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className="w-8 h-8 rounded border border-border"
                          style={{ backgroundColor: color }}
                          onClick={() => handleConfigChange('widgetColor', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bubble Position */}
                <div className="space-y-3">
                  <Label>{t('settings.widgetBuilder.position.label')}</Label>
                  <RadioGroup
                    value={config.widgetBubblePosition}
                    onValueChange={handleBubblePositionChange}
                    className="flex gap-4"
                  >
                    {bubblePositions.map(position => (
                      <div key={position.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={position.id} id={position.id} />
                        <Label htmlFor={position.id}>{position.title}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Bubble Type */}
                <div className="space-y-3">
                  <Label>{t('settings.widgetBuilder.bubbleType.label')}</Label>
                  <RadioGroup
                    value={config.widgetBubbleType}
                    onValueChange={handleBubbleTypeChange}
                    className="flex gap-4"
                  >
                    {bubbleTypes.map(type => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={type.id} id={type.id} />
                        <Label htmlFor={type.id}>{type.title}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Launcher Title */}
                <div className="space-y-2">
                  <Label htmlFor="launcherTitle">
                    {t('settings.widgetBuilder.launcherTitle.label')}
                  </Label>
                  <Input
                    id="launcherTitle"
                    value={config.widgetBubbleLauncherTitle}
                    onChange={e => handleConfigChange('widgetBubbleLauncherTitle', e.target.value)}
                    placeholder={t('settings.widgetBuilder.launcherTitle.placeholder')}
                  />
                </div>

              </form>
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              {/* View Toggle */}
              <div className="flex justify-center">
                <RadioGroup
                  value={viewMode}
                  onValueChange={value => setViewMode(value as 'preview' | 'script')}
                  className="flex gap-6"
                >
                  {viewOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="cursor-pointer">
                        {option.id === 'preview' ? (
                          <span className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {option.title}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Code2 className="w-4 h-4" />
                            {option.title}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Preview/Script Content */}
              {viewMode === 'preview' ? (
                <div className="flex flex-col items-center justify-end min-h-[650px] mx-5 mb-5 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <WidgetPreview config={config} websiteToken={previewWebsiteToken} />
                </div>
              ) : (
                <div className="mx-5 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-5 h-5" />
                      <h5 className="font-medium">
                        {t('settings.widgetBuilder.widgetCode.title')}
                      </h5>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">SDK Bubble</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!widgetScript) {
                            toast.error(t('settings.widgetBuilder.widgetCode.noScriptError') || 'No script available to copy');
                            return;
                          }
                          try {
                            await navigator.clipboard.writeText(widgetScript);
                            toast.success(t('settings.widgetBuilder.widgetCode.copySuccess') || 'Code copied to clipboard!');
                          } catch (error) {
                            console.error('Failed to copy code:', error);
                            toast.error(t('settings.widgetBuilder.widgetCode.copyError') || 'Failed to copy code');
                          }
                        }}
                        disabled={!widgetScript}
                      >
                        {t('settings.widgetBuilder.widgetCode.copyCode')}
                      </Button>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>
                        {widgetScript || t('settings.widgetBuilder.widgetCode.placeholder')}
                      </pre>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-medium text-muted-foreground">Iframe Embed</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!widgetIframeEmbed) {
                            toast.error('No iframe embed available to copy');
                            return;
                          }
                          try {
                            await navigator.clipboard.writeText(widgetIframeEmbed);
                            toast.success('Iframe code copied to clipboard!');
                          } catch (error) {
                            console.error('Failed to copy iframe code:', error);
                            toast.error('Failed to copy iframe code');
                          }
                        }}
                        disabled={!widgetIframeEmbed}
                      >
                        {t('settings.widgetBuilder.widgetCode.copyCode')}
                      </Button>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>
                        {widgetIframeEmbed || '<iframe ...></iframe>'}
                      </pre>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{t('settings.widgetBuilder.widgetCode.instructions.title')}</p>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{t('settings.widgetBuilder.widgetCode.instructions.step1')}</li>
                        <li>{t('settings.widgetBuilder.widgetCode.instructions.step2')}</li>
                        <li>{t('settings.widgetBuilder.widgetCode.instructions.step3')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
