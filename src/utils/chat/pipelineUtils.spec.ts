import { describe, it, expect } from 'vitest';
import { findItemInPipeline } from './pipelineUtils';

const makeItem = (id: string, itemId: string, stageId: string) => ({
  id,
  item_id: itemId,
  stage_id: stageId,
  pipeline_id: 'p1',
  type: 'conversation' as const,
  is_lead: false,
  created_at: '',
  updated_at: '',
});

const makeStage = (id: string, items: ReturnType<typeof makeItem>[] = []) => ({
  id,
  name: id,
  color: '#000',
  position: 0,
  created_at: '',
  updated_at: '',
  items,
});

describe('findItemInPipeline', () => {
  it('returns undefined when pipeline has no items anywhere', () => {
    const pipeline = { id: 'p1', stages: [makeStage('s1')], items: [] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBeUndefined();
  });

  it('finds item at top-level pipeline.items', () => {
    const item = makeItem('item-1', '42', 's1');
    const pipeline = { id: 'p1', stages: [], items: [item] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('finds item inside stage.items when pipeline.items is absent', () => {
    const item = makeItem('item-1', '42', 's1');
    const pipeline = { id: 'p1', stages: [makeStage('s1', [item])], items: undefined } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('finds item inside stage.items when pipeline.items is empty', () => {
    const item = makeItem('item-1', '42', 's1');
    const pipeline = { id: 'p1', stages: [makeStage('s1', [item])], items: [] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('prefers top-level item over stage item when both exist', () => {
    const topItem = makeItem('top', '42', 's1');
    const stageItem = makeItem('stage', '42', 's1');
    const pipeline = { id: 'p1', stages: [makeStage('s1', [stageItem])], items: [topItem] } as never;
    expect(findItemInPipeline(pipeline, '42')?.id).toBe('top');
  });

  it('searches across multiple stages and finds item in second stage', () => {
    const item = makeItem('item-1', '42', 's2');
    const pipeline = {
      id: 'p1',
      stages: [makeStage('s1', []), makeStage('s2', [item])],
      items: [],
    } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('coerces numeric item_id to string for comparison', () => {
    const item = { ...makeItem('item-1', '42', 's1'), item_id: 42 as unknown as string };
    const pipeline = { id: 'p1', stages: [makeStage('s1', [item])], items: [] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('returns undefined when convId does not match any item', () => {
    const item = makeItem('item-1', '99', 's1');
    const pipeline = { id: 'p1', stages: [makeStage('s1', [item])], items: [] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBeUndefined();
  });

  it('handles pipeline with no stages field gracefully', () => {
    const item = makeItem('item-1', '42', 's1');
    const pipeline = { id: 'p1', stages: undefined, items: [item] } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });

  it('finds item inside stage when stage.items is undefined on another stage', () => {
    const item = makeItem('item-1', '42', 's2');
    const pipeline = {
      id: 'p1',
      stages: [
        { id: 's1', name: 's1', color: '#000', position: 0, created_at: '', updated_at: '', items: undefined },
        { id: 's2', name: 's2', color: '#000', position: 1, created_at: '', updated_at: '', items: [item] },
      ],
      items: [],
    } as never;
    expect(findItemInPipeline(pipeline, '42')).toBe(item);
  });
});
