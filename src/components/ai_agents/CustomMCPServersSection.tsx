import { useState } from 'react';
import {
  Button,
  Badge,
  } from '@evoapi/design-system';
import {
  ExternalLink,
  Plus,
  Server,
  X,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import CustomMCPDialog from './Dialogs/CustomMCPDialog';

interface CustomMCPServersSectionProps {
  customMCPServerIds: string[];
  onCustomMCPServersChange: (serverIds: string[]) => void;
  isReadOnly?: boolean;
  /** Set when the caller already exposes its own "add custom MCP" button for the list. */
  showAddButton?: boolean;
  hideCreateNew?: boolean;
  /** Points the empty-state CTA at the caller's picker instead of the local dialog. */
  onAdd?: () => void;
}

const CustomMCPServersSection = ({
  customMCPServerIds,
  onCustomMCPServersChange,
  isReadOnly = false,
  showAddButton = true,
  hideCreateNew = false,
  onAdd,
}: CustomMCPServersSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showCustomMCPDialog, setShowCustomMCPDialog] = useState(false);

  // The picker opens with the current selection checked, so what it returns is the
  // whole selection; merging would make unchecking a no-op.
  const handleAddCustomMCPServers = (serverIds: string[]) => {
    onCustomMCPServersChange(serverIds);
  };

  const handleRemoveCustomMCPServer = (serverId: string) => {
    const updatedIds = customMCPServerIds.filter(id => id !== serverId);
    onCustomMCPServersChange(updatedIds);
  };

  return (
    <div className="space-y-4">
      {customMCPServerIds && customMCPServerIds.length > 0 ? (
            <div className="space-y-3">
              {customMCPServerIds.map(serverId => (
                <div
                  key={`referenced-${serverId}`}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ExternalLink className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{serverId}</span>
                      <Badge
                        variant="outline"
                        className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      >
                        {t('tools.mcpServers.referenced')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('tools.mcpServers.externallyManaged')}
                    </p>
                  </div>
                  {/* Removing does not depend on `showAddButton`, which only hides add CTAs. */}
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomMCPServer(serverId)}
                      aria-label={t('actions.remove') || 'Remover'}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {!isReadOnly && showAddButton && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomMCPDialog(true)}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('tools.mcpServers.addCustom')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-[12px] border border-dashed border-border px-6 py-12 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] bg-primary/10">
                <Server className="h-6 w-6 text-primary" />
              </span>
              <p className="text-[15px] font-bold text-foreground">
                {t('tools.mcpServers.noCustomConfigured')}
              </p>
              <p className="mt-1 max-w-md text-[13px] leading-[1.5] text-muted-foreground">
                {t('tools.mcpServers.connectFromManagement')}
              </p>
              {/* Same: an empty state with no action would be a dead end. */}
              {!isReadOnly && (
                <Button
                  type="button"
                  onClick={() => (onAdd ? onAdd() : setShowCustomMCPDialog(true))}
                  className="mt-5 h-auto gap-2 rounded-[9px] bg-primary px-5 py-[10px] text-sm font-semibold text-primary-foreground hover:bg-primary/85"
                >
                  <Plus className="h-4 w-4" />
                  {t('customMCPServers.add') || 'Adicionar Custom MCP'}
                </Button>
              )}
            </div>
          )}

      <CustomMCPDialog
        open={showCustomMCPDialog}
        onOpenChange={setShowCustomMCPDialog}
        onSave={handleAddCustomMCPServers}
        initialSelectedIds={customMCPServerIds}
        hideCreateNew={hideCreateNew}
      />
    </div>
  );
};

export default CustomMCPServersSection;
