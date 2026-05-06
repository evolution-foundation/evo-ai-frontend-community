import type { IconType } from '@icons-pack/react-simple-icons';
import {
  SiInstagram,
  SiTelegram,
  SiFacebook,
  SiWhatsapp,
  SiGoogle,
  SiLine,
  SiX,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiGooglesheets,
  SiGoogletranslate,
  SiHubspot,
  SiLinear,
  SiMercadopago,
  SiNotion,
  SiPaypal,
  SiShopify,
  SiStripe,
  SiSupabase,
  SiAsana,
  SiAtlassian,
  SiBookingdotcom,
  SiDialogflow,
  SiElevenlabs,
  SiIntercom,
} from '@icons-pack/react-simple-icons';

const BRAND_ICONS: Record<string, IconType> = {
  instagram: SiInstagram,
  telegram: SiTelegram,
  facebook: SiFacebook,
  whatsapp: SiWhatsapp,
  google: SiGoogle,
  line: SiLine,
  twitter: SiX,
  x: SiX,
  twitterprofile: SiX,
  github: SiGithub,
  gmail: SiGmail,
  'google-calendar': SiGooglecalendar,
  googledrive: SiGoogledrive,
  'google-drive': SiGoogledrive,
  googlesheets: SiGooglesheets,
  'google-sheets': SiGooglesheets,
  googletranslate: SiGoogletranslate,
  'google-translate': SiGoogletranslate,
  google_translate: SiGoogletranslate,
  hubspot: SiHubspot,
  linear: SiLinear,
  mercadopago: SiMercadopago,
  'mercado-pago': SiMercadopago,
  notion: SiNotion,
  paypal: SiPaypal,
  shopify: SiShopify,
  stripe: SiStripe,
  supabase: SiSupabase,
  asana: SiAsana,
  atlassian: SiAtlassian,
  booking: SiBookingdotcom,
  dialogflow: SiDialogflow,
  elevenlabs: SiElevenlabs,
  intercom: SiIntercom,
  'eleven-labs': SiElevenlabs,
  whatsappcloud: SiWhatsapp,
  'whatsapp-cloud': SiWhatsapp,
};

// Official brand colors from simple-icons. Used as defaults when ChannelIcon
// (and other consumers) render a brand glyph — without these the icons fall
// back to currentColor and end up monochrome on dark themes.
const BRAND_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  telegram: '#26A5E4',
  facebook: '#0866FF',
  whatsapp: '#25D366',
  google: '#4285F4',
  line: '#00C300',
  twitter: '#000000',
  x: '#000000',
  twitterprofile: '#000000',
  github: '#181717',
  gmail: '#EA4335',
  'google-calendar': '#4285F4',
  googledrive: '#4285F4',
  'google-drive': '#4285F4',
  googlesheets: '#34A853',
  'google-sheets': '#34A853',
  googletranslate: '#4285F4',
  'google-translate': '#4285F4',
  google_translate: '#4285F4',
  hubspot: '#FF7A59',
  linear: '#5E6AD2',
  mercadopago: '#00B1EA',
  'mercado-pago': '#00B1EA',
  notion: '#FFFFFF',
  paypal: '#003087',
  shopify: '#7AB55C',
  stripe: '#635BFF',
  supabase: '#3FCF8E',
  asana: '#F06A6A',
  atlassian: '#0052CC',
  booking: '#003580',
  dialogflow: '#FF9800',
  elevenlabs: '#000000',
  'eleven-labs': '#000000',
  intercom: '#1F8DED',
  whatsappcloud: '#25D366',
  'whatsapp-cloud': '#25D366',
};

export function getBrandIcon(id?: string): IconType | undefined {
  if (!id) return undefined;
  const key = id.toLowerCase().replace(/\s|_/g, '');
  return BRAND_ICONS[key] || BRAND_ICONS[id.toLowerCase().replace(/_/g, '-')];
}

export function getBrandColor(id?: string): string | undefined {
  if (!id) return undefined;
  const key = id.toLowerCase().replace(/\s|_/g, '');
  return BRAND_COLORS[key] || BRAND_COLORS[id.toLowerCase().replace(/_/g, '-')];
}

interface BrandIconProps {
  id?: string;
  size?: number | string;
  className?: string;
  color?: string;
}

export default function BrandIcon({ id, size = 24, className, color }: BrandIconProps) {
  const Icon = getBrandIcon(id);
  if (!Icon) return null;
  // Default to the brand's official color so icons stay recognizable on
  // dark themes; explicit `color` prop still overrides.
  const resolvedColor = color ?? getBrandColor(id);
  return <Icon size={size} className={className} color={resolvedColor} />;
}
