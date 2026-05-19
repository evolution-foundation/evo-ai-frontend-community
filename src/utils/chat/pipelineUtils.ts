import type { Pipeline } from '@/types/analytics';

// The backend serializer places items inside stage.items (not pipeline.items at top level).
// This helper searches both locations to remain compatible with either structure.
export function findItemInPipeline(pipeline: Pipeline, convId: string) {
  const topLevel = pipeline.items?.find(i => String(i.item_id) === convId);
  if (topLevel) return topLevel;
  for (const stage of pipeline.stages ?? []) {
    const stageItem = (stage.items ?? []).find(i => String(i.item_id) === convId);
    if (stageItem) return stageItem;
  }
  return undefined;
}
