/**
 * Shared i18n parity helpers (EVO-1430).
 *
 * Extracted from the original journey-only spec (EVO-1260) so the same
 * anti-leakage machinery can run over every locale file in the catalog.
 */

/** Flatten a nested locale object into dot-delimited leaf keys. */
export function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/** Flatten into a `{ 'dot.path': value }` map preserving leaf values. */
export function flattenWithValues(obj: unknown, prefix = ''): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenWithValues(v, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

/** Read the value at a dot-delimited path, or `undefined` if absent. */
export function getAtPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, seg) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[seg];
  }, obj);
}

/**
 * Pure-interpolation values built only from placeholders and numeric/symbolic
 * separators (e.g. "{{count}}/1000", "{{progress}}%", "{{duration}} {{unit}}").
 * These have no translatable language.
 */
export const PURE_INTERPOLATION_RE = /^(?:\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}[^a-zA-Z]*)+$/;

/**
 * JSON object / array blob. Shape alone is not enough — `{{count}} providers`
 * and `[draft] Welcome` also open with a brace, so the value must parse.
 */
function isJsonBlob(v: string): boolean {
  if (!/^[[{]/.test(v)) return false;
  try {
    const parsed: unknown = JSON.parse(v);
    return parsed !== null && typeof parsed === 'object';
  } catch {
    return false;
  }
}

/**
 * Structurally non-translatable values — identical in every locale by nature,
 * so they never count as leakage and don't need an explicit allowlist entry.
 * Covers: pure interpolation, bare numbers, hex colors, URLs, masked secrets,
 * and strings with no Latin letters at all (symbols, separators, units).
 */
export function isIgnorableValue(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (PURE_INTERPOLATION_RE.test(v)) return true;
  if (/^\d+$/.test(v)) return true; // pure number (ports, counts)
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true; // hex color
  if (/^https?:\/\//.test(v)) return true; // URL
  if (isJsonBlob(v)) return true;
  if (/^ex:\s/i.test(v)) return true; // "Ex: ..." form-field sample placeholder
  if (/^\S+\.\.\.$/.test(v)) return true; // single-token masked sample ("sk-...", "SK...")
  if (!/[a-zA-Z]/.test(v)) return true; // symbol/separator/mask only
  return false;
}

export interface FileLocalePair {
  file: string;
  en: Record<string, unknown>;
  pt: Record<string, unknown>;
}

/**
 * Find English-leakage entries: pt-BR values byte-identical to EN that are
 * neither structurally ignorable nor explicitly allowlisted. Returns a list
 * of `key = "value"` strings (the AC-mandated failure shape).
 */
export function findLeaks(
  en: Record<string, unknown>,
  pt: Record<string, unknown>,
  allowed: Set<string>,
): string[] {
  const enFlat = flattenWithValues(en);
  const ptFlat = flattenWithValues(pt);
  const leaks: string[] = [];
  for (const [key, enVal] of Object.entries(enFlat)) {
    const ptVal = ptFlat[key];
    if (typeof enVal !== 'string' || typeof ptVal !== 'string') continue;
    if (!enVal.trim()) continue;
    if (enVal !== ptVal) continue;
    if (isIgnorableValue(enVal)) continue;
    if (allowed.has(enVal)) continue;
    leaks.push(`${key} = ${JSON.stringify(enVal)}`);
  }
  return leaks;
}

/** Keys present in EN but missing in pt-BR (breaks AC: pt-BR must render fully). */
export function missingKeys(en: Record<string, unknown>, pt: Record<string, unknown>): string[] {
  const ptKeys = new Set(flatten(pt));
  return flatten(en).filter((k) => !ptKeys.has(k));
}

/** String leaf keys whose value is an empty/whitespace-only string. */
export function emptyValueKeys(obj: Record<string, unknown>): string[] {
  const flat = flattenWithValues(obj);
  const empties: string[] = [];
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== 'string') continue;
    if (v.trim() === '') empties.push(k);
  }
  return empties;
}

const PT_LETTERS = /[ãõçâêôÃÕÇÂÊÔ]/u;

// Accent-stripped. Only forms Spanish and English lack: shared ones (para, que, pelo,
// salvar) would flag correct Spanish.
const PT_WORDS = [
  // function words
  'nao', 'voce', 'tambem', 'entao', 'ate', 'um', 'uns', 'uma', 'umas', 'com', 'em', 'ao',
  'aos', 'ou', 'seu', 'sua', 'seus', 'suas', 'meu', 'minha', 'meus', 'minhas', 'nosso',
  'nossa', 'isso', 'isto', 'nenhum', 'nenhuma', 'muito', 'muitos', 'muita', 'mais', 'outro',
  'outra', 'tudo', 'bom', 'boa', 'agora', 'ainda', 'depois', 'quando', 'onde', 'hoje',
  'novamente', 'tem', 'ter', 'foi', 'deve', 'devem', 'pode', 'podem', 'posso', 'fazer',
  // verbs and UI labels
  'carregando', 'digite', 'insira', 'preencha', 'descreva', 'selecione', 'selecionar',
  'selecionado', 'selecionada', 'selecionados', 'escolha', 'escolher', 'limpar', 'voltar',
  'deletar', 'deletando', 'pesquisar', 'cadastro', 'cadastrar', 'ativar', 'desativar',
  'atualizar', 'atualizado', 'atualizada', 'gerenciar', 'gerar', 'gerado', 'baixar',
  'aprovar', 'aprovado', 'rejeitar', 'tente', 'deseja', 'ajuda', 'ajudar', 'obrigado',
  'obrigatorio', 'obrigatoria', 'obrigatorios', 'configuracoes', 'alteracoes', 'erro',
  'sucesso', 'senha', 'conta', 'contas', 'nome', 'novo', 'nova', 'ativo', 'ativa', 'ativos',
  'ativas', 'inativo', 'inativa', 'aberto', 'pendente', 'pendentes', 'resolvido',
  'desconhecido', 'disponivel', 'disponiveis', 'mensagem', 'mensagens', 'resposta',
  'respostas', 'contato', 'contatos', 'conteudo', 'ferramenta', 'ferramentas', 'chave',
  'segredo', 'credenciais', 'canais', 'campanha', 'campanhas', 'atendimento', 'atendente',
  'atendentes', 'prioridade', 'arquivo', 'arquivos', 'telefone', 'tarefa', 'tarefas',
  'imagem', 'comunidade', 'funil', 'chamado', 'produto', 'produtos', 'cor', 'identidade',
  'saida', 'conhecimento', 'itens', 'rascunho', 'pagamento', 'painel', 'analise',
  'variaveis', 'atividade', 'membros', 'estagio', 'palavras', 'assunto', 'passos', 'baixa',
  'desempenho', 'loja', 'assistente', 'relatorio', 'relatorios', 'acesso',
];
const PT_WORD_RE = new RegExp(`(?<![\\p{L}\\p{N}.@/_-])(?:${PT_WORDS.join('|')})(?![\\p{L}\\p{N}_-])`, 'u');
// Standalone "é" ("is"): Spanish uses é only inside words.
const PT_IS_RE = /(?<!\p{L})é(?!\p{L})/u;
// Spanish writes ll/ñ where Portuguese writes lh ("detalhes", "melhor").
const PT_LH_RE = /\p{L}+lh\p{L}+/u;

/**
 * The Portuguese marker in an en/es value, or `null`. Parity checks the key, not the
 * text, so a pt-BR value pasted to satisfy it would otherwise ship. Catches about three
 * in four pasted sentences and half the one-word labels.
 */
export function portugueseMarker(value: string): string | null {
  const text = value.replace(/\{\{[^}]*\}\}|<[^>]*>/g, ' ').toLowerCase();
  const letter = text.match(PT_LETTERS);
  if (letter) return letter[0];
  if (PT_IS_RE.test(text)) return 'é';
  const plain = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return plain.match(PT_WORD_RE)?.[0] ?? plain.match(PT_LH_RE)?.[0] ?? null;
}

/** `key = "value"` for every string value with Portuguese in it, skipping `allowedKeys`. */
export function findPortuguese(locale: Record<string, unknown>, allowedKeys: Set<string>): string[] {
  return Object.entries(flattenWithValues(locale))
    .filter(([key, value]) => typeof value === 'string' && !allowedKeys.has(key) && portugueseMarker(value))
    .map(([key, value]) => `${key} = ${JSON.stringify(value)}`);
}
