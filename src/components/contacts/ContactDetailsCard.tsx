import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState } from 'react';
import { Button, Card, CardContent } from '@evoapi/design-system';
import { Edit, Lock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';
import { unixTimestampToIso } from '@/utils/chat/contactTimestamp';
import ContactStatusBadge from './ContactStatusBadge';
import ContactForm from './ContactForm';
import ContactTagsList from './ContactTagsList';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import type { Contact, ContactFormData } from '@/types/contacts';

interface ContactDetailsCardProps {
  /** Required unless isNew — the new-contact card has no existing record to show/edit. */
  contact?: Contact;
  loading?: boolean;
  onSave: (data: ContactFormData) => void | Promise<void>;
  /** New-contact mode: card opens already in edit mode, with no Cancel-back-to-view
   *  (Cancel is wired by the caller to navigate away instead — there's no view state
   *  to fall back to for a contact that doesn't exist yet). */
  isNew?: boolean;
  onCancelNew?: () => void;
}

// Contact.created_at is typed as `string` but the API actually returns a Unix
// timestamp (seconds), same as elsewhere in this codebase (see contactTimestamp.ts).
// Normalize through unixTimestampToIso before formatting, otherwise a raw epoch-seconds
// value is misread as epoch-milliseconds by `new Date()` and renders as 1970.
function formatDate(dateValue?: string | number): string | null {
  if (!dateValue && dateValue !== 0) return null;
  const iso = unixTimestampToIso(dateValue) ?? (typeof dateValue === 'string' ? dateValue : undefined);
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString(getFormattingLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  masked?: boolean;
  protectedTitle?: string;
}

function FieldRow({ label, value, masked, protectedTitle }: FieldRowProps) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0">
      <span className="shrink-0 basis-[170px] text-sm text-muted-foreground">{label}</span>
      <span
        className="flex items-center gap-1.5 min-w-0 flex-1 text-[13.5px] font-medium text-foreground truncate"
        title={protectedTitle}
      >
        {masked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={protectedTitle} />}
        {value || '—'}
      </span>
    </div>
  );
}

const SOCIAL_KEYS = ['linkedin', 'facebook', 'instagram', 'twitter', 'github'] as const;

export default function ContactDetailsCard({
  contact,
  loading,
  onSave,
  isNew = false,
  onCancelNew,
}: ContactDetailsCardProps) {
  const { t } = useLanguage('contacts');
  const { shouldMask, maskPhone, maskEmail } = useContactPiiMasking();
  const protectedTitle = shouldMask ? t('card.dataProtectedTooltip') : undefined;
  const [isEditing, setIsEditing] = useState(false);

  if (isNew || isEditing) {
    return (
      <Card>
        <CardContent className="p-5">
          <ContactForm
            contact={isNew ? undefined : contact}
            isNew={isNew}
            loading={loading}
            onSubmit={async data => {
              await onSave(data);
              if (!isNew) setIsEditing(false);
            }}
            onCancel={isNew ? onCancelNew : () => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  // From here on, contact is always defined (isNew is the only caller-side case
  // where it can be omitted, and that branch already returned above).
  if (!contact) return null;

  const isPerson = contact.type === 'person';
  const linkedCompanyName = isPerson ? contact.companies?.[0]?.name : undefined;
  const socialProfiles = contact.additional_attributes?.social_profiles;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <ContactAvatar contact={contact} size="lg" showColoredFallback />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold truncate">{contact.name}</h2>
            </div>
            <div className="mt-1">
              <ContactStatusBadge blocked={contact.blocked} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('details.actions.edit')}
          </Button>
        </div>

        <div className="flex flex-col">
          <FieldRow label={t('details.fields.name')} value={contact.name} />
          <FieldRow label={t('details.fields.taxId')} value={contact.tax_id} />
          <FieldRow
            label={t('details.fields.email')}
            value={contact.email ? maskEmail(contact.email) : null}
            masked={shouldMask && !!contact.email}
            protectedTitle={protectedTitle}
          />
          <FieldRow
            label={t('details.fields.phone')}
            value={contact.phone_number ? maskPhone(contact.phone_number) : null}
            masked={shouldMask && !!contact.phone_number}
            protectedTitle={protectedTitle}
          />
          <FieldRow label={t('details.fields.city')} value={contact.additional_attributes?.city} />
          <FieldRow label={t('details.fields.country')} value={contact.additional_attributes?.country} />
          <FieldRow label={t('details.fields.company')} value={linkedCompanyName} />
          <FieldRow
            label={t('details.sections.description')}
            value={contact.additional_attributes?.description}
          />
          <FieldRow label={t('details.fields.createdAt')} value={formatDate(contact.created_at)} />
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold mb-2">{t('form.sections.labels')}</h3>
          {contact.labels && contact.labels.length > 0 ? (
            <ContactTagsList labels={contact.labels} maxVisible={contact.labels.length} size="sm" />
          ) : (
            <span className="text-[13.5px] text-muted-foreground">—</span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <h3 className="text-sm font-semibold mb-2">{t('details.sections.socialProfiles')}</h3>
          <div className="flex flex-col">
            {SOCIAL_KEYS.map(key => (
              <FieldRow
                key={key}
                label={t(`form.fields.social.${key}.label`)}
                value={socialProfiles?.[key]}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
