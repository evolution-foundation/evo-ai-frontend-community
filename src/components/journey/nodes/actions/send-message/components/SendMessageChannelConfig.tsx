import {
  Button,
  Card,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { AlertCircle, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const getInboxIcon = (channelType: string) => {
  switch (channelType) {
    case 'Channel::Email':
      return <Mail className="w-4 h-4" />;
    case 'Channel::Whatsapp':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Sms':
    case 'Channel::TwilioSms':
    case 'Channel::Twilio':
      return <Phone className="w-4 h-4" />;
    case 'Channel::Telegram':
      return <Send className="w-4 h-4" />;
    case 'Channel::FacebookPage':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Instagram':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Api':
      return <Send className="w-4 h-4" />;
    case 'Channel::WebWidget':
      return <MessageSquare className="w-4 h-4" />;
    case 'Channel::Line':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
};

const getChannelTypeName = (channelType: string) => {
  switch (channelType) {
    case 'Channel::Email':
      return 'Email';
    case 'Channel::Whatsapp':
      return 'WhatsApp';
    case 'Channel::Sms':
      return 'SMS';
    case 'Channel::TwilioSms':
      return 'SMS (Twilio)';
    case 'Channel::Twilio':
      return 'Twilio';
    case 'Channel::Telegram':
      return 'Telegram';
    case 'Channel::FacebookPage':
      return 'Messenger';
    case 'Channel::Instagram':
      return 'Instagram';
    case 'Channel::Api':
      return 'API';
    case 'Channel::WebWidget':
      return 'Chat Widget';
    case 'Channel::Line':
      return 'LINE';
    default:
      return channelType.replace('Channel::', '');
  }
};

// O /form_data devolve os canais num payload mais enxuto que o Inbox completo de
// @/types/channels; este é o recorte que o seletor realmente renderiza.
export interface SendMessageChannelOption {
  id: string | number;
  name: string;
  channel_type: string;
}

interface SendMessageChannelConfigProps {
  isTemplateMode: boolean;
  isCloudInbox: boolean;
  onModeChange: (mode: 'text' | 'template') => void;
  useEventChannel: boolean | undefined;
  onUseEventChannelChange: (checked: boolean) => void;
  loading: boolean;
  filteredInboxes: SendMessageChannelOption[];
  inboxId: string | undefined;
  onInboxChange: (inboxId: string) => void;
}

// "How/where the message goes out": mode (free text vs. approved template),
// the optional event-channel override, and — when not using the event
// channel — which inbox to send from.
export function SendMessageChannelConfig({
  isTemplateMode,
  isCloudInbox,
  onModeChange,
  useEventChannel,
  onUseEventChannelChange,
  loading,
  filteredInboxes,
  inboxId,
  onInboxChange,
}: SendMessageChannelConfigProps) {
  const { t } = useLanguage('journey');

  return (
    <>
      <div className="space-y-2">
        <Label id="send-message-mode-label" className="text-sm font-medium">
          {t('panels.sendMessage.mode')}
        </Label>
        <div className="flex gap-2" role="group" aria-labelledby="send-message-mode-label">
          <Button
            type="button"
            size="sm"
            variant={isTemplateMode ? 'outline' : 'default'}
            disabled={isCloudInbox}
            onClick={() => onModeChange('text')}
          >
            {t('panels.sendMessage.modeText')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isTemplateMode ? 'default' : 'outline'}
            onClick={() => onModeChange('template')}
          >
            {t('panels.sendMessage.modeTemplate')}
          </Button>
        </div>
        {isCloudInbox && (
          <p className="text-xs text-muted-foreground">
            {t('panels.sendMessage.templateRequiredForCloud')}
          </p>
        )}
      </div>

      {!isTemplateMode && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="useEventChannel"
              checked={useEventChannel}
              onCheckedChange={checked => onUseEventChannelChange(!!checked)}
            />
            <Label htmlFor="useEventChannel" className="text-sm font-medium cursor-pointer">
              {t('panels.sendMessage.useEventChannel')}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('panels.sendMessage.useEventChannelDescription')}
          </p>
        </div>
      )}

      {!useEventChannel && (
        <div className="space-y-2">
          <Label htmlFor="send-message-channel-select" className="text-sm font-medium">
            {t('panels.sendMessage.sendChannel')}
          </Label>

          {loading ? (
            <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
              <div className="animate-spin w-6 h-6 border-2 border-flow-node-action-message-fg border-t-transparent rounded-full mr-2" />
              <span className="text-sm text-muted-foreground">
                {t('panels.sendMessage.loadingChannels')}
              </span>
            </div>
          ) : filteredInboxes.length === 0 ? (
            <Card className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">
                {t('panels.sendMessage.noChannelsAvailable')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('panels.sendMessage.configureChannels')}
              </p>
            </Card>
          ) : (
            <>
              <Select value={inboxId} onValueChange={onInboxChange}>
                <SelectTrigger id="send-message-channel-select" className="w-full">
                  <SelectValue placeholder={t('panels.sendMessage.chooseChannel')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredInboxes.map(inbox => (
                    <SelectItem key={inbox.id} value={String(inbox.id)}>
                      <div className="flex items-center gap-2">
                        {getInboxIcon(inbox.channel_type)}
                        <span>{inbox.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({getChannelTypeName(inbox.channel_type)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('panels.sendMessage.channelsDescription')}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
