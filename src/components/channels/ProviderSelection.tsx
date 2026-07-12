import React from 'react';
import ProviderGrid, { Provider } from './ProviderGrid';
import ChannelBreadcrumb from './ChannelBreadcrumb';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelTypeId } from '@/types/channels/providers';

interface ProviderSelectionProps {
  channelName: string;
  channelType: ChannelTypeId;
  providers: Provider[];
  isDisabled?: (providerId: string) => boolean;
  disabledTooltip?: (providerId: string) => string | undefined;
  onProviderSelect: (provider: Provider) => void;
  onBack: () => void;
  onChannelListClick?: () => void;
  className?: string;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  channelName,
  channelType,
  providers,
  isDisabled,
  disabledTooltip,
  onProviderSelect,
  onBack,
  onChannelListClick,
  className = '',
}) => {
  const { t } = useLanguage('channels');

  return (
    <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>
      {/* Breadcrumb/Navigation */}
      <ChannelBreadcrumb
        items={[
          { label: t('navigation.channels'), onClick: onChannelListClick || onBack },
          { label: t('navigation.createChannel'), onClick: onBack },
          { label: channelName, active: true },
        ]}
        onBack={onBack}
      />

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground mb-2">
          {t('newChannel.providerSelection.channelOf', { channelName })}
        </h1>
        <p className="text-sidebar-foreground/70">
          {t('newChannel.providerSelection.connectDescription', { channelName })}
        </p>
      </div>

      {/* Provider Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-4">
          {t('newChannel.providerSelection.apiProvider')}
        </h2>

        <div data-tour="provider-grid">
          <ProviderGrid
            channelType={channelType}
            providers={providers}
            isDisabled={isDisabled}
            disabledTooltip={disabledTooltip}
            onSelect={onProviderSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default ProviderSelection;
