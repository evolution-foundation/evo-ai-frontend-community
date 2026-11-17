import ptBR from '@/i18n/locales/pt-BR/pipelines.json';

/** `t` de teste: resolve chaves reais do pt-BR (namespace pipelines) com interpolação {{x}}. */
export const pipelinesT = (key: string, vars: Record<string, string> = {}): string => {
  const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], ptBR);
  return typeof value === 'string' ? value.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? '') : key;
};
