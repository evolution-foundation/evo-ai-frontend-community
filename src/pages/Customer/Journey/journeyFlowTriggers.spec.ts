import { describe, expect, it } from 'vitest';
import { buildFlowTriggers } from './journeyFlowTriggers';

describe('buildFlowTriggers (EVO-1763)', () => {
  it('mirrors segmentAction (+ id/name) into trigger metadata so the runtime can honor it', () => {
    const [trigger] = buildFlowTriggers([
      {
        id: 'n1',
        type: 'journey-trigger-node',
        data: {
          triggerType: 'segment',
          segmentId: 's1',
          segmentName: 'Leads',
          segmentAction: 'exited',
        },
      },
    ]);
    expect(trigger.metadata.segmentAction).toBe('exited');
    expect(trigger.metadata.segmentId).toBe('s1');
    expect(trigger.metadata.segmentName).toBe('Leads');
  });

  it('mirrors labelAction into trigger metadata', () => {
    const [trigger] = buildFlowTriggers([
      {
        id: 'n1',
        type: 'journey-trigger-node',
        data: { triggerType: 'label', labelId: 'l1', labelName: 'VIP', labelAction: 'removed' },
      },
    ]);
    expect(trigger.metadata.labelAction).toBe('removed');
  });

  it('ignores non-trigger nodes', () => {
    const result = buildFlowTriggers([
      { id: 'a', type: 'action-node', data: {} },
      { id: 'b', type: 'journey-trigger-node', data: { triggerType: 'manual' } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('returns [] for a non-array input', () => {
    expect(buildFlowTriggers(undefined)).toEqual([]);
    expect(buildFlowTriggers(null)).toEqual([]);
  });
});
