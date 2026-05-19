import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from '@evoapi/design-system/scroll-area';
import { Play, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { macrosService } from '@/services/macros/macrosService';
import type { Macro } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';

interface MacrosListProps {
  conversationId: string;
  onMacroExecuted?: () => void;
}

const MacrosList: React.FC<MacrosListProps> = ({ conversationId, onMacroExecuted }) => {
  const { t } = useLanguage('chat');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingMacro, setExecutingMacro] = useState<string | number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);

  useEffect(() => {
    loadMacros();
  }, []);

  const loadMacros = async () => {
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
  };

  const handleMacroClick = (macro: Macro) => {
    setSelectedMacro(macro);
    setShowConfirmDialog(true);
  };

  const executeMacro = async () => {
    if (!selectedMacro) return;

    try {
      setExecutingMacro(selectedMacro.id);
      setShowConfirmDialog(false);
      const response = await macrosService.executeMacro({
        macroId: String(selectedMacro.id),
        conversationIds: [conversationId],
      });

      // Check real execution results from the API
      const executions = response?.data?.executions || (response as any)?.executions || [];
      const hasFailure = executions.some((exec: any) => exec.status === 'failed');

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
      } else {
        toast.success(t('contactSidebar.macros.executeSuccess', { name: selectedMacro.name }));
      }
      onMacroExecuted?.();
    } catch (error) {
      console.error('Error executing macro:', error);
      toast.error(t('contactSidebar.macros.executeError', { name: selectedMacro.name }));
    } finally {
      setExecutingMacro(null);
      setSelectedMacro(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (macros.length === 0) {
    return (
      <div className="text-center py-6">
        <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t('contactSidebar.macros.noMacros')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-2">
        {macros.map(macro => (
          <div
            key={macro.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-2">
              <h4 className="text-sm font-medium truncate">{macro.name}</h4>
              <p className="text-xs text-muted-foreground">
                {macro.actions.length}{' '}
                {macro.actions.length === 1
                  ? t('contactSidebar.macros.action')
                  : t('contactSidebar.macros.actions')}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleMacroClick(macro)}
              disabled={executingMacro === macro.id}
              className="h-8 w-8 p-0"
            >
              {executingMacro === macro.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
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
    </ScrollArea>
  );
};

export default MacrosList;
