import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { JourneyTriggerNode, type JourneyTriggerNodeData } from './JourneyTriggerNode';
import '@/i18n/config';

// BaseFlowNode renders @xyflow/react Handles, so the node needs a flow context.
function renderNode(data: Partial<JourneyTriggerNodeData>) {
  render(
    <ReactFlowProvider>
      <JourneyTriggerNode
        id="node-1"
        selected={false}
        data={{ label: 'Trigger', triggerType: 'manual', ...data } as JourneyTriggerNodeData}
      />
    </ReactFlowProvider>,
  );
}

// EVO-1754: the canvas card must default an unset action to the SAME value the
// editor + runtime assume (label → applied, segment → entered), not the opposite.
describe('JourneyTriggerNode — action defaults on the canvas card (EVO-1754)', () => {
  it('renders a Label trigger with no labelAction as "applied" (not "removed")', () => {
    renderNode({ triggerType: 'label', labelId: 'l1', labelName: 'vip' });
    expect(screen.getByText(/"vip"\s+applied/i)).toBeTruthy();
    expect(screen.queryByText(/removed/i)).toBeNull();
  });

  it('renders an explicit labelAction "removed" as "removed"', () => {
    renderNode({
      triggerType: 'label',
      labelId: 'l1',
      labelName: 'vip',
      labelAction: 'removed',
    });
    expect(screen.getByText(/"vip"\s+removed/i)).toBeTruthy();
  });

  it('renders a Segment trigger with no segmentAction as "enters" (not "exits")', () => {
    renderNode({ triggerType: 'segment', segmentId: 's1', segmentName: 'leads' });
    expect(screen.getByText(/enters\s+"leads"/i)).toBeTruthy();
    expect(screen.queryByText(/exits/i)).toBeNull();
  });

  it('renders an explicit segmentAction "exited" as "exits"', () => {
    renderNode({
      triggerType: 'segment',
      segmentId: 's1',
      segmentName: 'leads',
      segmentAction: 'exited',
    });
    expect(screen.getByText(/exits\s+"leads"/i)).toBeTruthy();
  });
});
