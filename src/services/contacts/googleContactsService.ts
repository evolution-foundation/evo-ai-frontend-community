import api from '@/services/core/api';

export interface GoogleContactCandidate {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface CrmContactCandidate {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface WhatsappContactCandidate {
  name: string | null;
  phone: string;
}

export interface StatusResponse {
  google_connected: boolean;
  whatsapp_connected: boolean;
}

export interface DiffGoogleResponse {
  connected: boolean;
  only_in_google: GoogleContactCandidate[];
  only_in_crm: CrmContactCandidate[];
}

export interface DiffWhatsappResponse {
  connected: boolean;
  only_in_whatsapp: WhatsappContactCandidate[];
  reason?: string;
}

// Endpoint único (despacha por `acao`), mesmo padrão do Google Calendar em
// Meu Espaço — ver Api::V1::Reports::GoogleContactsController.
async function call<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await api.post('/reports/google_contacts', { acao, ...extra });
  return response.data.data as T;
}

export const googleContactsService = {
  getStatus: () => call<StatusResponse>('status'),
  diffGoogle: () => call<DiffGoogleResponse>('diff_google'),
  importFromGoogle: (name: string, phone: string | null, email: string | null) =>
    call('importar_do_google', { name, phone, email }),
  addToGoogle: (contactId: string) => call('adicionar_ao_google', { contact_id: contactId }),
  diffWhatsapp: () => call<DiffWhatsappResponse>('diff_whatsapp'),
  importWhatsapp: (contacts: WhatsappContactCandidate[]) =>
    call<{ created: number; errors: Array<{ phone: string; message: string }> }>('importar_whatsapp', { contacts }),
};
