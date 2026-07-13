import React from 'react';
import {
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@evoapi/design-system';
import { ArrowLeft } from 'lucide-react';
import { ChannelIcon } from '@/components/channels';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelTypeId } from '@/types/channels/providers';

export interface Provider {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  popular?: boolean;
}

interface ProviderGridProps {
  channelType: ChannelTypeId;
  providers: Provider[];
  isDisabled?: (providerId: string) => boolean;
  disabledTooltip?: (providerId: string) => string | undefined;
  onSelect: (provider: Provider) => void;
}

const ProviderGrid: React.FC<ProviderGridProps> = ({
  channelType,
  providers,
  isDisabled,
  disabledTooltip,
  onSelect,
}) => {
  const { t } = useLanguage('channels');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map(provider => {
        const disabled = isDisabled ? isDisabled(provider.id) : false;
        const tooltipText = disabled && disabledTooltip ? disabledTooltip(provider.id) : undefined;

        const card = (
          <Card
            key={provider.id}
            className={`h-full transition-all duration-200 border-sidebar-border rounded-lg relative ${
              disabled
                ? 'opacity-60 cursor-not-allowed bg-sidebar'
                : 'cursor-pointer bg-sidebar hover:bg-sidebar-accent/50 hover:border-sidebar-border hover:shadow-md'
            }`}
            onClick={() => !disabled && onSelect(provider)}
          >
            {provider.recommended && (
              <div className="absolute -top-2 right-4 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                {t('newChannel.providers.badges.recommended')}
              </div>
            )}

            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ChannelIcon channelType={channelType} provider={provider.id} size="lg" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-sidebar-foreground mb-1">
                    {provider.name}
                  </h4>
                  <p className="text-sm text-sidebar-foreground/70 leading-relaxed">
                    {provider.description}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <ArrowLeft className="w-5 h-5 text-sidebar-foreground/60 rotate-180" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        if (tooltipText) {
          return (
            <TooltipProvider key={provider.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-full">{card}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <React.Fragment key={provider.id}>{card}</React.Fragment>;
      })}
    </div>
  );
};

export default ProviderGrid;
