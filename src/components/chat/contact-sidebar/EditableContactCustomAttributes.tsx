import { useTranslation as useUiTranslation } from 'react-i18next';
import CustomAttributesForm from '@/components/customAttributes/CustomAttributesForm';
import { contactsService } from '@/services/contacts/contactsService';
import { Contact } from '@/types/chat/api';

interface EditableContactCustomAttributesProps {
  contact: Contact | null;
  onContactUpdate?: () => void;
}

/**
 * EditableContactCustomAttributes component.
 * Wrapper around the generic CustomAttributesForm component for contacts in editable mode.
 */
export default function EditableContactCustomAttributes({
  contact,
  onContactUpdate,
}: EditableContactCustomAttributesProps) {
  const { t: tUi } = useUiTranslation();
  const handleUpdateAttributes = async (updatedAttributes: Record<string, unknown>) => {
    if (!contact) {
      throw new Error(tUi("contacts:scheduledActions.validationRequired.contact"));
    }
    await contactsService.updateContact(contact.id, {
      custom_attributes: updatedAttributes,
    });
  };

  return (
    <CustomAttributesForm
      attributeModel="contact_attribute"
      attributes={contact?.custom_attributes}
      mode="editable"
      onUpdateAttributes={handleUpdateAttributes}
      onUpdateSuccess={onContactUpdate}
      translationNamespace="chat"
      translationKeys={{
        updateSuccess: 'contactSidebar.customAttributes.updateSuccess',
        updateError: 'contactSidebar.customAttributes.updateError',
        noAttributes: 'contactSidebar.customAttributes.noAttributes',
        yes: 'contactSidebar.customAttributes.yes',
        no: 'contactSidebar.customAttributes.no',
      }}
    />
  );
}
