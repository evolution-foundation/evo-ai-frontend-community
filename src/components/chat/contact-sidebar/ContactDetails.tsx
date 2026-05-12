/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { useConversations } from '@/hooks/chat/useConversations';

import { contactsService } from '@/services/contacts/contactsService';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';

import { Button } from '@evoapi/design-system/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@evoapi/design-system/card';
import {
  User,
  Phone,
  Mail,
  // MapPin,
  Settings,
  Info,
  Clock,
  Calendar,
  Activity,
  Copy,
  Hash,
  Edit,
} from 'lucide-react';

import { toast } from 'sonner';

import ContactModal from '@/components/contacts/ContactModal';

import { Contact } from '@/types/chat/api';
import { Contact as FullContact, ContactFormData } from '@/types/contacts';

interface ContactDetailsProps {
  contact: Contact | null;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ contact }) => {
  const { t } = useLanguage('chat');

  const { updateContactInConversations } = useConversations();

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<FullContact | null>(null);

  const formatCustomAttributeKey = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return t('contactSidebar.contactDetails.notInformed');

    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContactFormSubmit = async (data: ContactFormData) => {
    if (!contact?.id) return;

    try {
      // Atualizar o contato
      const updatedContactResponse = await contactsService.updateContact(contact.id, data);

      // Converter o tipo de Contact de @/types/contacts para Contact de @/pages/Customer/Chat/types/api
      const updatedContact: Contact = {
        id: updatedContactResponse.id,
        name: updatedContactResponse.name,
        email: updatedContactResponse.email || null,
        phone_number: updatedContactResponse.phone_number || null,
        avatar: updatedContactResponse.avatar || null,
        avatar_url: updatedContactResponse.avatar_url || null,
        identifier: updatedContactResponse.identifier || null,
        custom_attributes: updatedContactResponse.custom_attributes || {},
        additional_attributes: (updatedContactResponse.additional_attributes || {}) as Record<string, unknown>,
        contact_inboxes: (updatedContactResponse.contact_inboxes || []) as unknown as Record<string, unknown>,
        location: null, // Propriedade não disponível no tipo de @/types/contacts
        country_code: null, // Propriedade não disponível no tipo de @/types/contacts
        blocked: updatedContactResponse.blocked || false,
        last_activity_at: updatedContactResponse.last_activity_at || '',
        created_at: updatedContactResponse.created_at || '',
        updated_at: updatedContactResponse.updated_at || '',
      };

      updateContactInConversations(updatedContact);

      toast.success(t('contactSidebar.contactDetails.actions.updateSuccess'));

      setContactModalOpen(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(t('contactSidebar.contactDetails.actions.updateError'));
    }
  };

  const handleEditContact = () => {
    if (contact) {
      // Converter Contact do Chat para FullContact
      setEditingContact(contact as unknown as FullContact);
    }
    setContactModalOpen(true);
  };

  const handleContactModalClose = (open: boolean) => {
    setContactModalOpen(open);
  };

  if (!contact) return null;

  return (
    <div className="space-y-3">
      {/* Informações Básicas */}
      <Card className="border-0 shadow-none bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('contactSidebar.contactDetails.sections.basicInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {contact?.name && (
            <InfoField
              label={t('contactSidebar.contactDetails.fields.name')}
              value={contact.name}
              icon={<User className="h-4 w-4" />}
            />
          )}
          {contact?.phone_number && (
            <InfoField
              label={t('contactSidebar.contactDetails.fields.phone')}
              value={formatContactPhone(contact.phone_number) ?? contact.phone_number}
              icon={<Phone className="h-4 w-4" />}
              copyable
            />
          )}
          {contact?.identifier && (
            <InfoField
              label={t('contactSidebar.contactDetails.fields.identifier')}
              value={contact.identifier}
              icon={<Hash className="h-4 w-4" />}
              copyable
            />
          )}
          {contact?.email && (
            <InfoField
              label={t('contactSidebar.contactDetails.fields.email')}
              value={contact.email}
              icon={<Mail className="h-4 w-4" />}
              copyable
            />
          )}
          {/* {contact?.location && (
            <InfoField
              label={t('contactSidebar.contactDetails.fields.location')}
              value={contact.location}
              icon={<MapPin className="h-4 w-4" />}
            />
          )} */}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={handleEditContact}>
            <Edit className="h-4 w-4" />
            {t('contactSidebar.contactDetails.actions.edit')}
          </Button>
        </CardFooter>
      </Card>

      {/* Custom Attributes */}
      {contact?.custom_attributes &&
        Object.keys(contact.custom_attributes).length > 0 &&
        (() => {
          // Filtrar atributos com valores válidos
          const validAttributes = Object.entries(contact.custom_attributes).filter(([_, value]) => {
            if (!value) return false;
            const stringValue = String(value);
            // Ignorar valores vazios, null, undefined, ou "[object Object]"
            return (
              stringValue &&
              stringValue.trim() !== '' &&
              stringValue !== 'null' &&
              stringValue !== 'undefined' &&
              stringValue !== '[object Object]' &&
              stringValue.toLowerCase() !== 'not informed'
            );
          });

          if (validAttributes.length === 0) return null;

          return (
            <Card className="border-0 shadow-none bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('contactSidebar.contactDetails.sections.customAttributes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {validAttributes.map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={formatCustomAttributeKey(key)}
                    value={String(value)}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })()}

      {/* Additional Attributes */}
      {contact?.additional_attributes &&
        Object.keys(contact.additional_attributes).length > 0 &&
        (() => {
          // Filtrar atributos com valores válidos
          const validAttributes = Object.entries(contact.additional_attributes).filter(
            ([_, value]) => {
              if (!value) return false;
              const stringValue = String(value);
              // Ignorar valores vazios, null, undefined, ou "[object Object]"
              return (
                stringValue &&
                stringValue.trim() !== '' &&
                stringValue !== 'null' &&
                stringValue !== 'undefined' &&
                stringValue !== '[object Object]' &&
                stringValue.toLowerCase() !== 'not informed'
              );
            },
          );

          if (validAttributes.length === 0) return null;

          return (
            <Card className="border-0 shadow-none bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('contactSidebar.contactDetails.sections.additionalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {validAttributes.map(([key, value]) => (
                  <InfoField
                    key={key}
                    label={formatCustomAttributeKey(key)}
                    value={String(value)}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })()}

      {/* Timestamps */}
      <Card className="border-0 shadow-none bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('contactSidebar.contactDetails.sections.history')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <InfoField
            label={t('contactSidebar.contactDetails.fields.createdAt')}
            value={formatDate(contact?.created_at)}
            icon={<Calendar className="h-4 w-4" />}
          />
          <InfoField
            label={t('contactSidebar.contactDetails.fields.lastActivity')}
            value={formatDate(contact?.last_activity_at)}
            icon={<Activity className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      <ContactModal
        open={contactModalOpen}
        onOpenChange={handleContactModalClose}
        contact={editingContact || undefined}
        isNew={!editingContact}
        loading={false}
        onSubmit={handleContactFormSubmit}
      />
    </div>
  );
};

// Componente auxiliar para campos de informação
interface InfoFieldProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  copyable?: boolean;
}

const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon, copyable = false }) => {
  const { t } = useLanguage('chat');

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      toast.success(t('contactSidebar.contactDetails.copiedToClipboard'));
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {icon}
        <span className="text-sm text-muted-foreground">{label}:</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate max-w-48">
          {value || t('contactSidebar.contactDetails.notInformed')}
        </span>

        {copyable && value && (
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ContactDetails;
