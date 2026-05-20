import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@evoapi/design-system';
import { Variable } from 'lucide-react';
import { JourneyEditorHeader } from './JourneyEditorHeader';

const meta: Meta<typeof JourneyEditorHeader> = {
  title: 'Flow Builder/JourneyEditorHeader',
  component: JourneyEditorHeader,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Header chrome for the Journey Editor page. 3 zones (navigation / identity / actions), ' +
          'ESC and Cmd/Ctrl+B keyboard shortcuts for Back (skipped when focus is inside an INPUT / ' +
          'TEXTAREA / SELECT / contentEditable element OR when a Radix overlay is open), responsive ' +
          'kebab below 1024px. Lifted state mandatory — every prop is consumer-controlled; the ' +
          'component holds no useState. The `environmentSlot` is a ReactNode slot for the ' +
          'EnvironmentManager component (which stays self-contained — not refactored as part of ' +
          'EVO-1269).',
      },
    },
  },
  argTypes: {
    hasUnsavedChanges: { control: 'boolean' },
    isSaving: { control: 'boolean' },
    subtitle: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof JourneyEditorHeader>;

function FakeEnvironmentTrigger() {
  return (
    <Button variant="ghost" size="sm" className="gap-2">
      <Variable className="h-4 w-4" />
      ENV
    </Button>
  );
}

const baseArgs = {
  onBack: () => undefined,
  title: 'Journey Editor: Onboarding flow',
  subtitle: 'Welcome message + first-time setup steps',
  onViewSessions: () => undefined,
  viewSessionsLabel: 'View sessions',
  environmentSlot: <FakeEnvironmentTrigger />,
  onSave: () => undefined,
};

export const Pristine: Story = {
  name: 'Pristine — no unsaved changes (Save disabled, shows "Saved")',
  args: {
    ...baseArgs,
    hasUnsavedChanges: false,
  },
};

export const Dirty: Story = {
  name: 'Dirty — unsaved changes (Save enabled, default variant)',
  args: {
    ...baseArgs,
    hasUnsavedChanges: true,
  },
};

export const Saving: Story = {
  name: 'Saving — in-flight (spinner + disabled)',
  args: {
    ...baseArgs,
    hasUnsavedChanges: true,
    isSaving: true,
  },
};

export const WithLastSaved: Story = {
  name: 'Pristine + lastSaved timestamp (lives inside the persist cluster)',
  args: {
    ...baseArgs,
    hasUnsavedChanges: false,
    lastSaved: new Date(),
    lastSavedFormatter: (date) => `Saved ${date.toLocaleTimeString()}`,
  },
};

export const DirtyWithUnsavedChangesHint: Story = {
  name: 'Dirty + lastSaved + unsavedChangesHint suffix',
  args: {
    ...baseArgs,
    hasUnsavedChanges: true,
    lastSaved: new Date(),
    lastSavedFormatter: (date) => `Last save: ${date.toLocaleTimeString()}`,
    unsavedChangesHint: 'Auto-save in 10s',
  },
};

export const WithoutSubtitle: Story = {
  name: 'No subtitle — falls back to single-line identity (no "No description" filler)',
  args: {
    ...baseArgs,
    subtitle: undefined,
  },
};

export const PortugueseLabels: Story = {
  name: 'PT-BR labels — every i18n surface customised',
  args: {
    ...baseArgs,
    backLabel: 'Voltar',
    backShortcutHint: 'Esc',
    viewSessionsLabel: 'Ver Sessões',
    saveLabel: 'Salvar',
    savingLabel: 'Salvando…',
    savedLabel: 'Salvo',
    moreActionsLabel: 'Mais ações',
    unsavedChangesHint: 'Auto-save em 10s',
    hasUnsavedChanges: true,
    lastSaved: new Date(),
    lastSavedFormatter: (date) => `Último save: ${date.toLocaleTimeString()}`,
  },
};
