import { z } from 'zod';
import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type { Graph, Proof, Run } from './contract';
const path = '/instagram_amh_proofs';
export type AutomationSummary = Pick<Proof, 'id' | 'name'> & Partial<Operations['rules'][number]>;
export const proofApi = {
  async list() {
    return extractData<AutomationSummary[]>(await api.get(path));
  },
  async get(id: string) {
    return extractData<Proof>(await api.get(`${path}/${id}`));
  },
  async create(name: string, graph: Graph, create_key: string) {
    return extractData<Proof>(await api.post(path, { name, graph, create_key }));
  },
  async save(proof: Proof, graph: Graph, name?: string) {
    return extractData<Proof>(
      await api.patch(`${path}/${proof.id}`, { graph, name, lock_version: proof.lock_version }),
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
  outbound_enabled: boolean;
  state: string;
  reception_enabled: boolean;
  inbound: {
    available: boolean;
    counts_scope: 'recent_receipts';
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
    state: string;
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
export const operationsSchema = z.object({
  at: z.string().datetime({ offset: true }),
  outbound_enabled: z.boolean(),
  state: z.string(),
  reception_enabled: z.boolean(),
  limit: z.number().int().positive().max(50),
  activation: z.string(),
  private_reply_button: z.string(),
  mautic: z.literal('not_queried'),
  inbound: z.object({
    available: z.boolean(),
    counts_scope: z.literal('recent_receipts'),
    counts: z.record(z.number().int().nonnegative()),
    recent: z
      .array(
        z.object({
          id: z.string(),
          state: z.string(),
          created_at: z.string().datetime({ offset: true }),
          updated_at: z.string().datetime({ offset: true }),
        }),
      )
      .max(50),
  }),
  rules: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        state: z.string(),
        version: z.number().int().positive().nullable(),
        draft_changed: z.boolean(),
        scope: z.object({
          account: z.string().optional(),
          ad: z.string().optional(),
          media: z.string().optional(),
        }),
        material: z.string(),
        keywords: z.array(z.string()),
        preview: z.string(),
        simulations: z.number().int().nonnegative(),
        last_simulation: z
          .object({
            outcome: z.string(),
            at: z.string().datetime({ offset: true }),
            outbound_calls: z.number().int().nonnegative(),
          })
          .nullable(),
      }),
    )
    .max(50),
});
export const operationsApi = {
  async get() {
    return operationsSchema.parse(extractData<unknown>(await api.get(`${path}/operations`)));
  },
};
