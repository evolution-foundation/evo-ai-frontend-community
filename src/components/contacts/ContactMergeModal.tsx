import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  RadioGroup,
  RadioGroupItem,
  Label,
  ScrollArea,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@evoapi/design-system';
import { Contact } from '@/types/contacts';
import { Mail, Phone, Building2, User, Calendar } from 'lucide-react';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';

interface ContactMergeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onConfirm: (parentContactId: string, childContactId: string) => void;
  loading: boolean;
}

export default function ContactMergeModal({
  open,
  onOpenChange,
  contacts,
  onConfirm,
  loading,
}: ContactMergeModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedParentId, setSelectedParentId] = useState<string>(contacts[0]?.id || '');

  const handleConfirm = () => {
    if (!selectedParentId) return;

    // O contato pai é o selecionado, os outros são os filhos que serão mesclados
    const childIds = contacts.filter(c => c.id !== selectedParentId).map(c => c.id);

    // A API aceita apenas um child por vez, então vamos mesclar com o primeiro
    if (childIds.length > 0) {
      onConfirm(selectedParentId, childIds[0]);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">{t('dialog.mergeContacts.title')}</DialogTitle>
          <DialogDescription>{t('dialog.mergeContacts.description')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] px-6 py-4">
          <div className="space-y-4">
            <RadioGroup value={selectedParentId} onValueChange={setSelectedParentId}>
              {contacts.map(contact => (
                <div
                  key={contact.id}
                  className={`relative flex items-start space-x-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedParentId === contact.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedParentId(contact.id)}
                >
                  <RadioGroupItem value={contact.id} id={contact.id} className="mt-1" />

                  <div className="flex-1 space-y-3">
                    <Label htmlFor={contact.id} className="flex items-center gap-3 cursor-pointer">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.avatar_url || contact.thumbnail} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{contact.name}</span>
                          {contact.type === 'company' && (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          {contact.type === 'person' && (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}

                          {contact.phone_number && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{formatContactPhone(contact.phone_number)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>Criado em {formatDate(contact.created_at)}</span>
                          </div>

                          {contact.conversations_count !== undefined && (
                            <div className="text-xs">
                              <span className="font-medium">{contact.conversations_count}</span>{' '}
                              {contact.conversations_count === 1 ? 'conversa' : 'conversas'}
                            </div>
                          )}
                        </div>

                        {contact.additional_attributes?.company_name && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Empresa: </span>
                            <span className="font-medium">
                              {contact.additional_attributes.company_name}
                            </span>
                          </div>
                        )}

                        {contact.labels && contact.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.labels.slice(0, 3).map((label, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                {label}
                              </span>
                            ))}
                            {contact.labels.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{contact.labels.length - 3} mais
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">{t('dialog.mergeContacts.infoTitle')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t('dialog.mergeContacts.info1')}</li>
                <li>{t('dialog.mergeContacts.info2')}</li>
                <li>{t('dialog.mergeContacts.info3')}</li>
                <li>{t('dialog.mergeContacts.info4')}</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('dialog.mergeContacts.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedParentId}
          >
            {loading ? t('dialog.mergeContacts.merging') : t('dialog.mergeContacts.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
