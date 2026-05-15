import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Input,
  Checkbox,
} from '@evoapi/design-system';
import { Search, Code, Tag, Plus, ExternalLink } from 'lucide-react';
import { listCustomTools, createCustomTool } from '@/services/agents/customToolsService';
import { CustomTool, CustomToolFormData } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';
import CustomToolForm from '@/components/customTools/CustomToolForm';
import { toast } from 'sonner';

interface CustomToolsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedTools: CustomTool[]) => void;
  initialSelectedTools?: CustomTool[];
}

const CustomToolsSelectionDialog = ({
  open,
  onOpenChange,
  onSave,
  initialSelectedTools = [],
}: CustomToolsSelectionDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const { t: tTools } = useLanguage('customTools');
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<CustomTool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreatingTool, setIsCreatingTool] = useState(false);

  const hasLoadedRef = useRef(false);
  const initialSelectionSetRef = useRef(false);

  // Initialize selected tools when dialog opens
  useEffect(() => {
    if (open && !initialSelectionSetRef.current) {
      setSelectedTools([...initialSelectedTools]);
      initialSelectionSetRef.current = true;
    }
  }, [open, initialSelectedTools]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      setCustomTools([]);
      setSelectedTools([]);
      setSearchTerm('');
      setLoading(false);
      setShowCreateDialog(false);
      hasLoadedRef.current = false;
      initialSelectionSetRef.current = false;
    }
  }, [open]);

  // Load all tools when dialog opens
  useEffect(() => {
    if (!open || hasLoadedRef.current) {
      return;
    }

    const loadTools = async () => {
      try {
        setLoading(true);
        hasLoadedRef.current = true;

        const tools = await listCustomTools({ skip: 0, limit: 100 });
        setCustomTools(tools);
      } catch (error) {
        console.error('Error loading custom tools:', error);
        setCustomTools([]);
        hasLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, [open]);

  const reloadTools = async () => {
    try {
      const tools = await listCustomTools({ skip: 0, limit: 100 });
      setCustomTools(tools);
    } catch (error) {
      console.error('Error reloading custom tools:', error);
    }
  };

  const handleCreateTool = async (data: CustomToolFormData) => {
    setIsCreatingTool(true);
    try {
      const newTool = await createCustomTool(data);
      await reloadTools();
      setSelectedTools(prev => [...prev, newTool]);
      setShowCreateDialog(false);
      toast.success(tTools('messages.createSuccess'));
    } catch (error) {
      console.error('Error creating custom tool:', error);
      toast.error(tTools('messages.createError'));
    } finally {
      setIsCreatingTool(false);
    }
  };

  const toggleTool = (tool: CustomTool) => {
    const isSelected = selectedTools.some(t => t.id === tool.id);
    if (isSelected) {
      setSelectedTools(selectedTools.filter(t => t.id !== tool.id));
    } else {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const handleSave = () => {
    onSave(selectedTools);
    onOpenChange(false);
  };

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

  const filteredTools = customTools.filter(tool => {
    if (!searchTerm) return true;
    return (
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(tool.tags) && tool.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-500" />
              {t('dialogs.customTools.title')}
            </DialogTitle>
            <DialogDescription>
              {t('tools.customTools.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search + Create */}
            <div className="p-4 border-b flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('dialogs.customTools.searchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateDialog(true)}
                className="gap-2 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                {t('tools.customTools.create')}
              </Button>
            </div>

            {/* Tools List */}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : filteredTools.length > 0 ? (
                <div className="space-y-3">
                  {filteredTools.map(tool => {
                    const isSelected = selectedTools.some(t => t.id === tool.id);
                    return (
                      <div
                        key={tool.id}
                        className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-purple-500/50 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/30'
                        }`}
                        onClick={() => toggleTool(tool)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleTool(tool)}
                            className="mt-1 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                            onClick={e => e.stopPropagation()}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="h-4 w-4 text-purple-500 flex-shrink-0" />
                              <h3 className="font-medium truncate">{tool.name}</h3>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getMethodColor(tool.method)}`}
                              >
                                {tool.method.toUpperCase()}
                              </Badge>
                            </div>

                            {tool.description && (
                              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                {tool.description}
                              </p>
                            )}

                            <div className="flex items-center gap-1 mb-2">
                              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                {tool.endpoint}
                              </span>
                            </div>

                            {Array.isArray(tool.tags) && tool.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {tool.tags.slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                                {tool.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{tool.tags.length - 3} {t('dialogs.customTools.more')}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Code className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? t('messages.noResults')
                      : t('tools.customTools.noTools')}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1 mb-3">
                    {!searchTerm && t('dialogs.customTools.createFirst')}
                  </p>
                  {!searchTerm && (
                    <Button
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {t('tools.customTools.create')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Selected Count */}
            {selectedTools.length > 0 && (
              <div className="border-t p-4">
                <p className="text-sm text-muted-foreground">
                  {t('dialogs.customTools.toolsSelected', { count: selectedTools.length })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={selectedTools.length === 0}>
              {selectedTools.length === 0
                ? t('dialogs.customTools.selectTools')
                : t('dialogs.customTools.addSelected', { count: selectedTools.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline create tool sub-dialog — preserves wizard state */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-500" />
              {t('tools.customTools.create')}
            </DialogTitle>
          </DialogHeader>
          <CustomToolForm
            mode="create"
            loading={isCreatingTool}
            onSubmit={handleCreateTool}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomToolsSelectionDialog;
