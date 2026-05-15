import { Badge } from '@evoapi/design-system';
import { User, Building2, Users, LucideIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactTypeBadgeProps {
  type: 'person' | 'company' | 'group';
  className?: string;
}

type BadgeVariant = 'secondary' | 'default' | 'outline';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; variant: BadgeVariant; labelKey: string }> = {
  person:  { icon: User,      variant: 'secondary', labelKey: 'type.person' },
  company: { icon: Building2, variant: 'default',   labelKey: 'type.company' },
  group:   { icon: Users,     variant: 'outline',   labelKey: 'type.group' },
};

export default function ContactTypeBadge({ type, className = '' }: ContactTypeBadgeProps) {
  const { t } = useLanguage('contacts');
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.person;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {t(config.labelKey)}
    </Badge>
  );
}
