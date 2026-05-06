import { cn } from '@/utils/cn';
import { useLanguage } from '@/hooks/useLanguage';
import { getBrandIcon, getBrandColor } from '@/components/BrandIcon';

interface ChannelIconProps {
  channelType?: string;
  provider?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
}

function getChannelBrandId(channelType?: string, provider?: string): string | undefined {
  if (!channelType) return undefined;

  const keyRaw = channelType.replace('Channel::', '').toLowerCase();
  const key = keyRaw.replace(/\s|_/g, '');
  const prov = (provider || '').toLowerCase();

  // WhatsApp
  if (key.includes('whatsapp')) {
    return 'whatsapp';
  }

  // Facebook / Messenger
  if (key.includes('facebook') || key === 'facebookpage') {
    return 'facebook';
  }

  // Instagram
  if (key.includes('instagram')) {
    return 'instagram';
  }

  // Telegram
  if (key.includes('telegram')) {
    return 'telegram';
  }

  // Twitter
  if (key.includes('twitter')) {
    return 'twitter';
  }

  // Line
  if (key.includes('line')) {
    return 'line';
  }

  // Email by provider
  if (key.includes('email')) {
    if (prov === 'google') {
      return 'google';
    }
  }

  return undefined;
}

function getChannelIconSrc(channelType?: string, provider?: string): string | undefined {
  if (!channelType) return undefined;

  const keyRaw = channelType.replace('Channel::', '').toLowerCase();
  const key = keyRaw.replace(/\s|_/g, '');
  const prov = (provider || '').toLowerCase();

  try {
    // WhatsApp by provider (fallback for non-brand icons)
    if (key.includes('whatsapp')) {
      if (prov === 'whatsapp_cloud') {
        return new URL('@/assets/channels/whatsapp-cloud.svg', import.meta.url).toString();
      }
      if (prov === 'evolution') {
        return new URL('@/assets/channels/evolution-api.png', import.meta.url).toString();
      }
      if (prov === 'evolution_go') {
        return new URL('@/assets/channels/evolution-go.png', import.meta.url).toString();
      }
      if (prov === 'notificame') {
        return new URL('@/assets/channels/notificame.png', import.meta.url).toString();
      }
      if (prov === 'zapi') {
        return new URL('@/assets/channels/zapi.png', import.meta.url).toString();
      }
      if (prov === 'default' || prov === 'twilio') {
        return new URL('@/assets/channels/twilio.png', import.meta.url).toString();
      }
      // whatsapp brand icon is handled by getChannelBrandId
      return undefined;
    }

    // SMS by provider and type
    if (key.includes('twiliosms')) {
      return new URL('@/assets/channels/twilio.png', import.meta.url).toString();
    }
    if (key === 'sms' || key.includes('sms')) {
      if (prov === 'twilio') {
        return new URL('@/assets/channels/twilio.png', import.meta.url).toString();
      }
      // Bandwidth or others fallback to generic SMS
      return new URL('@/assets/channels/sms.png', import.meta.url).toString();
    }

    // Email by provider
    if (key.includes('email')) {
      if (prov === 'google') {
        // google brand icon is handled by getChannelBrandId
        return undefined;
      }
      if (prov === 'microsoft') {
        return new URL('@/assets/channels/microsoft.png', import.meta.url).toString();
      }
      return new URL('@/assets/channels/email.png', import.meta.url).toString();
    }

    // Web Widget
    if (key.includes('webwidget') || key.includes('website') || key === 'web_widget') {
      return new URL('@/assets/channels/website.png', import.meta.url).toString();
    }

    // API
    if (key === 'api' || key.includes('api')) {
      return new URL('@/assets/channels/api.png', import.meta.url).toString();
    }

    // Facebook / Messenger
    if (key.includes('facebook') || key === 'facebookpage') {
      // facebook brand icon is handled by getChannelBrandId
      return undefined;
    }

    // Instagram
    if (key.includes('instagram')) {
      // instagram brand icon is handled by getChannelBrandId
      return undefined;
    }

    // Telegram
    if (key.includes('telegram')) {
      // telegram brand icon is handled by getChannelBrandId
      return undefined;
    }

    // Twitter
    if (key.includes('twitter')) {
      // twitter brand icon is handled by getChannelBrandId
      return undefined;
    }

    // Line
    if (key.includes('line')) {
      // line brand icon is handled by getChannelBrandId
      return undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const iconSizes = {
  sm: 20,
  md: 28,
  lg: 40,
  xl: 56
};

const containerSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-18 h-18'
};

export default function ChannelIcon({
  channelType,
  provider,
  size = 'md',
  className,
  fallbackIcon
}: ChannelIconProps) {
  const { t } = useLanguage('channels');
  const brandId = getChannelBrandId(channelType, provider);
  const BrandIconComponent = brandId ? getBrandIcon(brandId) : undefined;
  const brandColor = brandId ? getBrandColor(brandId) : undefined;
  const iconSrc = getChannelIconSrc(channelType, provider);

  // Prefer provider-specific image (Evolution API, Evolution Go, Z-API, Notificame,
  // Twilio, etc.) over the generic brand glyph. Only fall back to the brand icon
  // when no provider-specific asset exists for this combination — that way the
  // provider grid keeps each provider's own logo instead of showing the parent
  // channel brand for all of them.
  if (iconSrc) {
    return (
      <div
        className={cn(
          'rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden',
          containerSizeClasses[size],
          className
        )}
      >
        <img
          src={iconSrc}
          alt={channelType || ''}
          className={cn('object-contain', sizeClasses[size])}
        />
      </div>
    );
  }

  if (BrandIconComponent) {
    return (
      <div
        className={cn(
          'rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden',
          containerSizeClasses[size],
          className
        )}
      >
        <BrandIconComponent
          size={iconSizes[size]}
          className={sizeClasses[size]}
          color={brandColor}
        />
      </div>
    );
  }

  if (!iconSrc && !fallbackIcon) {
    return (
      <div
        className={cn(
          'rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-sidebar-foreground/60',
          containerSizeClasses[size],
          className
        )}
      >
        <span className="text-xs font-medium">
          {channelType ? channelType.charAt(0).toUpperCase() : '?'}
        </span>
      </div>
    );
  }

  if (!iconSrc && fallbackIcon) {
    return (
      <div
        className={cn(
          'rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center',
          containerSizeClasses[size],
          className
        )}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden',
        containerSizeClasses[size],
        className
      )}
    >
      <img
        src={iconSrc}
        alt={channelType || t('common.channel')}
        className={cn('object-contain', sizeClasses[size])}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
    </div>
  );
}
