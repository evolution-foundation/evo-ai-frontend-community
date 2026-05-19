import type { Meta, StoryObj } from '@storybook/react-vite';

const Swatch = ({ name, className }: { name: string; className: string }) => (
  <div className="flex flex-col gap-1">
    <div
      className={`h-12 w-full rounded border border-border ${className}`}
      aria-hidden="true"
    />
    <code className="text-xs text-muted-foreground">{name}</code>
  </div>
);

const TokenGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3" aria-labelledby={title.replace(/\s+/g, '-').toLowerCase()}>
    <header>
      <h2
        id={title.replace(/\s+/g, '-').toLowerCase()}
        className="text-base font-semibold"
      >
        {title}
      </h2>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </header>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
  </section>
);

const meta: Meta = {
  title: 'Flow Builder/Tokens',
  parameters: {
    docs: {
      description: {
        component:
          'Visual reference for every `--color-flow-*` design token. Toggle the ' +
          'theme in the toolbar to verify dark and light variants. Use the ' +
          'Accessibility panel to inspect contrast ratios — axe-core runs against ' +
          'the rendered DOM (real browser, not jsdom), so contrast checks are ' +
          'authoritative here.',
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const Overview: Story = {
  render: () => (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-lg font-semibold">Flow Builder design tokens</h1>
        <p className="text-sm text-muted-foreground">
          Card EVO-1253 — toggle the toolbar theme switch to validate dark/light.
        </p>
      </header>

      <TokenGroup
        title="Node — categories"
        description="One swatch per role (bg / fg / border) for each of the 4 simple categories."
      >
        <Swatch name="trigger · bg" className="bg-flow-node-trigger-bg" />
        <Swatch name="trigger · fg" className="bg-flow-node-trigger-fg" />
        <Swatch name="trigger · border" className="bg-flow-node-trigger-border" />
        <Swatch name="condition · bg" className="bg-flow-node-condition-bg" />
        <Swatch name="condition · fg" className="bg-flow-node-condition-fg" />
        <Swatch name="condition · border" className="bg-flow-node-condition-border" />
        <Swatch name="control · bg" className="bg-flow-node-control-bg" />
        <Swatch name="control · fg" className="bg-flow-node-control-fg" />
        <Swatch name="control · border" className="bg-flow-node-control-border" />
        <Swatch name="exit · bg" className="bg-flow-node-exit-bg" />
        <Swatch name="exit · fg" className="bg-flow-node-exit-fg" />
        <Swatch name="exit · border" className="bg-flow-node-exit-border" />
      </TokenGroup>

      <TokenGroup
        title="Node — action subtypes"
        description="Each action node has dedicated hex values per subtype (no hue rotation)."
      >
        <Swatch name="action-message · bg" className="bg-flow-node-action-message-bg" />
        <Swatch name="action-message · fg" className="bg-flow-node-action-message-fg" />
        <Swatch name="action-message · border" className="bg-flow-node-action-message-border" />
        <Swatch name="action-webhook · bg" className="bg-flow-node-action-webhook-bg" />
        <Swatch name="action-webhook · fg" className="bg-flow-node-action-webhook-fg" />
        <Swatch name="action-webhook · border" className="bg-flow-node-action-webhook-border" />
        <Swatch name="action-label · bg" className="bg-flow-node-action-label-bg" />
        <Swatch name="action-label · fg" className="bg-flow-node-action-label-fg" />
        <Swatch name="action-label · border" className="bg-flow-node-action-label-border" />
        <Swatch name="action-pipeline · bg" className="bg-flow-node-action-pipeline-bg" />
        <Swatch name="action-pipeline · fg" className="bg-flow-node-action-pipeline-fg" />
        <Swatch name="action-pipeline · border" className="bg-flow-node-action-pipeline-border" />
      </TokenGroup>

      <TokenGroup
        title="Canvas"
        description="Canvas chrome — grid is intentionally low-contrast vs canvas-bg."
      >
        <Swatch name="canvas-bg" className="bg-flow-canvas-bg" />
        <Swatch name="canvas-grid" className="bg-flow-canvas-grid" />
        <Swatch name="canvas-grid-strong" className="bg-flow-canvas-grid-strong" />
      </TokenGroup>

      <TokenGroup title="Palette panel">
        <Swatch name="palette-bg" className="bg-flow-palette-bg" />
        <Swatch name="palette-surface" className="bg-flow-palette-surface" />
        <Swatch name="palette-divider" className="bg-flow-palette-divider" />
      </TokenGroup>

      <TokenGroup
        title="Panel chrome — consumed by EVO-1264"
        description="EVO-1253 declares these; EVO-1264 NodeConfigModal will apply them."
      >
        <Swatch name="panel-bg" className="bg-flow-panel-bg" />
        <Swatch name="panel-header-bg" className="bg-flow-panel-header-bg" />
        <Swatch name="panel-divider" className="bg-flow-panel-divider" />
      </TokenGroup>

      <TokenGroup title="Edges">
        <Swatch name="edge-default" className="bg-flow-edge-default" />
        <Swatch name="edge-active" className="bg-flow-edge-active" />
        <Swatch name="edge-error" className="bg-flow-edge-error" />
      </TokenGroup>

      <TokenGroup title="Feedback banner">
        <Swatch name="feedback-info · bg" className="bg-flow-feedback-info-bg" />
        <Swatch name="feedback-info · fg" className="bg-flow-feedback-info-fg" />
        <Swatch name="feedback-info · border" className="bg-flow-feedback-info-border" />
        <Swatch name="feedback-warn · bg" className="bg-flow-feedback-warn-bg" />
        <Swatch name="feedback-warn · fg" className="bg-flow-feedback-warn-fg" />
        <Swatch name="feedback-warn · border" className="bg-flow-feedback-warn-border" />
        <Swatch name="feedback-error · bg" className="bg-flow-feedback-error-bg" />
        <Swatch name="feedback-error · fg" className="bg-flow-feedback-error-fg" />
        <Swatch name="feedback-error · border" className="bg-flow-feedback-error-border" />
        <Swatch name="feedback-success · bg" className="bg-flow-feedback-success-bg" />
        <Swatch name="feedback-success · fg" className="bg-flow-feedback-success-fg" />
        <Swatch name="feedback-success · border" className="bg-flow-feedback-success-border" />
      </TokenGroup>
    </div>
  ),
};
