import { useCallback, useState } from 'react';
import {
  Button,
  Badge,
} from '@evoapi/design-system';
import {
  Code,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { CustomTool } from '@/types/ai';
import CustomToolsSelectionDialog from './Dialogs/CustomToolsSelectionDialog';


interface CustomToolsSectionProps {
  customTools: {
    http_tools: CustomTool[];
  };
  onCustomToolsChange: (customTools: { http_tools: CustomTool[] }) => void;
  isReadOnly?: boolean;
}

const CustomToolsSection = ({
  customTools,
  onCustomToolsChange,
  isReadOnly = false,
}: CustomToolsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showCustomToolsDialog, setShowCustomToolsDialog] = useState(false);

  const handleAddCustomTools = useCallback((selectedTools: CustomTool[]) => {
    const existingIds = customTools.http_tools.map(tool => tool.id);
    const newTools = selectedTools.filter(tool => !existingIds.includes(tool.id));
    onCustomToolsChange({
      http_tools: [...customTools.http_tools, ...newTools],
    });
  }, [customTools, onCustomToolsChange]);

  const handleRemoveCustomTool = useCallback((toolId: string) => {
    const updatedCustomTools = customTools.http_tools.filter(tool => tool.id !== toolId);
    onCustomToolsChange({
      http_tools: updatedCustomTools,
    });
  }, [customTools, onCustomToolsChange]);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/10 text-green-600 border-green-500/30',
      POST: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      PUT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      PATCH: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
    };
    return colors[method.toUpperCase()] || 'bg-gray-500/10 text-gray-600 border-gray-500/30';
  };

  return (
    <div className="space-y-4">
      {customTools.http_tools.length > 0 ? (
            <div className="space-y-3">
              {customTools.http_tools.map(tool => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Code className="h-4 w-4 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{tool.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getMethodColor(tool.method)}`}
                        >
                          {tool.method.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {tool.description || t('tools.customTools.defaultDescription')}
                      </p>
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {tool.endpoint}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCustomTool(tool.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowCustomToolsDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('tools.customTools.addTool')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-start justify-between gap-3 rounded-[10px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-4">
              {/* Stacks below `sm`: side by side the button does not shrink and
                  squeezes the text to one word per line. */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t('tools.customTools.noTools')}
                </p>
                <p className="mt-[3px] text-[13px] text-muted-foreground">
                  {t('tools.customTools.createDescription')}
                </p>
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => setShowCustomToolsDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('tools.customTools.add')}
                </Button>
              )}
            </div>
          )}

      <CustomToolsSelectionDialog
        open={showCustomToolsDialog}
        onOpenChange={setShowCustomToolsDialog}
        onSave={handleAddCustomTools}
        initialSelectedTools={customTools.http_tools}
      />
    </div>
  );
};

export default CustomToolsSection;
