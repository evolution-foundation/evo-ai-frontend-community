import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import { proofApi } from './api';
import type { Proof } from './contract';
export type Catalog = {
  account: { id: string; label: string };
  publications: { id: string; label: string; permalink?: string; source: string; ad?: string }[];
  execution_available: boolean;
  comment_like_status?: 'connection_required' | 'configured' | 'disabled';
  test_available: boolean;
};
export type Delivery = {
  id: string;
  version_id: string;
  state: string;
  prompt_state?: string;
  public_reply_state?: string;
  public_reply_reason?: string;
  like_state?: string;
  like_reason?: string | null;
  like_accepted_at?: string | null;
  confirmation_received_at?: string | null;
  reason: string;
  created_at: string;
  updated_at: string;
};
export type TestEvent = { id: string; media: string; text: string; at: string; delivered: boolean };
const path = '/instagram_amh_proofs';
export const automationApi = {
  ...proofApi,
  async catalog() {
    return extractData<Catalog>(await api.get(`${path}/catalog`));
  },
  async activate(proof: Proof, version_id: string, audience: string) {
    return extractData<Proof>(
      await api.post(`${path}/${proof.id}/activate`, {
        version_id,
        audience,
        lock_version: proof.lock_version,
      }),
    );
  },
  async deliveries(id: string) {
    return extractData<Delivery[]>(await api.get(`${path}/${id}/deliveries`));
  },
  async testEvents() {
    return extractData<TestEvent[]>(await api.get(`${path}/test_events`));
  },
  async testReply(id: string, event_id: string) {
    return extractData<Delivery>(await api.post(`${path}/${id}/test_reply`, { event_id }));
  },
};
export type AutomationApi = typeof automationApi;
