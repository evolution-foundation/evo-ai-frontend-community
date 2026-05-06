import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
} from '@evoapi/design-system';
import BrandIcon from '@/components/BrandIcon';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@evoapi/design-system';
import { Sheet, CheckSquare, Edit3, FilePlus, Loader2, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import GoogleSheetsService from '@/services/integrations/googleSheetsService';
import type {
  GoogleSheetsConfig,
  GoogleSheetsItem,
} from '@/types/integrations/googleSheets';

interface GoogleSheetsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: GoogleSheetsConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<GoogleSheetsConfig>;
  agentId: string;
}

const GoogleSheetsConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: GoogleSheetsConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [availableSpreadsheets, setAvailableSpreadsheets] = useState<GoogleSheetsItem[]>([]);

  const [config, setConfig] = useState<GoogleSheetsConfig>({
    provider: 'google_sheets',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    spreadsheets: initialConfig?.spreadsheets || [],
    settings: {
      selectedSpreadsheetId: initialConfig?.settings?.selectedSpreadsheetId || '',
      allowRead: initialConfig?.settings?.allowRead !== false, // default true
      allowWrite: initialConfig?.settings?.allowWrite !== false, // default true
      allowCreate: initialConfig?.settings?.allowCreate !== false, // default true
      autoSyncEnabled: initialConfig?.settings?.autoSyncEnabled || false,
    },
  });

  // Sync config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        provider: 'google_sheets',
        email: initialConfig?.email || '',
        connected: initialConfig?.connected || false,
        spreadsheets: initialConfig?.spreadsheets || [],
        settings: {
          selectedSpreadsheetId: initialConfig?.settings?.selectedSpreadsheetId || '',
          allowRead: initialConfig?.settings?.allowRead !== false,
          allowWrite: initialConfig?.settings?.allowWrite !== false,
          allowCreate: initialConfig?.settings?.allowCreate !== false,
          autoSyncEnabled: initialConfig?.settings?.autoSyncEnabled || false,
        },
      });
    }
  }, [initialConfig]);

  // Load spreadsheets when connected
  useEffect(() => {
    if (config.connected && open) {
      loadSpreadsheets();
    }
  }, [config.connected, open]);

  const loadSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true);
    try {
      const spreadsheets = await GoogleSheetsService.getSpreadsheets(agentId);
      setAvailableSpreadsheets(spreadsheets);
      setConfig((prev: GoogleSheetsConfig) => ({ ...prev, spreadsheets }));
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      toast.error('Erro ao carregar planilhas');
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!config.email) {
      toast.error('Por favor, insira um e-mail');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await GoogleSheetsService.generateAuthorization(agentId, config.email);

      if (response.url) {
        // Redirect to Google OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Google Sheets:', error);
      toast.error('Erro ao conectar com Google Sheets');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!config.settings?.selectedSpreadsheetId) {
      toast.error('Por favor, selecione uma planilha');
      return;
    }

    try {
      // Save configuration to backend first
      await GoogleSheetsService.saveConfiguration(agentId, config);

      // Then update local state
      onSave(config);
      toast.success('Configurações salvas com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Sheets configuration:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleDisconnect = async () => {
    try {
      // Call backend to disconnect
      await GoogleSheetsService.disconnect(agentId);

      // Update local state
      if (onDisconnect) {
        onDisconnect();
      }

      toast.success('Google Sheets desconectado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error);
      toast.error('Erro ao desconectar Google Sheets');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandIcon id="google-sheets" size={20} className="h-5 w-5" />
            {t('edit.integrations.googleSheets.configTitle') || 'Configurar Google Sheets'}
          </DialogTitle>
        </DialogHeader>

        {!config.connected ? (
          /* Not connected - Show connect screen */
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BrandIcon id="google-sheets" size={48} className="h-12 w-12" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {t('edit.integrations.googleSheets.connectTitle') || 'Conectar com Google Sheets'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.googleSheets.connectDescription') ||
                    'Permita que o agente acesse, crie e gerencie planilhas do Google Sheets'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">
                  {t('edit.integrations.googleSheets.email') || 'E-mail do Google'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@gmail.com"
                  value={config.email}
                  onChange={e => setConfig({ ...config, email: e.target.value })}
                />
              </div>

              <Button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="w-full"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('edit.integrations.googleSheets.connecting') || 'Conectando...'}
                  </>
                ) : (
                  <>
                    <Sheet className="mr-2 h-4 w-4" />
                    {t('edit.integrations.googleSheets.connectButton') || 'Conectar com Google'}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Connected - Show configuration */
          <div className="space-y-6 py-4">
            {/* Spreadsheet Selection */}
            <div className="space-y-3">
              <Label>{t('edit.integrations.googleSheets.selectSpreadsheet') || 'Planilha'}</Label>
              <Select
                value={config.settings?.selectedSpreadsheetId}
                onValueChange={value =>
                  setConfig({
                    ...config,
                    settings: { ...config.settings, selectedSpreadsheetId: value },
                  })
                }
                disabled={isLoadingSpreadsheets}
              >
                <SelectTrigger>
                  {isLoadingSpreadsheets ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando planilhas...
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione uma planilha" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableSpreadsheets.map(spreadsheet => (
                    <SelectItem key={spreadsheet.id} value={spreadsheet.id}>
                      {spreadsheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Escolha qual planilha o agente terá acesso
              </p>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Permissões
              </Label>

              {/* Allow Read */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Permitir Leitura</p>
                    <p className="text-xs text-muted-foreground">
                      Agente pode consultar dados da planilha
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.settings?.allowRead}
                  onCheckedChange={checked =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, allowRead: checked },
                    })
                  }
                />
              </div>

              {/* Allow Write */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Permitir Escrita</p>
                    <p className="text-xs text-muted-foreground">
                      Agente pode atualizar células da planilha
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.settings?.allowWrite}
                  onCheckedChange={checked =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, allowWrite: checked },
                    })
                  }
                />
              </div>

              {/* Allow Create */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FilePlus className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Permitir Criação</p>
                    <p className="text-xs text-muted-foreground">
                      Agente pode criar novas linhas na planilha
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.settings?.allowCreate}
                  onCheckedChange={checked =>
                    setConfig({
                      ...config,
                      settings: { ...config.settings, allowCreate: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t">
          {config.connected && (
            <Button onClick={handleSave} className="w-full">
              {t('edit.integrations.googleSheets.saveConfig') || 'APLICAR CONFIGURAÇÕES'}
            </Button>
          )}

          {onDisconnect && config.connected && (
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive/80"
            >
              {t('edit.integrations.googleSheets.disconnect') || 'Desconectar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsConfigDialog;
