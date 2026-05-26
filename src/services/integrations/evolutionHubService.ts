// Service pra consultar o que está configurado no Evolution Hub a partir
// do CRM. Bate nos endpoints proxy do CRM (que por trás chamam o Hub
// usando a API key configurada em /admin/app_configs/evolution_hub).
//
// Usado pela tela Admin → Evolution Hub pra mostrar "Configuração detectada"
// depois que o admin salva URL + API key.

import api from '../core/api';
import { extractData } from '../../utils/apiHelpers';

/** GET /integrations/evolution_hub/plan response shape (subset). */
export interface HubPlan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  allow_own_meta_app: boolean;
  allow_shared_meta_app: boolean;
  max_channels_total: number | null;
  max_webhooks: number | null;
  max_byo_credentials: number | null;
}

/** GET /integrations/evolution_hub/meta_app_options response shape. */
export interface MetaAppOptionCred {
  id: string;
  name: string;
  app_id: string;
}

export interface MetaAppOptions {
  allowed_modes: ('shared' | 'byo')[];
  shared_configured: boolean;
  shared_allowed_by_plan: boolean;
  byo_allowed_by_plan: boolean;
  max_byo_credentials?: number | null;
  byo_credentials: MetaAppOptionCred[];
}

/** GET /integrations/evolution_hub/channels item shape (subset). */
export interface HubChannel {
  id: string;
  name: string;
  type: 'whatsapp' | 'facebook' | 'instagram';
  status: string;
  channel_credentials_id?: string | null;
  created_at?: string;
}

class EvolutionHubService {
  async getPlan(): Promise<HubPlan> {
    const response = await api.get('/integrations/evolution_hub/plan');
    return extractData<HubPlan>(response);
  }

  async getMetaAppOptions(): Promise<MetaAppOptions> {
    const response = await api.get('/integrations/evolution_hub/meta_app_options');
    return extractData<MetaAppOptions>(response);
  }

  /**
   * Hub devolve `{ channels: [...] }` ou array direto dependendo da versão.
   * Normalizamos pra sempre devolver array.
   */
  async listChannels(): Promise<HubChannel[]> {
    const response = await api.get('/integrations/evolution_hub/channels');
    const data = extractData<HubChannel[] | { channels?: HubChannel[]; data?: HubChannel[] }>(response);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { channels?: HubChannel[] }).channels)) {
      return (data as { channels: HubChannel[] }).channels;
    }
    if (data && Array.isArray((data as { data?: HubChannel[] }).data)) {
      return (data as { data: HubChannel[] }).data;
    }
    return [];
  }
}

export const evolutionHubService = new EvolutionHubService();
