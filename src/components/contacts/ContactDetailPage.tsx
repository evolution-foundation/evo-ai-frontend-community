import { Button } from '@evoapi/design-system';
import { ArrowLeft, MessageSquare, Users, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import EmptyState from '@/components/base/EmptyState';
import ContactDetailsCard from './ContactDetailsCard';
import ContactNotesCard from './ContactNotesCard';
import ContactPipelineItem from '@/components/pipelines/ContactPipelineItem';
import ContactEventsTab from './ContactEventsTab';
import ContactEventsErrorBoundary from './ContactEventsErrorBoundary';
import type { Contact, ContactFormData } from '@/types/contacts';

interface ContactDetailPageProps {
  contact: Contact | null;
  loading: boolean;
  notFound: boolean;
  formSaving?: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void | Promise<void>;
  onStartConversation: (contact: Contact) => void;
  onContactUpdated?: () => void;
}

export default function ContactDetailPage({
  contact,
  loading,
  notFound,
  formSaving,
  onClose,
  onSave,
  onStartConversation,
  onContactUpdated,
}: ContactDetailPageProps) {
  const { t } = useLanguage('contacts');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('details.page.back')}
          </Button>
          {contact && (
            <h1 className="text-base font-semibold truncate">{contact.name}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {contact && (
            <Button
              size="sm"
              onClick={() => onStartConversation(contact)}
              disabled={contact.blocked}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('details.actions.startConversation')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('details.page.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{t('loading.contacts')}</div>
          </div>
        ) : notFound || !contact ? (
          <EmptyState
            icon={Users}
            title={t('details.page.notFound.title')}
            description={t('details.page.notFound.description')}
            action={{
              label: t('details.page.back'),
              onClick: onClose,
            }}
            className="h-full"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            <div className="flex flex-col gap-4 min-w-0">
              <ContactDetailsCard contact={contact} loading={formSaving} onSave={onSave} />
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold mb-3">{t('details.tabs.pipeline')}</h3>
                <ContactPipelineItem contactId={contact.id} onPipelineUpdated={onContactUpdated} />
              </div>
              <ContactNotesCard contactId={contact.id} />
            </div>
            <div className="min-w-0">
              <ContactEventsErrorBoundary
                fallbackTitle={t('events.timeline.crashed.title')}
                fallbackReload={t('events.timeline.crashed.reload')}
              >
                <ContactEventsTab contactId={contact.id} />
              </ContactEventsErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
