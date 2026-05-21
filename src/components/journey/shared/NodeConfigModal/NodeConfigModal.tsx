import { type ReactNode } from 'react';
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NodeConfigModalTab = {
  value: string;
  label: string;
  content: ReactNode;
};

type CommonProps = {
  open: boolean;
  /** Called on ESC, click outside, X button, and Cancel button. Required: consumer controls close. */
  onCancel: () => void;
  /**
   * Called when the Save button is clicked. Component does NOT await the returned promise —
   * consumer is responsible for flipping `loading` true before the async work and false after
   * (or on error). The component never auto-manages loading state.
   */
  onSave: () => void | Promise<void>;
  title: string;
  /** Optional category icon rendered before the title in the header. */
  icon?: ReactNode;
  description?: string;
  loading?: boolean;
  dirty?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  /**
   * Screen-reader-only text announced while `loading` is true. Default
   * is English "Saving…"; consumers should pass a translated value so
   * the audio feedback respects the user's locale.
   */
  savingAriaLabel?: string;
  /** Forwarded onto Dialog.Content's className via cn(). Useful for width overrides (e.g. max-w-4xl). */
  contentClassName?: string;
};

type SimpleProps = CommonProps & {
  variant: 'simple';
  children: ReactNode;
};

type TabsVariantProps = CommonProps & {
  variant: 'tabs';
  tabs: NodeConfigModalTab[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
};

type DisclosureProps = CommonProps & {
  variant: 'disclosure';
  children: ReactNode;
  advanced: ReactNode;
  advancedLabel?: string;
  defaultAdvancedOpen?: boolean;
};

export type NodeConfigModalProps = SimpleProps | TabsVariantProps | DisclosureProps;

export function NodeConfigModal(props: NodeConfigModalProps) {
  const {
    open,
    onCancel,
    onSave,
    title,
    icon,
    description,
    loading = false,
    dirty = false,
    saveLabel = 'Save',
    cancelLabel = 'Cancel',
    savingAriaLabel = 'Saving...',
    contentClassName,
  } = props;

  const handleOpenChange = (next: boolean) => {
    if (!next) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'bg-flow-panel-bg p-0 overflow-hidden max-w-2xl',
          contentClassName,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader className="bg-flow-panel-header-bg border-b border-flow-panel-divider px-6 py-4 space-y-1">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="shrink-0" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          {props.variant === 'simple' ? props.children : null}

          {props.variant === 'tabs' ? (
            <Tabs
              defaultValue={props.defaultTab ?? props.tabs[0]?.value}
              onValueChange={props.onTabChange}
            >
              <TabsList className="mb-4">
                {props.tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {props.tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : null}

          {props.variant === 'disclosure' ? (
            <>
              {props.children}
              <Collapsible
                defaultOpen={props.defaultAdvancedOpen}
                className="mt-4 border-t border-flow-panel-divider pt-3"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="-ml-3 gap-2 group">
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    {props.advancedLabel ?? 'Advanced settings'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">{props.advanced}</CollapsibleContent>
              </Collapsible>
            </>
          ) : null}
        </div>

        <DialogFooter className="bg-flow-panel-header-bg border-t border-flow-panel-divider px-6 py-4 sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-initial h-10"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onSave}
            disabled={!dirty || loading}
            className="flex-1 sm:flex-initial h-10"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">{savingAriaLabel}</span>
              </>
            ) : null}
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

NodeConfigModal.displayName = 'NodeConfigModal';
