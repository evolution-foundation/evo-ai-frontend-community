import { describe, it, expect } from 'vitest';
import { moveItemBetweenStages } from './pipelineKanbanHelpers';
import { PipelineStage, PipelineItem } from '@/types/analytics';

// EVO: dragging a card used to trigger a full pipeline refetch (loading=true →
// whole board unmounts). moveItemBetweenStages() is the pure, testable core of
// the optimistic local update that replaces it: it must move the card between
// stages, without touching the network.

const makeItem = (id: string, stageId: string): PipelineItem =>
  ({ id, item_id: id, type: 'conversation', pipeline_id: 'pl-1', stage_id: stageId, is_lead: false, created_at: 0, updated_at: 0 }) as PipelineItem;

const makeStages = (): PipelineStage[] => [
  {
    id: 'stage-a',
    name: 'A',
    color: '#000',
    position: 0,
    created_at: 0,
    updated_at: 0,
    item_count: 1,
    items: [makeItem('item-1', 'stage-a')],
  } as PipelineStage,
  {
    id: 'stage-b',
    name: 'B',
    color: '#111',
    position: 1,
    created_at: 0,
    updated_at: 0,
    item_count: 0,
    items: [],
  } as PipelineStage,
];

const stageById = (stages: PipelineStage[], id: string) => stages.find(s => s.id === id)!;

describe('moveItemBetweenStages', () => {
  it('removes the item from the source stage and appends it to the target stage', () => {
    const result = moveItemBetweenStages(makeStages(), 'item-1', 'stage-a', 'stage-b');

    expect(stageById(result, 'stage-a').items?.map(i => i.id)).toEqual([]);
    expect(stageById(result, 'stage-b').items?.map(i => i.id)).toEqual(['item-1']);
  });

  it('updates the moved item stage_id and pipeline_stage_id to the target stage', () => {
    const result = moveItemBetweenStages(makeStages(), 'item-1', 'stage-a', 'stage-b');
    const movedItem = stageById(result, 'stage-b').items?.[0];

    expect(movedItem?.stage_id).toBe('stage-b');
    expect(movedItem?.pipeline_stage_id).toBe('stage-b');
  });

  it('adjusts item_count on both the source and target stage', () => {
    const result = moveItemBetweenStages(makeStages(), 'item-1', 'stage-a', 'stage-b');

    expect(stageById(result, 'stage-a').item_count).toBe(0);
    expect(stageById(result, 'stage-b').item_count).toBe(1);
  });

  it('leaves stages untouched when the item is not found in the source stage', () => {
    const stages = makeStages();

    const result = moveItemBetweenStages(stages, 'missing-item', 'stage-a', 'stage-b');

    expect(result).toEqual(stages);
  });

  it('leaves stages untouched when the target stage no longer exists', () => {
    const stages = makeStages();

    const result = moveItemBetweenStages(stages, 'item-1', 'stage-a', 'deleted-stage');

    expect(result).toEqual(stages);
  });
});
