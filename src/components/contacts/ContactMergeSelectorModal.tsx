import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  ScrollArea,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@evoapi/design-system';
import { Contact } from '@/types/contacts';
import { contactsService } from '@/services/contacts/contactsService';
import { Search, Mail, Phone, Building2, User, Loader2 } from 'lucide-react';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { toast } from 'sonner';

interface ContactMergeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContact: Contact;
  onContactSelected: (contact: Contact) => void;
}

export default function ContactMergeSelectorModal({
  open,
  onOpenChange,
  currentContact,
  onContactSelected,
}: ContactMergeSelectorModalProps) {
  const { t } = useLanguage('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contactsService.getContacts({
        page: 1,
        per_page: 20,
        ...(searchQuery && { query: searchQuery }),
      });

      // Filter out the current contact
      const filteredContacts = response.data.filter((c: Contact) => c.id !== currentContact.id);
      setContacts(filteredContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentContact.id, t]);

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open, loadContacts]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleConfirm = () => {
    if (selectedContact) {
      onContactSelected(selectedContact);
      onOpenChange(false);
      setSelectedContact(null);
      setSearchQuery('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">{t('dialog.selectContactToMerge.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.selectContactToMerge.description', { name: currentContact.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-280px)] px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{searchQuery ? t('empty.title') : t('dialog.selectContactToMerge.noContacts')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(contact => (
                <div
                  key={contact.id}
                  className={`flex items-start space-x-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedContact?.id === contact.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectContact(contact)}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={contact.avatar_url || contact.thumbnail} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{contact.name}</span>
                      {contact.type === 'company' && (
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      {contact.type === 'person' && (
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}

                      {contact.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{formatContactPhone(contact.phone_number)}</span>
                        </div>
                      )}
                    </div>

                    {contact.conversations_count !== undefined && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="font-medium">{contact.conversations_count}</span>{' '}
                        {contact.conversations_count === 1
                          ? t('details.conversations').replace('s', '')
                          : t('details.conversations')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedContact(null);
              setSearchQuery('');
            }}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedContact}>
            {t('dialog.selectContactToMerge.select')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
