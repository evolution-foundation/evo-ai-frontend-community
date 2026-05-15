import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { KnowledgeNexusConfig } from '@/hooks/useIntegrations';
import {
  agentIntegrationsService,
  type NexusSpace,
} from '@/services/agents/agentIntegrationsService';

export type { KnowledgeNexusConfig };

interface KnowledgeNexusConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: KnowledgeNexusConfig) => void;
  onDeactivate?: () => void;
  initialConfig?: Partial<KnowledgeNexusConfig>;
}

const DEFAULT_TOP_K = 10;
const DEFAULT_TIMEOUT = 15;

interface DialogState {
  nexus_base_url: string;
  nexus_api_key: string;
  space_id: string;
  default_top_k: number;
  timeout_seconds: number;
}

const KnowledgeNexusConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDeactivate,
  initialConfig,
}: KnowledgeNexusConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  // Backend strips `nexus_api_key` before returning the config (defense-in-depth
  // in useIntegrations.sanitizeConfig). When `connected === true` but the key
  // is absent in initialConfig, the user has a saved key — render a hint and
  // let them leave the field blank to keep the existing key.
  const hasSavedApiKey = Boolean(initialConfig?.connected) && !initialConfig?.nexus_api_key;

  const [config, setConfig] = useState<DialogState>({
    nexus_base_url: initialConfig?.nexus_base_url || '',
    nexus_api_key: initialConfig?.nexus_api_key || '',
    space_id: initialConfig?.space_id || '',
    default_top_k: initialConfig?.default_top_k ?? DEFAULT_TOP_K,
    timeout_seconds: initialConfig?.timeout_seconds ?? DEFAULT_TIMEOUT,
  });

  // Reset state whenever the dialog opens so abandoned edits don't persist
  // across opens and a freshly loaded `initialConfig` is honored.
  useEffect(() => {
    if (open) {
      setConfig({
        nexus_base_url: initialConfig?.nexus_base_url || '',
        nexus_api_key: '',
        space_id: initialConfig?.space_id || '',
        default_top_k: initialConfig?.default_top_k ?? DEFAULT_TOP_K,
        timeout_seconds: initialConfig?.timeout_seconds ?? DEFAULT_TIMEOUT,
      });
      setSpaces(null);
      setSpacesError(null);
      setManualSpaceMode(false);
    }
  }, [open, initialConfig]);

  const [spaces, setSpaces] = useState<NexusSpace[] | null>(null);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);
  // When the Nexus call fails (CORS, 401, network), let the user fall back to
  // typing the UUID by hand instead of being blocked.
  const [manualSpaceMode, setManualSpaceMode] = useState(false);

  const fetchSpaces = async () => {
    const baseUrl = config.nexus_base_url.trim().replace(/\/$/, '');
    const apiKey = config.nexus_api_key.trim();
    if (!baseUrl || !apiKey) {
      setSpacesError(
        t('edit.integrations.knowledgeNexus.spacesNeedCreds') ||
          'Enter the base URL and API key first.'
      );
      return;
    }
    setLoadingSpaces(true);
    setSpacesError(null);
    try {
      const list = await agentIntegrationsService.listKnowledgeNexusSpaces(baseUrl, apiKey);
      setSpaces(list);
      if (list.length === 0) {
        setSpacesError(
          t('edit.integrations.knowledgeNexus.spacesEmpty') ||
            'No spaces found for this API key.'
        );
      }
    } catch (error: unknown) {
      console.error('Error fetching Nexus spaces:', error);
      setSpaces(null);
      // The backend proxy maps upstream auth/scope/connectivity errors to
      // 401/403/502 — surface the message when available, otherwise a hint.
      const responseObj = (error as { response?: { data?: { message?: string } } }).response;
      const apiMsg = responseObj?.data?.message;
      setSpacesError(
        apiMsg ||
          t('edit.integrations.knowledgeNexus.spacesError') ||
          'Could not load spaces. Check the URL and API key, or paste the Space ID manually.'
      );
    } finally {
      setLoadingSpaces(false);
    }
  };

  // Auto-load the list once URL + a freshly-typed API key are both present.
  // We only auto-fetch when the user actually typed a key (not on saved-key
  // re-edits, where the key was never sent down).
  useEffect(() => {
    if (!open) return;
    if (manualSpaceMode) return;
    const baseUrl = config.nexus_base_url.trim();
    const apiKey = config.nexus_api_key.trim();
    if (!baseUrl || !apiKey) return;
    // debounce slightly so we don't fire on every keystroke
    const handle = setTimeout(() => {
      fetchSpaces();
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, config.nexus_base_url, config.nexus_api_key, manualSpaceMode]);

  const apiKeyOk = config.nexus_api_key.trim() !== '' || hasSavedApiKey;
  const isValid =
    config.nexus_base_url.trim() !== '' && apiKeyOk && config.space_id.trim() !== '';

  const handleSave = () => {
    const payload: KnowledgeNexusConfig = {
      connected: true,
      nexus_base_url: config.nexus_base_url.trim(),
      space_id: config.space_id.trim(),
      default_top_k: config.default_top_k,
      timeout_seconds: config.timeout_seconds,
    };
    // Only include the API key when the user actually typed one; leaving it
    // blank means "keep whatever is stored on the backend".
    const typedKey = config.nexus_api_key.trim();
    if (typedKey) {
      payload.nexus_api_key = typedKey;
    }
    onSave(payload);
    onOpenChange(false);
  };

  const handleDeactivate = () => {
    onDeactivate?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('edit.integrations.knowledgeNexus.configTitle') || 'Configurar Knowledge Nexus'}
          </DialogTitle>
          <DialogDescription>
            {t('edit.integrations.knowledgeNexus.intro') ||
              'Conecte este agente a uma base de conhecimento do EvoNexus para que ele possa buscar informações curadas antes de responder.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nexus_base_url">
              {t('edit.integrations.knowledgeNexus.baseUrl') || 'URL base do Nexus'}
            </Label>
            <Input
              id="nexus_base_url"
              type="text"
              placeholder="https://nexus.suaempresa.com"
              value={config.nexus_base_url}
              onChange={e => setConfig({ ...config, nexus_base_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {t('edit.integrations.knowledgeNexus.baseUrlHint') ||
                'Endereço do dashboard EvoNexus (sem barra no final).'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nexus_api_key">
              {t('edit.integrations.knowledgeNexus.apiKey') || 'API Key'}
            </Label>
            <Input
              id="nexus_api_key"
              type="password"
              placeholder={
                hasSavedApiKey
                  ? t('edit.integrations.knowledgeNexus.apiKeySavedPlaceholder') ||
                    'Deixe em branco para manter a chave salva'
                  : 'evo_k_...'
              }
              value={config.nexus_api_key}
              onChange={e => setConfig({ ...config, nexus_api_key: e.target.value })}
            />
            {hasSavedApiKey ? (
              <p className="text-xs text-green-600">
                {t('edit.integrations.knowledgeNexus.apiKeySaved') ||
                  '✓ Chave já configurada — deixe em branco para manter, redigite para substituir.'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('edit.integrations.knowledgeNexus.apiKeyHint') ||
                  'Chave de API gerada no Nexus em Knowledge → API Keys. Formato evo_k_<prefix>.<secret>.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="space_id">
                {t('edit.integrations.knowledgeNexus.space') || 'Knowledge space'}
              </Label>
              {!manualSpaceMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={fetchSpaces}
                  disabled={
                    loadingSpaces ||
                    !config.nexus_base_url.trim() ||
                    !config.nexus_api_key.trim()
                  }
                >
                  {loadingSpaces ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {t('edit.integrations.knowledgeNexus.reloadSpaces') || 'Reload'}
                </Button>
              )}
            </div>

            {!manualSpaceMode && spaces && spaces.length > 0 ? (
              <Select
                value={config.space_id}
                onValueChange={value => setConfig({ ...config, space_id: value })}
              >
                <SelectTrigger id="space_id">
                  <SelectValue
                    placeholder={
                      t('edit.integrations.knowledgeNexus.spaceSelect') ||
                      'Select a knowledge space'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map(space => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name || space.slug || space.id}
                      {space.slug && space.name ? ` (${space.slug})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="space_id"
                type="text"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={config.space_id}
                onChange={e => setConfig({ ...config, space_id: e.target.value })}
              />
            )}

            {loadingSpaces && !spaces && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('edit.integrations.knowledgeNexus.loadingSpaces') ||
                  'Loading spaces from Nexus...'}
              </p>
            )}
            {spacesError && (
              <p className="text-xs text-destructive">{spacesError}</p>
            )}
            {!loadingSpaces && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => {
                  setManualSpaceMode(!manualSpaceMode);
                  setSpacesError(null);
                }}
              >
                {manualSpaceMode
                  ? t('edit.integrations.knowledgeNexus.useDropdown') ||
                    'Pick from the list'
                  : t('edit.integrations.knowledgeNexus.useManual') ||
                    'Paste Space ID manually'}
              </button>
            )}
            {!spacesError && !loadingSpaces && (
              <p className="text-xs text-muted-foreground">
                {manualSpaceMode
                  ? t('edit.integrations.knowledgeNexus.spaceIdHint') ||
                    'UUID of the knowledge space this agent will query.'
                  : t('edit.integrations.knowledgeNexus.spaceHint') ||
                    'Spaces are fetched from your Nexus instance once URL + API key are filled.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_top_k">
                {t('edit.integrations.knowledgeNexus.topK') || 'Top K (padrão)'}
              </Label>
              <Input
                id="default_top_k"
                type="number"
                min={1}
                max={50}
                value={config.default_top_k ?? DEFAULT_TOP_K}
                onChange={e =>
                  setConfig({
                    ...config,
                    default_top_k: Math.max(1, Math.min(50, Number(e.target.value) || DEFAULT_TOP_K)),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeout_seconds">
                {t('edit.integrations.knowledgeNexus.timeout') || 'Timeout (s)'}
              </Label>
              <Input
                id="timeout_seconds"
                type="number"
                min={1}
                max={60}
                value={config.timeout_seconds ?? DEFAULT_TIMEOUT}
                onChange={e =>
                  setConfig({
                    ...config,
                    timeout_seconds: Math.max(
                      1,
                      Math.min(60, Number(e.target.value) || DEFAULT_TIMEOUT)
                    ),
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleSave} disabled={!isValid} className="w-full">
              {t('edit.integrations.knowledgeNexus.apply') || 'APLICAR CONFIGURAÇÕES'}
            </Button>

            {onDeactivate && (
              <Button
                variant="ghost"
                onClick={handleDeactivate}
                className="w-full text-destructive hover:text-destructive/80"
              >
                {t('edit.integrations.knowledgeNexus.deactivate') || 'Desativar integração'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeNexusConfigDialog;
