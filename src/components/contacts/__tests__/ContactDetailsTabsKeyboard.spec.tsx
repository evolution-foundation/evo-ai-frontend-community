/**
 * AC19b — keyboard navigation. ArrowRight from a focused tab in TabsList
 * should land focus on the next tab (Radix-managed roving tabindex). We
 * exercise the actual Radix Tabs primitive with a 3-tab fixture mirroring
 * the relevant slice of ContactDetails (`pipeline` → `events` → `history`).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@evoapi/design-system';
import { describe, expect, it } from 'vitest';

function Harness() {
  return (
    <Tabs defaultValue="pipeline">
      <TabsList>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="events">Eventos</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="pipeline">pipeline</TabsContent>
      <TabsContent value="events">events</TabsContent>
      <TabsContent value="history">history</TabsContent>
    </Tabs>
  );
}

describe('ContactDetails tabs keyboard nav (AC19b)', () => {
  it('ArrowRight moves focus from the active tab to "Eventos"', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const pipelineTab = screen.getByRole('tab', { name: /pipeline/i });
    pipelineTab.focus();
    expect(pipelineTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /eventos/i })).toHaveFocus();
  });

  it('ArrowRight again moves focus past "Eventos" to "Histórico"', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const pipelineTab = screen.getByRole('tab', { name: /pipeline/i });
    pipelineTab.focus();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: /histórico/i })).toHaveFocus();
  });
});
