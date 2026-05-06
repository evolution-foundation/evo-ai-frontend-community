import { useLanguage } from '@/hooks/useLanguage';
import { MessageSquare, Edit, Users, Activity } from 'lucide-react';
import { Contact } from '@/types/contacts';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import ContactStatusBadge from './ContactStatusBadge';
import ContactTagsList from './ContactTagsList';
import ContactTypeBadge from './ContactTypeBadge';
import ContactPipelinesBadge from './ContactPipelinesBadge';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContacts: Contact[];
  loading?: boolean;
  onSelectionChange: (contacts: Contact[]) => void;
  onContactClick: (contact: Contact) => void;
  onStartConversation: (contact: Contact) => void;
  onEditContact: (contact: Contact) => void;
  onViewEvents?: (contact: Contact) => void;
  onCreateContact?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function ContactsTable({
  contacts,
  selectedContacts,
  loading,
  onSelectionChange,
  onContactClick,
  onStartConversation,
  onEditContact,
  onViewEvents,
  onCreateContact,
  sortBy,
  sortOrder,
  onSort,
}: ContactsTableProps) {
  const { t } = useLanguage('contacts');
  const contactsList = contacts || [];

  // const formatLastActivity = (date: string) => {
  //   if (!date) return 'Nunca';
  //   try {
  //     return formatDistanceToNow(new Date(date), {
  //       addSuffix: true,
  //       locale: ptBR,
  //     });
  //   } catch {
  //     return 'Data inválida';
  //   }
  // };

  const columns: TableColumn<Contact>[] = [
    {
      key: 'contact',
      label: t('table.columns.contact'),
      sortable: true,
      render: contact => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 py-2"
          onClick={() => onContactClick(contact)}
        >
          <ContactAvatar contact={contact} size="md" showColoredFallback={true} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate mb-1">
              {contact.name || t('table.noName')}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {contact.email && <span className="truncate">{contact.email}</span>}
              {contact.email && contact.phone_number && (
                <span className="text-muted-foreground/50">|</span>
              )}
              {contact.phone_number && (
                <span className="whitespace-nowrap">{contact.phone_number}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: t('table.columns.type'),
      sortable: false,
      render: contact => (
        <ContactTypeBadge type={contact.type || 'person'} className="justify-center" />
      ),
    },
    {
      key: 'labels',
      label: t('table.columns.tags'),
      sortable: false,
      render: contact => <ContactTagsList labels={contact.labels} maxVisible={3} size="sm" />,
    },
    {
      key: 'pipelines',
      label: t('table.columns.pipelines'),
      sortable: false,
      render: contact =>
        contact.pipelines && contact.pipelines.length > 0 ? (
          <ContactPipelinesBadge contact={contact} maxPipelines={2} compact={true} />
        ) : null,
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      sortable: false,
      render: contact => <ContactStatusBadge blocked={contact.blocked} />,
    },
  ];

  const actions: TableAction<Contact>[] = [
    {
      label: t('table.actions.startConversation'),
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: onStartConversation,
      show: contact => !contact.blocked,
    },
    {
      label: t('table.actions.viewEvents'),
      icon: <Activity className="h-4 w-4" />,
      onClick: onViewEvents!,
      show: () => !!onViewEvents,
    },
    {
      label: t('table.actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditContact,
    },
  ];

  return (
    <BaseTable<Contact>
      data={contactsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedContacts}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Users}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateContact
          ? {
              label: t('table.actions.create'),
              onClick: onCreateContact,
            }
          : undefined
      }
      getRowKey={contact => String(contact.id)}
      className="border-0 shadow-none"
    />
  );
}
