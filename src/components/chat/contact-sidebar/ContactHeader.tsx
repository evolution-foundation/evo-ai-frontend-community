import React from 'react';
import { Phone, Mail, MapPin, Hash, Lock } from 'lucide-react';
import { Contact } from '@/types/chat/api';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { isPresenceCapableChannel } from '@/utils/channelUtils';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';

interface ContactHeaderProps {
  contact: Contact | null;
  channelType?: string | null;
}

type AvailabilityStatus = NonNullable<Contact['availability_status']>;

const AVAILABILITY_DOT_CLASS: Record<AvailabilityStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-orange-500',
  offline: 'bg-gray-400',
};

const ContactHeader: React.FC<ContactHeaderProps> = ({ contact, channelType }) => {
  const { t } = useLanguage('chat');
  const { shouldMask, maskPhone, maskEmail, maskIdentifier } = useContactPiiMasking();

  const availability = contact?.availability_status;
  const showPresence = isPresenceCapableChannel(channelType) && !!availability;
  const protectedTitle = shouldMask
    ? t('contactSidebar.contactDetails.dataProtectedTooltip')
    : undefined;

  return (
    <div className="p-4 md:p-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {/* Avatar Grande */}
        <ContactAvatar contact={contact} size="lg" />

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold truncate">
            {contact?.name || t('contactSidebar.contactHeader.contactNoName')}
          </h2>

          {showPresence && availability && (
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`w-2 h-2 ${AVAILABILITY_DOT_CLASS[availability]} rounded-full flex-shrink-0`}
              ></div>
              <span className="text-sm text-muted-foreground">
                {t(`contactSidebar.contactHeader.${availability}`)}
              </span>
            </div>
          )}

          {/* Info Secundária */}
          <div className="mt-3 space-y-1">
            {contact?.phone_number && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {shouldMask && (
                  <Lock className="h-3 w-3 flex-shrink-0" aria-label={protectedTitle} />
                )}
                <span className="truncate" title={protectedTitle}>
                  {maskPhone(contact.phone_number)}
                </span>
              </div>
            )}
            {contact?.identifier && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-3 w-3 flex-shrink-0" />
                {shouldMask && (
                  <Lock className="h-3 w-3 flex-shrink-0" aria-label={protectedTitle} />
                )}
                <span className="truncate" title={protectedTitle}>
                  {maskIdentifier(contact.identifier)}
                </span>
              </div>
            )}
            {contact?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                {shouldMask && (
                  <Lock className="h-3 w-3 flex-shrink-0" aria-label={protectedTitle} />
                )}
                <span className="truncate" title={protectedTitle}>
                  {maskEmail(contact.email)}
                </span>
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
