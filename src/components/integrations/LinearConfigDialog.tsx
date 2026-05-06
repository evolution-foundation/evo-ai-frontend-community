import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Checkbox,
  Label,
} from '@evoapi/design-system';
import BrandIcon from '@/components/BrandIcon';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import LinearService from '@/services/integrations/linearService';
import { MCPTool, LinearConfig } from '@/types/integrations';

interface LinearConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: LinearConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<LinearConfig>;
  agentId: string;
}

const LinearConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: LinearConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [config, setConfig] = useState<LinearConfig>({
    provider: 'linear',
    username: initialConfig?.username || '',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    tools: initialConfig?.tools || [],
  });

  // Load configuration when dialog opens
  useEffect(() => {
    if (open) {
      loadConfiguration();
    }
  }, [open, agentId]);

  const loadConfiguration = async () => {
    setIsLoading(true);
    try {
      const loadedConfig = await LinearService.getConfiguration(agentId);
      if (loadedConfig) {
        setConfig({
          provider: 'linear',
          username: loadedConfig.username || '',
          email: loadedConfig.email || '',
          connected: loadedConfig.connected || false,
          tools: loadedConfig.tools || [],
        });
        setSelectedTools(loadedConfig.tools || []);

        // If connected, load available tools
        if (loadedConfig.connected) {
          loadAvailableTools();
        }
      } else {
        setConfig({
          provider: 'linear',
          username: '',
          email: '',
          connected: false,
          tools: [],
        });
      }
    } catch (error) {
      console.error('Error loading Linear configuration:', error);
      setConfig({
        provider: 'linear',
        username: '',
        email: '',
        connected: false,
        tools: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTools = async () => {
    setIsLoadingTools(true);
    try {
      const response = await LinearService.discoverTools(agentId);
      setAvailableTools(response.tools || []);
    } catch (error) {
      console.error('Error loading Linear tools:', error);
      toast.error('Erro ao carregar ferramentas disponíveis');
    } finally {
      setIsLoadingTools(false);
    }
  };

  const handleConnectLinear = async () => {
    setIsConnecting(true);
    try {
      const response = await LinearService.generateAuthorization(agentId);

      if (response.url) {
        // Redirect to Linear OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Linear:', error);
      toast.error('Erro ao conectar com Linear');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleToolToggle = (toolName: string) => {
    setSelectedTools(prev => {
      if (prev.includes(toolName)) {
        return prev.filter(t => t !== toolName);
      } else {
        return [...prev, toolName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTools.length === availableTools.length) {
      // If all are selected, deselect all
      setSelectedTools([]);
    } else {
      // Select all tools
      setSelectedTools(availableTools.map(tool => tool.name));
    }
  };

  const handleSave = async () => {
    try {
      const updatedConfig = {
        ...config,
        tools: selectedTools,
      };

      // Save configuration to backend
      await LinearService.saveConfiguration(agentId, updatedConfig);

      // Then update local state
      onSave(updatedConfig);
      toast.success('Configurações salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Linear configuration:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleDisconnect = async () => {
    try {
      await LinearService.disconnect(agentId);
      if (onDisconnect) {
        onDisconnect();
      }
      toast.success('Linear desconectado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Linear:', error);
      toast.error('Erro ao desconectar Linear');
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandIcon id="linear" size={20} className="h-5 w-5" />
            {t('edit.integrations.linear.configTitle') || 'Configurar Linear'}
          </DialogTitle>
        </DialogHeader>

        {!config.connected ? (
          /* Not connected - Show connect screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BrandIcon id="linear" size={48} className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.integrations.linear.connectTitle') || 'Conectar com Linear'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.linear.connectDescription') ||
                    'Conecte sua conta Linear para permitir que o agente acesse issues, projetos e roadmaps'}
                </p>
              </div>
            </div>

            <Button
              onClick={handleConnectLinear}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('edit.integrations.linear.connecting') || 'Conectando...'}
                </>
              ) : (
                <>
                  <BrandIcon id="linear" size={16} className="mr-2 h-4 w-4" />
                  {t('edit.integrations.linear.connectButton') || 'Conectar com Linear'}
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Connected - Show configuration */
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium">
                    {t('edit.integrations.linear.connected') || 'Conectado'}
                  </span>
                </div>
                {config.username && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    {t('edit.integrations.linear.connectedAs') || 'Conectado como'}:{' '}
                    <strong>{config.username}</strong>
                  </p>
                )}
                {config.email && (
                  <p className="text-sm text-green-700 dark:text-green-300">{config.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.linear.connectedDescription') ||
                    'O agente agora pode acessar issues, projetos e roadmaps do Linear.'}
                </p>
              </div>
            </div>

            {/* Tools Selection */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">
                    {t('edit.integrations.linear.toolsTitle') || 'Ferramentas Disponíveis'}
                  </h4>
                  {availableTools.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={
                          selectedTools.length === availableTools.length &&
                          availableTools.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-xs font-medium cursor-pointer">
                        {t('edit.integrations.linear.selectAll') || 'Selecionar todas'}
                      </Label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('edit.integrations.linear.toolsDescription') ||
                    'Selecione quais ferramentas do Linear o agente poderá usar'}
                </p>
              </div>

              {isLoadingTools ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableTools.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {availableTools.map(tool => (
                    <div
                      key={tool.id}
                      className="flex items-start space-x-3 p-2 hover:bg-accent rounded-md"
                    >
                      <Checkbox
                        id={tool.id}
                        checked={selectedTools.includes(tool.name)}
                        onCheckedChange={() => handleToolToggle(tool.name)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={tool.id} className="text-sm font-medium cursor-pointer">
                          {tool.name}
                        </Label>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  {t('edit.integrations.linear.noTools') || 'Nenhuma ferramenta disponível'}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button onClick={handleSave} className="w-full">
                {t('edit.integrations.linear.saveConfig') || 'SALVAR CONFIGURAÇÕES'}
              </Button>

              {onDisconnect && (
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="w-full text-destructive hover:text-destructive/80"
                >
                  {t('edit.integrations.linear.disconnect') || 'Desconectar'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LinearConfigDialog;
