import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { Graph, Proof, Run } from './contract';
const path = '/instagram_amh_proofs';
export const proofApi = {
  async list() {
    return extractData<Pick<Proof, 'id' | 'name'>[]>(await api.get(path));
  },
  async get(id: string) {
    return extractData<Proof>(await api.get(`${path}/${id}`));
  },
  async create(name: string, graph: Graph, create_key: string) {
    return extractData<Proof>(await api.post(path, { name, graph, create_key }));
  },
  async save(proof: Proof, graph: Graph) {
    return extractData<Proof>(
      await api.patch(`${path}/${proof.id}`, { graph, lock_version: proof.lock_version }),
    );
  },
  async publish(proof: Proof) {
    return extractData<Proof>(
      await api.post(`${path}/${proof.id}/publish`, { lock_version: proof.lock_version }),
    );
  },
  async simulate(id: string, version_id: string, fixture: string, text?: string) {
    return extractData<{ proof: Proof; run: Run }>(
      await api.post(`${path}/${id}/simulate`, { version_id, fixture, text }),
    );
  },
};
export type ProofApi = typeof proofApi;

export type Operations = {
  at: string;
  outbound_enabled: false;
  state: 'paused';
  reception_enabled: boolean;
  inbound: {
    available: boolean;
    counts: Record<string, number>;
    recent: { id: string; state: string; created_at: string; updated_at: string }[];
  };
  limit: number;
  activation: string;
  private_reply_button: string;
  mautic: 'not_queried';
  rules: {
    id: string;
    name: string;
    state: 'paused';
    version: number | null;
    draft_changed: boolean;
    scope: { account?: string; ad?: string; media?: string };
    material: string;
    keywords: string[];
    preview: string;
    simulations: number;
    last_simulation: { outcome: string; at: string; outbound_calls: number } | null;
  }[];
};
export const operationsApi = {
  async get() {
    return extractData<Operations>(await api.get(`${path}/operations`));
  },
};
