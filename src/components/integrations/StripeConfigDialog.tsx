import { useTranslation as useUiTranslation } from 'react-i18next';
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
import StripeService from '@/services/integrations/stripeService';
import { MCPTool, StripeConfig } from '@/types/integrations';

interface StripeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StripeConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<StripeConfig>;
  agentId: string;
}

const StripeConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: StripeConfigDialogProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [config, setConfig] = useState<StripeConfig>({
    provider: 'stripe',
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
      const loadedConfig = await StripeService.getConfiguration(agentId);
      if (loadedConfig) {
        setConfig({
          provider: 'stripe',
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
          provider: 'stripe',
          username: '',
          email: '',
          connected: false,
          tools: [],
        });
      }
    } catch (error) {
      console.error('Error loading Stripe configuration:', error);
      setConfig({
        provider: 'stripe',
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
      const response = await StripeService.discoverTools(agentId);
      setAvailableTools(response.tools || []);
    } catch (error) {
      console.error('Error loading Stripe tools:', error);
      toast.error(tUi("interface:stripeconfigdialog.couldNotLoadAvailableTools"));
    } finally {
      setIsLoadingTools(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    try {
      const response = await StripeService.generateAuthorization(agentId);

      if (response.url) {
        // Redirect to Stripe OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      toast.error(tUi("interface:stripeconfigdialog.couldNotConnectToStripe"));
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
      await StripeService.saveConfiguration(agentId, updatedConfig);

      // Then update local state
      onSave(updatedConfig);
      toast.success(tUi("integrations:messages.saveSuccess"));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Stripe configuration:', error);
      toast.error(tUi("integrations:messages.saveError"));
    }
  };

  const handleDisconnect = async () => {
    try {
      await StripeService.disconnect(agentId);
      if (onDisconnect) {
        onDisconnect();
      }
      toast.success(tUi("interface:stripeconfigdialog.stripeDisconnectedSuccessfully"));
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Stripe:', error);
      toast.error(tUi("interface:stripeconfigdialog.couldNotDisconnectStripe"));
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
            <BrandIcon id="stripe" size={20} className="h-5 w-5" />
            {t('edit.integrations.stripe.configTitle')}
          </DialogTitle>
        </DialogHeader>

        {!config.connected ? (
          /* Not connected - Show connect screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BrandIcon id="stripe" size={48} className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.integrations.stripe.connectTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.stripe.connectDescription')}
                </p>
              </div>
            </div>

            <Button
              onClick={handleConnectStripe}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('edit.integrations.stripe.connecting')}
                </>
              ) : (
                <>
                  <BrandIcon id="stripe" size={16} className="mr-2 h-4 w-4" />
                  {t('edit.integrations.stripe.connectButton')}
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
                    {t('edit.integrations.stripe.connected')}
                  </span>
                </div>
                {config.username && (
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    {t('edit.integrations.stripe.connectedAs')}:{' '}
                    <strong>{config.username}</strong>
                  </p>
                )}
                {config.email && (
                  <p className="text-sm text-green-700 dark:text-green-300">{config.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.stripe.connectedDescription')}
                </p>
              </div>
            </div>

            {/* Tools Selection */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">
                    {t('edit.integrations.stripe.toolsTitle')}
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
                        {t('edit.integrations.stripe.selectAll')}
                      </Label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('edit.integrations.stripe.toolsDescription')}
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
                  {t('edit.integrations.stripe.noTools')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Button onClick={handleSave} className="w-full">
                {t('edit.integrations.stripe.saveConfig')}
              </Button>

              {onDisconnect && (
                <Button
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="w-full text-destructive hover:text-destructive/80"
                >
                  {t('edit.integrations.stripe.disconnect')}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StripeConfigDialog;
