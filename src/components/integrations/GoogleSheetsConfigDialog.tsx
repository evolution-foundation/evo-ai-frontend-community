import { useTranslation as useUiTranslation } from 'react-i18next';
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
  const { t: tUi } = useUiTranslation();
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
      toast.error(tUi("interface:googlesheetsconfigdialog.couldNotLoadSpreadsheets"));
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!config.email) {
      toast.error(tUi("interface:googlesheetsconfigdialog.pleaseEnterAnEmailAddress"));
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
      toast.error(tUi("interface:googlesheetsconfigdialog.couldNotConnectToGoogleSheets"));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!config.settings?.selectedSpreadsheetId) {
      toast.error(tUi("interface:googlesheetsconfigdialog.pleaseSelectASpreadsheet"));
      return;
    }

    try {
      // Save configuration to backend first
      await GoogleSheetsService.saveConfiguration(agentId, config);

      // Then update local state
      onSave(config);
      toast.success(tUi("integrations:messages.saveSuccess"));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Sheets configuration:', error);
      toast.error(tUi("integrations:messages.saveError"));
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

      toast.success(tUi("interface:googlesheetsconfigdialog.googleSheetsDisconnectedSuccessfully"));
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error);
      toast.error(tUi("interface:googlesheetsconfigdialog.couldNotDisconnectGoogleSheets"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrandIcon id="google-sheets" size={20} className="h-5 w-5" />
            {t('edit.integrations.googleSheets.configTitle')}
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
                  {t('edit.integrations.googleSheets.connectTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('edit.integrations.googleSheets.connectDescription')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">
                  {t('edit.integrations.googleSheets.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tUi("aiAgents:edit.integrations.googleCalendar.emailPlaceholder")}
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
                    {t('edit.integrations.googleSheets.connecting')}
                  </>
                ) : (
                  <>
                    <Sheet className="mr-2 h-4 w-4" />
                    {t('edit.integrations.googleSheets.connectButton')}
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
              <Label>{t('edit.integrations.googleSheets.selectSpreadsheet')}</Label>
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
                      {tUi("interface:googlesheetsconfigdialog.loadingSpreadsheets")}</span>
                  ) : (
                    <SelectValue placeholder={tUi("interface:googlesheetsconfigdialog.selectASpreadsheet")} />
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
                {tUi("interface:googlesheetsconfigdialog.chooseWhichSpreadsheetTheAgentCanAccess")}</p>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                {tUi("roles:table.permissions")}</Label>

              {/* Allow Read */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{tUi("interface:googlesheetsconfigdialog.allowReading")}</p>
                    <p className="text-xs text-muted-foreground">
                      {tUi("interface:googlesheetsconfigdialog.theAgentCanReadSpreadsheetData")}</p>
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
                    <p className="text-sm font-medium">{tUi("interface:googlesheetsconfigdialog.allowWriting")}</p>
                    <p className="text-xs text-muted-foreground">
                      {tUi("interface:googlesheetsconfigdialog.theAgentCanUpdateSpreadsheetCells")}</p>
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
                    <p className="text-sm font-medium">{tUi("interface:googlesheetsconfigdialog.allowCreation")}</p>
                    <p className="text-xs text-muted-foreground">
                      {tUi("interface:googlesheetsconfigdialog.theAgentCanCreateSpreadsheetRows")}</p>
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
              {t('edit.integrations.googleSheets.saveConfig')}
            </Button>
          )}

          {onDisconnect && config.connected && (
            <Button
              variant="ghost"
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive/80"
            >
              {t('edit.integrations.googleSheets.disconnect')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSheetsConfigDialog;
