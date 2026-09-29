import { PipelineStage } from '@/types/analytics';

// Pure local-state update for an optimistic card move: patches only the two
// affected stages instead of refetching the whole pipeline (which used to
// force `loading = true` and unmount the entire board on every drag-and-drop).
export function moveItemBetweenStages(
  stages: PipelineStage[],
  itemId: string,
  fromStageId: string,
  toStageId: string,
): PipelineStage[] {
  const sourceStage = stages.find(s => s.id === fromStageId);
  const movedItem = sourceStage?.items?.find(i => i.id === itemId);
  if (!movedItem) return stages;

  return stages.map(stage => {
    if (stage.id === fromStageId) {
      const items = (stage.items ?? []).filter(i => i.id !== itemId);
      return { ...stage, items, item_count: items.length };
    }
    if (stage.id === toStageId) {
      const items = [
        ...(stage.items ?? []),
        { ...movedItem, stage_id: toStageId, pipeline_stage_id: toStageId },
      ];
      return { ...stage, items, item_count: items.length };
    }
    return stage;
  });
}
