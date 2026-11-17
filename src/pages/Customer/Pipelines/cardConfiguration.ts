import type { CardConfiguration, CardFieldDefinition, Pipeline, PipelineItem } from '@/types/analytics/pipelines';

export const nativeFields: CardFieldDefinition[] = Object.entries({ title: 'Título', value: 'Valor', contact: 'Contato', owner: 'Responsável', labels: 'Etiquetas', channel_origin: 'Canal e origem', utm: 'Campanha (UTM)', stage_age: 'Tempo na etapa', last_activity: 'Última atividade', last_message: 'Última mensagem', next_task: 'Próxima tarefa', created_at: 'Data de criação' }).map(([id, label]) => ({ id, label, type: 'text', source: 'native' }));
export const fixedFields = new Set(['title', 'owner', 'stage_age']);
export function defaultConfiguration(definitions: CardFieldDefinition[] = nativeFields): CardConfiguration {
  const initial = ['title', 'value', 'contact', 'labels', 'owner', 'stage_age'];
  const specialty = definitions.find(field => /especialidade/i.test(field.label));
  if (specialty) initial.splice(3, 0, specialty.id);
  return { version: 1, density: 'comfortable', fields: [...initial, ...definitions.map(field => field.id).filter(id => !initial.includes(id))].map(id => ({ id, visible: initial.includes(id) })) };
}
export function configurationFor(pipeline: Pipeline): CardConfiguration {
  const saved = pipeline.card_configuration;
  const definitions = pipeline.card_field_definitions || nativeFields;
  if (!saved?.fields || saved.version !== 1 || !saved.density) return defaultConfiguration(definitions);
  // Layouts salvos antes da R2 podem citar 'company' (campo removido): chaves sem definição são ignoradas.
  const known = new Set(definitions.map(field => field.id));
  const kept = saved.fields.filter(field => known.has(field.id) || fixedFields.has(field.id));
  return { version: 1, density: saved.density, fields: [...kept, ...definitions.filter(field => !kept.some(savedField => savedField.id === field.id)).map(field => ({ id: field.id, visible: false }))] };
}
export function dateValue(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = new Date(typeof value === 'number' || /^\d+$/.test(String(value)) ? Number(value) * (Number(value) > 1e12 ? 1 : 1000) : /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${String(value)}T12:00:00-03:00` : String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatDate(value: unknown): string {
  return dateValue(value)?.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) || 'Não informado';
}
export function fieldText(value: unknown, type = 'text'): string {
  if (value == null || value === '') return 'Não informado';
  if (type === 'checkbox' || typeof value === 'boolean') return value === true || value === 'true' ? 'Sim' : 'Não';
  if (type === 'date' || type === 'datetime') return formatDate(value);
  if (type === 'list' && Array.isArray(value)) return value.map(String).join(', ');
  if (type === 'percent') return `${String(value)}%`;
  if (type === 'currency') return money(Number(value));
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
export function money(value: number, currency = 'BRL') {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value); }
  catch { return `${value.toLocaleString('pt-BR')} ${currency}`; }
}
export function stageTotal(items: PipelineItem[]) {
  const currencies = new Set(items.map(item => item.currency || 'BRL'));
  return currencies.size > 1 ? 'Múltiplas moedas' : money(items.reduce((sum, item) => sum + (item.value ?? 0), 0), items[0]?.currency || 'BRL');
}
