import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Button } from '@evoapi/design-system/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';
import { Zap, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { macrosService } from '@/services/macros/macrosService';
import type { Macro } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';

interface MacrosButtonProps {
  conversationId: string;
  disabled?: boolean;
  onMacroExecuted?: () => void;
}

const ITEM_ICON_BOX =
  'w-[34px] h-[34px] rounded-[9px] bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary';

const MacrosButton: React.FC<MacrosButtonProps> = ({
  conversationId,
  disabled = false,
  onMacroExecuted,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingMacroId, setExecutingMacroId] = useState<string | number | null>(null);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || macros.length > 0) return;

    (async () => {
      try {
        setIsLoading(true);
        const response = await macrosService.getMacros();
        setMacros(response.data || []);
      } catch (error) {
        console.error('Error loading macros:', error);
        toast.error(t('contactSidebar.macros.loading'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open, macros.length, t]);

  const executeMacro = useCallback(async () => {
    if (!selectedMacro) return;

    try {
      setExecutingMacroId(selectedMacro.id);
      const response = await macrosService.executeMacro({
        macroId: String(selectedMacro.id),
        conversationIds: [conversationId],
      });

      const executions = response?.data?.executions || (response as any)?.executions || [];
      const unresolvedIds: string[] =
        response?.data?.unresolved_conversation_ids ||
        (response as unknown as { unresolved_conversation_ids?: string[] })
          ?.unresolved_conversation_ids ||
        [];
      const hasFailure = executions.some((exec: any) => exec.status === 'failed');
      const hasPending = executions.some((exec: any) => exec.status === 'pending');

      // CRM-152: zero executions is not success. The backend now answers 404 here, so
      // this branch is the belt to that suspenders — an empty list must never reach
      // the green toast, whatever the status code says.
      if (executions.length === 0) {
        toast.error(t('contactSidebar.macros.executeError', { name: selectedMacro.name }));
        return;
      }

      // Emitted on its own rather than as a branch: a run can BOTH fail on one
      // conversation and not find another, and an exclusive chain would hide one of them.
      if (unresolvedIds.length > 0) {
        toast.warning(
          t('contactSidebar.macros.executeUnresolved', {
            name: selectedMacro.name,
            ids: unresolvedIds.join(', '),
          }),
        );
      }

      if (hasFailure) {
        const failedExec = executions.find((exec: any) => exec.status === 'failed');
        const failedActions = failedExec?.actions_result
          ?.filter((a: any) => a.status === 'failed')
          ?.map((a: any) => a.action)
          ?.join(', ');
        toast.error(
          t('contactSidebar.macros.executePartialError', { name: selectedMacro.name }) ||
            `Macro "${selectedMacro.name}" executada com falhas${failedActions ? `: ${failedActions}` : ''}`,
        );
      } else if (hasPending) {
        // Webhook actions are async — wait for macro.execution.completed
        // WebSocket event before confirming success/failure to the user.
        toast.info(t('contactSidebar.macros.executeQueued', { name: selectedMacro.name }));
      } else if (unresolvedIds.length === 0) {
        // A partial run already got its warning above; green would overwrite it with a
        // claim of a clean run.
        toast.success(t('contactSidebar.macros.executeSuccess', { name: selectedMacro.name }));
      }
      onMacroExecuted?.();
    } catch (error) {
      console.error('Error executing macro:', error);
      toast.error(t('contactSidebar.macros.executeError', { name: selectedMacro.name }));
    } finally {
      setExecutingMacroId(null);
      setSelectedMacro(null);
    }
  }, [selectedMacro, conversationId, onMacroExecuted, t]);

  return (
    <>
      <div ref={rootRef} className="relative flex-shrink-0" style={{ position: 'relative' }}>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => !disabled && setOpen(prev => !prev)}
          className="h-9 w-9 flex-shrink-0 hover:bg-accent disabled:opacity-50"
          title={t('messageInput.macros.tooltip')}
        >
          <Zap className="h-4 w-4 text-primary" />
        </Button>

        {open && (
          <div
            style={{
              position: 'absolute',
              bottom: 44,
              left: -6,
              width: 264,
              maxHeight: 340,
              overflowY: 'auto',
              background: '#FFFFFF',
              border: '1px solid #eceef2',
              borderRadius: 14,
              boxShadow: '0 12px 32px rgba(20,30,45,.16)',
              padding: 7,
              zIndex: 100,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px 10px' }}>
              <span className={ITEM_ICON_BOX}>
                <Zap className="h-4 w-4" />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, color: '#2b3240', fontWeight: 600, lineHeight: 1.2 }}>
                  {t('messageInput.macros.tooltip')}
                </div>
                <div style={{ fontSize: 12, color: '#7d8a8e', lineHeight: 1.3 }}>
                  {t('messageInput.macros.subtitle')}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && macros.length === 0 && (
              <div
                className="bg-primary/10 rounded-[10px]"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '20px 12px',
                }}
              >
                <Zap className="h-6 w-6 text-primary" />
                <span className="text-primary" style={{ fontSize: 13.5, fontWeight: 500, textAlign: 'center' }}>
                  {t('contactSidebar.macros.noMacros')}
                </span>
              </div>
            )}

            {!isLoading &&
              macros.map(macro => (
                <div
                  key={macro.id}
                  onClick={() => {
                    if (executingMacroId === macro.id) return;
                    setOpen(false);
                    setSelectedMacro(macro);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 10px',
                    borderRadius: 10,
                    cursor: executingMacroId === macro.id ? 'default' : 'pointer',
                    minWidth: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f4f6f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className={ITEM_ICON_BOX}>
                    {executingMacroId === macro.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 14.5,
                      color: '#2b3240',
                      fontWeight: 500,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {macro.name}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!selectedMacro}
        onOpenChange={openState => {
          if (!openState) setSelectedMacro(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-left space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="flex-1 space-y-2">
                <AlertDialogTitle className="text-lg font-semibold">
                  {t('contactSidebar.macros.dialog.title')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  {t('contactSidebar.macros.dialog.description', {
                    name: selectedMacro?.name || '',
                    count: selectedMacro?.actions.length || 0,
                    actionLabel:
                      (selectedMacro?.actions.length || 0) === 1
                        ? t('contactSidebar.macros.action')
                        : t('contactSidebar.macros.actions'),
                  })}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-3">
            <AlertDialogCancel className="w-full sm:w-auto">
              {t('contactSidebar.macros.dialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeMacro}
              className="w-full sm:w-auto bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500"
            >
              <Play className="h-4 w-4 mr-2" />
              {t('contactSidebar.macros.dialog.execute')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MacrosButton;
