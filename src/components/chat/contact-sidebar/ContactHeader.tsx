import React from 'react';
import { Phone, Mail, MapPin, Hash } from 'lucide-react';
import { Contact } from '@/types/chat/api';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactHeaderProps {
  contact: Contact | null;
}

const ContactHeader: React.FC<ContactHeaderProps> = ({ contact }) => {
  const { t } = useLanguage('chat');

  return (
    <div className="p-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Avatar Grande */}
        <ContactAvatar contact={contact} size="lg" />

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">
            {contact?.name || t('contactSidebar.contactHeader.contactNoName')}
          </h2>

          {/* Status Online/Offline */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            <span className="text-sm text-muted-foreground">{t('contactSidebar.contactHeader.online')}</span>
          </div>

          {/* Info Secundária */}
          <div className="mt-3 space-y-1">
            {contact?.phone_number && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatContactPhone(contact.phone_number)}</span>
              </div>
            )}
            {contact?.identifier && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.identifier}</span>
              </div>
            )}
            {contact?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact?.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contact.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactHeader;
