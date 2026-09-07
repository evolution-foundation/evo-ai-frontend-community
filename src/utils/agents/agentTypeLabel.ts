/** Shared by the header and the summary panel, so the labels stay in one locale table. */
export const getAgentTypeLabel = (type: string | undefined, t: (key: string) => string): string => {
  const typeLabels: Record<string, string> = {
    llm: t('basicInfo.types.llm'),
    a2a: t('basicInfo.types.a2a'),
    sequential: t('basicInfo.types.sequential'),
    parallel: t('basicInfo.types.parallel'),
    loop: t('basicInfo.types.loop'),
    workflow: t('basicInfo.types.workflow'),
    task: t('basicInfo.types.task'),
    external: t('basicInfo.types.external'),
  };
  return typeLabels[type || ''] || type || '';
};
