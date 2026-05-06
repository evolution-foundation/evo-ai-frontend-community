import { useLanguage } from '@/hooks/useLanguage';
import { Button, Card, CardContent } from '@evoapi/design-system';
import { Edit, MessageSquare, Activity, Eye } from 'lucide-react';
import { Contact } from '@/types/contacts';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import ContactStatusBadge from './ContactStatusBadge';
import ContactTagsList from './ContactTagsList';
import ContactTypeBadge from './ContactTypeBadge';
import ContactPipelinesBadge from './ContactPipelinesBadge';

type ContactCardProps = {
  contact: Contact;
  onViewDetails?: (contact: Contact) => void;
  onStartConversation?: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onViewEvents?: (contact: Contact) => void;
};

export default function ContactCard({
  contact,
  onViewDetails,
  onStartConversation,
  onEdit,
  onViewEvents,
}: ContactCardProps) {
  const { t } = useLanguage('contacts');

  return (
    <Card className="group relative bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="p-0">
        <div
          className="flex items-center gap-3 p-4 border-b border-sidebar-border cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onViewDetails?.(contact)}
        >
          <ContactAvatar contact={contact} size="md" showColoredFallback={true} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-sidebar-foreground">
              {contact.name}
            </h3>
            {contact.email && (
              <p className="text-xs text-sidebar-foreground/60 truncate">{contact.email}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <ContactTypeBadge type={contact.type || 'person'} />
            <ContactStatusBadge blocked={contact.blocked} className="justify-center" />
          </div>
        </div>

        <div className="px-4 py-3 text-xs text-sidebar-foreground/70 space-y-2">
          <div className="flex items-center justify-between">
            <span>ID</span>
            <span className="font-mono">{contact.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t('card.phone')}</span>
            <span className="font-mono">{contact.phone_number}</span>
          </div>
          {contact.labels && contact.labels.length > 0 && (
            <div className="pt-2">
              <ContactTagsList labels={contact.labels} maxVisible={2} size="sm" />
            </div>
          )}
          {contact.pipelines && contact.pipelines.length > 0 && (
            <div className="pt-2">
              <ContactPipelinesBadge contact={contact} maxPipelines={2} compact={true} />
            </div>
          )}
        </div>

        <div className="flex border-t border-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onStartConversation?.(contact);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('card.actions.chat')}
          </Button>
          <div className="w-px bg-sidebar-border" />
          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onViewDetails?.(contact);
            }}
            title={t('card.actions.viewDetails')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <div className="w-px bg-sidebar-border" />
          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onViewEvents?.(contact);
            }}
            title={t('card.actions.viewEvents')}
          >
            <Activity className="h-4 w-4" />
          </Button>
          <div className="w-px bg-sidebar-border" />
          <Button
            variant="ghost"
            className="rounded-none h-12 px-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
            onClick={e => {
              e.stopPropagation();
              onEdit?.(contact);
            }}
            title={t('card.actions.edit')}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
