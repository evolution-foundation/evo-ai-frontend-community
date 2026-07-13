import { cn } from '@/utils/cn';
import { useLanguage } from '@/hooks/useLanguage';
import { getBrandIcon, getBrandColor } from '@/components/BrandIcon';
// Channel icons as static imports. Imports (even via the @/ alias) are resolved
// by Vite into correct asset URLs; `new URL('@/...', import.meta.url)` is NOT
// (the alias breaks the transform) — it produced broken icons when inlined.
import iconWhatsappCloud from '@/assets/channels/whatsapp-cloud.svg';
import iconEvolutionApi from '@/assets/channels/evolution-api.png';
import iconEvolutionGo from '@/assets/channels/evolution-go.png';
import iconNotificame from '@/assets/channels/notificame.png';
import iconZapi from '@/assets/channels/zapi.png';
import iconTwilio from '@/assets/channels/twilio.png';
import iconSms from '@/assets/channels/sms.png';
import iconMicrosoft from '@/assets/channels/microsoft.png';
import iconEmail from '@/assets/channels/email.png';
import iconWebsite from '@/assets/channels/website.png';
import iconApi from '@/assets/channels/api.png';

interface ChannelIconProps {
  channelType?: string;
  provider?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackIcon?: React.ReactNode;
  /**
   * Render the strongly-branded channels as a brand-colored tile with a white
   * glyph (Channels overview reference, EVO-2092). Channels without a brand tile
   * (email/sms/web/api) keep the neutral tile from the default renderer.
   */
  brandTile?: boolean;
}

type BrandGlyph = React.ComponentType<{ size?: number; color?: string; className?: string }>;

// Brand-colored tile backgrounds for the overview cards. Only the brand hex
// values are raw colors here (allowed for brand icons); the glyph is always
// white. Instagram uses its signature gradient.
const BRAND_TILE_BG: Record<string, string> = {
  instagram: 'bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)]',
  facebook: 'bg-[#0866FF]',
  whatsapp: 'bg-[#25D366]',
  telegram: 'bg-[#26A5E4]',
};

function getBrandTileGlyph(key: string): BrandGlyph | undefined {
  // Brand glyphs come from the shared brand icon map.
  return getBrandIcon(key) as unknown as BrandGlyph | undefined;
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
        return iconWhatsappCloud;
      }
      if (prov === 'evolution') {
        return iconEvolutionApi;
      }
      if (prov === 'evolution_go') {
        return iconEvolutionGo;
      }
      if (prov === 'notificame') {
        return iconNotificame;
      }
      if (prov === 'zapi') {
        return iconZapi;
      }
      if (prov === 'default' || prov === 'twilio') {
        return iconTwilio;
      }
      // whatsapp brand icon is handled by getChannelBrandId
      return undefined;
    }

    // SMS by provider and type
    if (key.includes('twiliosms')) {
      return iconTwilio;
    }
    if (key === 'sms' || key.includes('sms')) {
      if (prov === 'twilio') {
        return iconTwilio;
      }
      // Bandwidth or others fallback to generic SMS
      return iconSms;
    }

    // Email by provider
    if (key.includes('email')) {
      if (prov === 'google') {
        // google brand icon is handled by getChannelBrandId
        return undefined;
      }
      if (prov === 'microsoft') {
        return iconMicrosoft;
      }
      return iconEmail;
    }

    // Web Widget
    if (key.includes('webwidget') || key.includes('website') || key === 'web_widget') {
      return iconWebsite;
    }

    // API
    if (key === 'api' || key.includes('api')) {
      return iconApi;
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
  fallbackIcon,
  brandTile
}: ChannelIconProps) {
  const { t } = useLanguage('channels');

  // Overview cards: brand-colored tile with a white glyph for the strongly
  // branded channels. Everything else falls through to the neutral tile below.
  if (brandTile) {
    const key = (channelType || '').replace('Channel::', '').toLowerCase().replace(/\s|_/g, '');
    const tileBg = BRAND_TILE_BG[key];
    if (tileBg) {
      const Glyph = getBrandTileGlyph(key);
      return (
        <div
          className={cn(
            'rounded-lg flex items-center justify-center overflow-hidden',
            containerSizeClasses[size],
            tileBg,
            className,
          )}
        >
          {Glyph && (
            <Glyph size={iconSizes[size]} color="#FFFFFF" className={sizeClasses[size]} />
          )}
        </div>
      );
    }
  }

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
