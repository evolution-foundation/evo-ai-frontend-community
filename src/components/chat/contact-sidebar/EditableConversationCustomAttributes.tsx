import CustomAttributesForm from '@/components/customAttributes/CustomAttributesForm';
import { chatService } from '@/services/chat/chatService';
import { Conversation } from '@/types/chat/api';

interface EditableConversationCustomAttributesProps {
  conversation: Conversation | null;
  onConversationUpdate?: () => void;
}

/**
 * EditableConversationCustomAttributes component.
 * Wrapper around the generic CustomAttributesForm component for conversations in editable mode.
 */
export default function EditableConversationCustomAttributes({
  conversation,
  onConversationUpdate,
}: EditableConversationCustomAttributesProps) {
  const handleUpdateAttributes = async (updatedAttributes: Record<string, unknown>) => {
    if (!conversation) {
      throw new Error('Conversation is required');
    }
    await chatService.updateConversationCustomAttributes(conversation.id, updatedAttributes);
  };

  return (
    <CustomAttributesForm
      attributeModel="conversation_attribute"
      attributes={conversation?.custom_attributes}
      mode="editable"
      onUpdateAttributes={handleUpdateAttributes}
      onUpdateSuccess={onConversationUpdate}
      translationNamespace="chat"
      translationKeys={{
        updateSuccess: 'contactSidebar.conversationAttributes.updateSuccess',
        updateError: 'contactSidebar.conversationAttributes.updateError',
        noAttributes: 'contactSidebar.conversationAttributes.noAttributes',
        yes: 'contactSidebar.conversationAttributes.yes',
        no: 'contactSidebar.conversationAttributes.no',
      }}
    />
  );
}
