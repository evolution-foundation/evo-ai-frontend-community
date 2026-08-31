/** Shared by the header and the summary panel, so the labels stay in one locale table. */
export const getAgentTypeLabel = (type: string | undefined, t: (key: string) => string): string => {
  const typeLabels: Record<string, string> = {
    llm: t('basicInfo.types.llm') || 'LLM',
    a2a: t('basicInfo.types.a2a') || 'A2A',
    sequential: t('basicInfo.types.sequential') || 'Sequencial',
    parallel: t('basicInfo.types.parallel') || 'Paralelo',
    loop: t('basicInfo.types.loop') || 'Loop',
    workflow: t('basicInfo.types.workflow') || 'Workflow',
    task: t('basicInfo.types.task') || 'Task',
    external: t('basicInfo.types.external') || 'Integração Externa',
  };
  return typeLabels[type || ''] || type || '';
};
