import type { Node, Edge } from '@xyflow/react';
export const stages = ['comment', 'scope', 'keyword', 'material', 'reply', 'result'] as const;
export type Stage = (typeof stages)[number];
export const labels: Record<Stage, string> = {
  comment: 'Comentário recebido',
  scope: 'Conta e publicação',
  keyword: 'Palavra-chave',
  material: 'Material e link',
  reply: 'Resposta privada',
  result: 'Resultado e falha',
};
export type Parameters = {
  account?: string;
  allContent?: boolean;
  mappings?: { account: string; ad: string; media: string; material: string; editorial?: string }[];
  inventoryRevision?: string;
  routes?: { material: string; keywords: string[] }[];
  ad?: string;
  media?: string;
  keywords?: string[];
  mode?: 'word' | 'contains' | 'fixed' | 'context';
  ignoreCase?: boolean;
  ignoreAccents?: boolean;
  material?: string;
  text?: string;
  confirmationRequired?: boolean;
  openingText?: string;
  publicReplyEnabled?: boolean;
  publicReplyText?: string;
  publicReplyVariants?: string[];
  buttonLabel?: string;
  traceStatus?: string;
};
export type ProofNode = Node<Parameters, Stage>;
export type Graph = { nodes: ProofNode[]; edges: Edge[] };
export type Version = {
  id: string;
  number: number;
  graph: Graph;
  at: string;
  actor: string;
  digest: string;
  state: 'paused';
};
export type Trace = { node: Stage; status: string; reason: string; at: string; attempts: number };
export type Run = {
  id: string;
  key: string;
  version_id: string;
  version_number: number;
  graph_digest: string;
  fixture: string;
  outcome: string;
  at: string;
  material: string;
  trace: Trace[];
  preview: string;
  outbound_calls: number;
  mautic_state: string;
};
export type Proof = {
  id: string;
  name: string;
  draft: Graph;
  versions: Version[];
  ledger: Run[];
  lock_version: number;
  state: 'paused' | 'test' | 'active';
  outbound_enabled: boolean;
  active_version_id?: string | null;
};
export const fixtures = {
  eligible: 'Comentário elegível',
  negative: 'Sem palavra-chave',
  scope_mismatch: 'Conta/publicação diferente',
  timeout: 'Timeout da resposta',
  repeated: 'Comentário repetido',
  expired: 'Janela expirada',
  conflict: 'Conflito entre regras',
  missing_material: 'Material ausente',
};
export function initialGraph(): Graph {
  const parameters: Record<Stage, Parameters> = {
    comment: {},
    scope: { account: 'qa-account', ad: 'qa-ad', media: 'qa-media' },
    keyword: { keywords: ['AMH'], mode: 'word', ignoreCase: true, ignoreAccents: true },
    material: { material: 'amh' },
    reply: {
      confirmationRequired: true,
      publicReplyEnabled: true,
      publicReplyText: 'Te enviei uma mensagem no Direct. Confira também as solicitações de mensagem! ',
      openingText: 'Oi, {{primeiro_nome}}! Você pediu o material sobre AMH. Posso enviar o acesso por aqui?',
      text: 'Aqui está o acesso ao material. Toque no botão, preencha seus dados e o PDF será liberado. Você também recebe por e-mail.',
      buttonLabel: 'Acessar material',
    },
    result: {},
  };
  return {
    nodes: stages.map((id, i) => ({
      id,
      type: id,
      position: { x: i * 280, y: (i % 2) * 65 },
      data: parameters[id],
    })),
    edges: stages
      .slice(0, -1)
      .map((id, i) => ({ id: `${id}-${stages[i + 1]}`, source: id, target: stages[i + 1] })),
  };
}
// Only persist domain fields; ReactFlow selection/measured internals are ephemeral.
export function cleanGraph(graph: Graph): Graph {
  return {
    nodes: graph.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: graph.edges.map(({ id, source, target }) => ({ id, source, target })),
  };
}
