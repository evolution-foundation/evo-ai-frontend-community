import { type ReactNode } from 'react';
import { Button } from '@evoapi/design-system';
import { Activity, ArrowLeft, Clock, Loader2, Save } from 'lucide-react';

export type JourneyEditorHeaderProps = {
  onBack: () => void;
  backLabel?: string;

  title: string;
  subtitle?: string;

  onViewSessions: () => void;
  viewSessionsLabel?: string;

  environmentSlot?: ReactNode;

  onSave: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  saveLabel?: string;
  savingLabel?: string;
  savedLabel?: string;
  lastSavedFormatter?: (date: Date) => string;
  unsavedChangesHint?: string;
};

export function JourneyEditorHeader({
  onBack,
  backLabel = 'Back',
  title,
  subtitle,
  onViewSessions,
  viewSessionsLabel = 'View sessions',
  environmentSlot,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSaved = null,
  saveLabel = 'Save',
  savingLabel = 'Saving…',
  savedLabel = 'Saved',
  lastSavedFormatter,
  unsavedChangesHint,
}: JourneyEditorHeaderProps) {
  const computedSaveLabel = isSaving
    ? savingLabel
    : hasUnsavedChanges
      ? saveLabel
      : savedLabel;

  const saveDisabled = !hasUnsavedChanges || isSaving;
  const showUnsavedHint = Boolean(lastSaved && hasUnsavedChanges && unsavedChangesHint);

  return (
    <header
      className="flex items-center gap-4 bg-flow-panel-header-bg border-b border-flow-panel-divider px-4 py-3"
      role="banner"
    >
      <div data-zone="navigation" className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Button>
      </div>

      <div
        data-zone="identity"
        className="flex-1 min-w-0 border-l border-flow-panel-divider pl-4"
      >
        <h1
          className="text-lg font-semibold leading-tight truncate"
          title={title}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground truncate" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div data-zone="actions" className="flex items-center gap-2">
        <div className="flex items-center border-l border-flow-panel-divider pl-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewSessions}
            className="gap-2 hidden md:inline-flex"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            {viewSessionsLabel}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onViewSessions}
            aria-label={viewSessionsLabel}
            className="md:hidden h-9 w-9"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {environmentSlot ? (
          <div className="flex items-center border-l border-flow-panel-divider pl-2">
            {environmentSlot}
          </div>
        ) : null}

        <div
          data-cluster="persist"
          className="flex items-center gap-3 border-l border-flow-panel-divider pl-2"
        >
          {lastSaved ? (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>
                {lastSavedFormatter ? lastSavedFormatter(lastSaved) : lastSaved.toLocaleTimeString()}
                {showUnsavedHint ? ` • ${unsavedChangesHint}` : null}
              </span>
            </div>
          ) : null}

          {/* aria-live wrapper announces Save → Saving… → Saved state transitions to SR users. */}
          <div aria-live="polite" aria-atomic="true">
            {/* Fixed min-width avoids button reflow as the label cycles Save → Saving… → Saved. */}
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={saveDisabled}
              className="gap-2 min-w-[100px]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {computedSaveLabel}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

JourneyEditorHeader.displayName = 'JourneyEditorHeader';
