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
import { Search, Server, Tag, Clock, RotateCcw, Plus, Wand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listCustomMcpServers } from '@/services/agents';
import { CustomMcpServer } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';

interface CustomMCPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (selectedServerIds: string[]) => void;
  initialSelectedIds?: string[];
  /** Hides the "create new MCP" shortcuts: they navigate away and drop the unsaved form. */
  hideCreateNew?: boolean;
}

const CustomMCPDialog = ({
  open,
  onOpenChange,
  onSave,
  initialSelectedIds = [],
  hideCreateNew = false,
}: CustomMCPDialogProps) => {
  const { t } = useLanguage('aiAgents');
  const navigate = useNavigate();
  const [customMCPServers, setCustomMCPServers] = useState<CustomMcpServer[]>([]);
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const hasLoadedRef = useRef(false);
  const initialSelectionSetRef = useRef(false);

  useEffect(() => {
    if (open && !initialSelectionSetRef.current) {
      setSelectedServerIds([...initialSelectedIds]);
      initialSelectionSetRef.current = true;
    }
  }, [open, initialSelectedIds]);

  useEffect(() => {
    if (!open) {
      setCustomMCPServers([]);
      setSelectedServerIds([]);
      setSearchTerm('');
      setLoading(false);
      hasLoadedRef.current = false;
      initialSelectionSetRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasLoadedRef.current) {
      return;
    }

    const loadServers = async () => {
      try {
        setLoading(true);
        hasLoadedRef.current = true;

        const servers = await listCustomMcpServers({ skip: 0, limit: 100 });
        setCustomMCPServers(servers);
      } catch (error) {
        console.error('Error loading custom MCP servers:', error);
        setCustomMCPServers([]);
        hasLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadServers();
  }, [open]);

  const toggleServer = (serverId: string) => {
    if (selectedServerIds.includes(serverId)) {
      setSelectedServerIds(selectedServerIds.filter(id => id !== serverId));
    } else {
      setSelectedServerIds([...selectedServerIds, serverId]);
    }
  };

  const handleSave = () => {
    onSave(selectedServerIds);
    onOpenChange(false);
  };

  const filteredServers = customMCPServers.filter(server => {
    if (!searchTerm) return true;
    return (
      server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (server.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      server.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* `sm:text-center` and not `text-center`: tailwind-merge only cancels a
            responsive variant with another responsive variant. */}
        <DialogHeader className="sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Server className="h-5 w-5 text-emerald-500" />
            {t('dialogs.customMcp.title')}
          </DialogTitle>
          <DialogDescription>{t('tools.mcpServers.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            {/* No border/background/height override on the Input, so the `--ring` focus
                token shows. */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('dialogs.customMcp.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredServers.length > 0 ? (
              <div className="space-y-3">
                {filteredServers.map(server => (
                  <div
                    key={server.id}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedServerIds.includes(server.id)
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-border hover:border-emerald-500/30'
                    }`}
                    onClick={() => toggleServer(server.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedServerIds.includes(server.id)}
                        onCheckedChange={() => toggleServer(server.id)}
                        className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        onClick={e => e.stopPropagation()}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          <h3 className="font-medium truncate">{server.name}</h3>
                        </div>

                        {server.description && (
                          <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                            {server.description}
                          </p>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono truncate">{server.url}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {server.timeout}s {t('dialogs.customMcp.timeout')}
                            </div>
                            <div className="flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {server.retry_count} {t('dialogs.customMcp.retries')}
                            </div>
                            {server.tools && server.tools.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Wand className="h-3 w-3" />
                                {server.tools.length} {t('tools.title')}
                              </div>
                            )}
                            {Object.keys(server.headers).length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {Object.keys(server.headers).length}{' '}
                                {t('dialogs.toolsDialog.headers')}
                              </div>
                            )}
                          </div>
                        </div>

                        {server.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {server.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {server.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{server.tags.length - 3} {t('dialogs.customMcp.more')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? t('messages.noResults') : t('tools.mcpServers.noServers')}
                </p>
                <p className="text-muted-foreground text-sm mt-1 mb-3">
                  {!searchTerm && t('dialogs.customMcp.createFirst')}
                </p>
                {!searchTerm && !hideCreateNew && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/custom-mcp-servers');
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t('tools.mcpServers.add')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {selectedServerIds.length > 0 && (
            <div className="border-t p-4">
              <p className="text-sm text-muted-foreground">
                {t('dialogs.customMcp.serversSelected', { count: selectedServerIds.length })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t p-4 sm:justify-start">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          {customMCPServers.length > 0 && !hideCreateNew && (
            <Button
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                navigate('/custom-mcp-servers');
              }}
            >
              <Plus className="h-4 w-4" />
              {t('tools.mcpServers.add')}
            </Button>
          )}
          {/* `onSave` replaces the whole selection, so confirming with none checked is
              how every server gets unlinked. */}
          <Button className="flex-1" onClick={handleSave}>
            {t('dialogs.customMcp.saveSelection', { count: selectedServerIds.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomMCPDialog;
