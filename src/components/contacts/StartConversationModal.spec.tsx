import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contact, ContactableInboxes } from '@/types/contacts';
import type { MessageTemplate } from '@/types/channels/inbox';
import StartConversationModal from './StartConversationModal';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetContactableInboxes = vi.fn();
vi.mock('@/services/contacts', () => ({
  contactsService: {
    getContactableInboxes: (...args: unknown[]) => mockGetContactableInboxes(...args),
  },
}));

const mockGetTemplates = vi.fn();
vi.mock('@/services/channels/messageTemplatesService', () => ({
  default: {
    getTemplates: (...args: unknown[]) => mockGetTemplates(...args),
  },
}));

vi.mock('@/services/conversations', () => ({
  conversationAPI: {
    createConversation: vi.fn(),
  },
}));

const contact: Contact = {
  id: 'contact-1',
  name: 'Cliente Teste',
  type: 'person',
  email: '',
  phone_number: '+5531900000000',
  thumbnail: '',
  avatar: '',
  avatar_url: '',
  tax_id: '',
  website: '',
  industry: '',
  created_at: '',
  updated_at: '',
  availability_status: 'offline',
  blocked: false,
  custom_attributes: {},
  additional_attributes: {},
  contact_inboxes: [],
};

const whatsappCloudInbox: ContactableInboxes = {
  id: '101',
  channel_id: 'ch-101',
  name: 'evolution-suporte',
  channel_type: 'Channel::Whatsapp',
  enable_auto_assignment: true,
  greeting_enabled: false,
  greeting_message: '',
  working_hours_enabled: false,
  out_of_office_message: null,
  timezone: 'America/Sao_Paulo',
  enable_email_collect: false,
  csat_survey_enabled: false,
  allow_messages_after_resolved: true,
  auto_assignment_config: {},
  sender_name_type: 'friendly',
  business_name: null,
  avatar_url: '',
  created_at: 0,
  updated_at: 0,
  available: true,
  can_create_conversation: true,
  source_id: '+5531900000000',
  channel: { provider: 'whatsapp_cloud' } as unknown as ContactableInboxes['channel'],
};

const localPendingTemplate: MessageTemplate = {
  id: 'tpl-1',
  name: 'ini_conversa',
  content: 'Olá, tudo bem?',
  language: 'pt_BR',
  category: 'UTILITY',
  template_type: 'text',
  settings: {},
  components: [{ text: 'Olá, tudo bem?', type: 'BODY' }],
  variables: [],
  active: true,
};

const approvedTemplate: MessageTemplate = {
  id: 'tpl-2',
  name: 'welcome',
  content: 'Bem-vindo',
  language: 'pt_BR',
  category: 'MARKETING',
  template_type: 'text',
  settings: { status: 'APPROVED' },
  components: [{ text: 'Bem-vindo', type: 'BODY' }],
  variables: [],
  active: true,
};

describe('StartConversationModal — template filtering (EVO-1002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a pending locally-created template in the selector with a pending badge', async () => {
    mockGetContactableInboxes.mockResolvedValue([whatsappCloudInbox]);
    mockGetTemplates.mockResolvedValue({ data: [localPendingTemplate] });

    render(
      <StartConversationModal open onOpenChange={vi.fn()} contact={contact} />,
    );

    // The template name is eventually rendered in the selector.
    await waitFor(() => {
      expect(screen.getByText('ini_conversa')).toBeTruthy();
    });

    // The "Pendente" badge copy (i18n key) is rendered alongside the name.
    expect(
      screen.getByText('startConversation.templates.statusBadge.pending'),
    ).toBeTruthy();

    // The "noApproved" warning fires because no template is sendable.
    expect(
      screen.getByText(
        content => typeof content === 'string' && content.includes('startConversation.templates.noApproved'),
      ),
    ).toBeTruthy();
  });

  it('shows the "noneForInbox" warning when the backend returns zero templates', async () => {
    mockGetContactableInboxes.mockResolvedValue([whatsappCloudInbox]);
    mockGetTemplates.mockResolvedValue({ data: [] });

    render(
      <StartConversationModal open onOpenChange={vi.fn()} contact={contact} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          content =>
            typeof content === 'string' &&
            content.includes('startConversation.templates.noneForInbox'),
        ),
      ).toBeTruthy();
    });

    expect(
      screen.queryByText(
        content =>
          typeof content === 'string' &&
          content.includes('startConversation.templates.noApproved'),
      ),
    ).toBeNull();
  });

  it('does not render the noApproved warning when an approved template exists', async () => {
    mockGetContactableInboxes.mockResolvedValue([whatsappCloudInbox]);
    mockGetTemplates.mockResolvedValue({
      data: [approvedTemplate, localPendingTemplate],
    });

    render(
      <StartConversationModal open onOpenChange={vi.fn()} contact={contact} />,
    );

    await waitFor(() => {
      expect(screen.getByText('welcome')).toBeTruthy();
    });

    // The pending template is still visible in the list.
    expect(screen.getByText('ini_conversa')).toBeTruthy();

    // No approved-gate warning because there IS an approved template.
    expect(
      screen.queryByText(
        content =>
          typeof content === 'string' &&
          content.includes('startConversation.templates.noApproved'),
      ),
    ).toBeNull();
  });
});
