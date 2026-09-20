import { useState, useEffect, useCallback } from 'react';
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
} from '@evoapi/design-system';
import { MCPServer, MCPServerConfig } from '@/types/ai';
import { Server, Settings, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { VaultCredentialSelect, useVaultCredentials } from '@/components/ai_agents/shared';
import { Tool } from '@/types';

interface MCPConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: MCPServerConfig) => void;
  availableServers: MCPServer[];
  initialConfig?: MCPServerConfig | null;
  currentStep?: number;
  totalSteps?: number;
  onSkip?: () => void;
  mcpServers?: MCPServerConfig[];
}

const MCPConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  availableServers,
  initialConfig = null,
  currentStep = 1,
  totalSteps = 1,
  onSkip,
  mcpServers = [],
}: MCPConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');
  // Gated on `open`: the dialog mounts closed on the agent screens, and an
  // eager fetch would be one vault listing (a 403 without the grant) per render.
  const vaultCredentials = useVaultCredentials(open);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [mcpEnvironments, setMcpEnvironments] = useState<Record<string, unknown>>({});
  // EVO-2250 story 2.4 AC7: env var name -> vault credential id.
  const [credentialRefs, setCredentialRefs] = useState<Record<string, string>>({});

  // Resetting to a FRESH {} on every run of an effect whose deps are unstable
  // (initialConfig and mcpServers arrive as new objects) re-renders forever.
  // Keeping the identity when the value is already empty makes the reset a
  // no-op, which is what it means.
  const clearCredentialRefs = useCallback(() => {
    setCredentialRefs(prev => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  // Same reason for the environments map: the effect below depends on props
  // that arrive as fresh objects, so a reset that always allocates keeps
  // re-rendering. Pre-existing, and reachable as soon as a test renders this
  // dialog with inline props.
  const clearEnvironments = useCallback(() => {
    setMcpEnvironments(prev => (Object.keys(prev).length === 0 ? prev : {}));
  }, []);

  // And the selection: setState with the SAME value is a no-op for React, but
  // `null` here follows the two resets above, so keeping the whole reset path
  // allocation-free is what actually stops the loop.
  const clearSelectedServer = useCallback(() => {
    setSelectedServer(prev => (prev === null ? prev : null));
  }, []);

  const applyCredentialRefs = useCallback((next?: Record<string, string>) => {
    setCredentialRefs(prev => {
      const incoming = next ?? {};
      return JSON.stringify(prev) === JSON.stringify(incoming) ? prev : incoming;
    });
  }, []);
  const [toolIds, setToolIds] = useState<Record<string, string[]>>({});

  // Inicializar com configuração existente ou limpar
  useEffect(() => {
    if (open) {
      if (initialConfig) {
        // Modo edição - carregar configuração existente
        const server = availableServers.find(s => s.id === initialConfig.id);
        if (server) {
          setSelectedServer(server);
          setMcpEnvironments(initialConfig.environments || {});
          applyCredentialRefs(initialConfig.credential_refs);

          setToolIds(prev => {
            if (!prev[server.id]) {
              // Procurar no array de mcpServers primeiro
              const existingConfig = mcpServers.find(s => s.id === server.id);
              const tools = existingConfig?.tools || initialConfig?.tools || [];
              return {
                ...prev,
                [server.id]: tools.map(t => t.id || t.name),
              };
            }
            return prev;
          });
        }
      } else {
        // Modo criação - limpar tudo sempre
        clearSelectedServer();
        clearEnvironments();
        clearCredentialRefs();
      }
    } else {
      // Quando fecha o dialog, sempre limpar o estado para evitar persistência
      clearSelectedServer();
      clearEnvironments();
      clearCredentialRefs();
    }
  }, [
    open,
    initialConfig,
    availableServers,
    currentStep,
    mcpServers,
    applyCredentialRefs,
    clearCredentialRefs,
    clearEnvironments,
    clearSelectedServer,
  ]);

  const handleSelectServer = useCallback(
    (serverId: string) => {
      const server = availableServers.find(s => s.id === serverId);
      if (server) {
        setSelectedServer(server);

        // Inicializar campos de environment com valores vazios
        const initialEnvironments: Record<string, string> = {};
        Object.keys(server.environments || {}).forEach(key => {
          initialEnvironments[key] = '';
        });
        setMcpEnvironments(initialEnvironments);
        clearCredentialRefs();

        // Manter seleções existentes se for o mesmo servidor
        const existingConfig =
          mcpServers.find(s => s.id === serverId) ||
          (initialConfig && initialConfig.id === serverId ? initialConfig : null);

        if (existingConfig) {
          setToolIds(prev => ({
            ...prev,
            [serverId]: (existingConfig.tools || []).map(t => t.id || t.name),
          }));
        }
      }
    },
    [availableServers, initialConfig, mcpServers, clearCredentialRefs],
  );

  // A vault reference replaces the inline value for that ONE variable; an
  // undefined selection drops the entry so the inline value takes over again.
  const handleCredentialRefChange = useCallback((key: string, credentialId?: string) => {
    setCredentialRefs(prev => {
      const next = { ...prev };
      if (credentialId) {
        next[key] = credentialId;
      } else {
        delete next[key];
      }
      return next;
    });
  }, []);

  const handleEnvChange = useCallback((key: string, value: string) => {
    setMcpEnvironments(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleToolToggle = useCallback(
    (tool: Tool) => {
      if (!selectedServer) return;
      const serverId = selectedServer.id;
      const toolId = tool.id || tool.name;

      setToolIds(prev => {
        const serverTools = prev[serverId] || [];
        const isSelected = serverTools.includes(toolId);

        return {
          ...prev,
          [serverId]: isSelected
            ? serverTools.filter(id => id !== toolId)
            : [...serverTools, toolId],
        };
      });
    },
    [selectedServer],
  );

  const handleSave = useCallback(() => {
    if (!selectedServer) return;

    const selectedTools = selectedServer.tools.filter((tool: any) =>
      toolIds[selectedServer.id]?.includes(tool.id || tool.name),
    );

    const config: MCPServerConfig = {
      id: selectedServer.id,
      name: selectedServer.name,
      type: selectedServer.config_type,
      environments: mcpEnvironments,
      // Travels alongside the inline values: the runtime prefers the vault and
      // falls back to inline, and the API replaces the entry wholesale, so
      // dropping either half here loses it.
      credential_refs: credentialRefs,
      tools: selectedTools,
      toolIds: toolIds[selectedServer.id] || [],
    };

    onSave(config);
  }, [selectedServer, mcpEnvironments, credentialRefs, toolIds, onSave]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'oauth':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'webhook':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'basic_auth':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'credentials':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  // A required variable is satisfied by an inline value OR by a vault
  // reference (EVO-2250 story 2.4 AC7). Demanding the inline value would leave
  // the form permanently invalid for exactly the variables the vault exists to
  // hold, since pointing at a credential is what stops you from typing one.
  const isFormValid =
    selectedServer &&
    Object.entries(selectedServer.environments || {}).every(
      ([key]) =>
        Boolean(credentialRefs[key]) || (mcpEnvironments[key]?.toString().trim() ?? '') !== '',
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {initialConfig ? t('dialogs.mcpConfig.title') : t('tools.mcpServers.add')}
            {totalSteps > 1 && (
              <Badge variant="secondary" className="ml-auto">
                {currentStep} {t('dialogs.mcpConfig.of')} {totalSteps}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{t('tools.mcpServers.subtitle')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Seleção do servidor */}
            <div className="space-y-3">
              <Label htmlFor="server-select" className="text-sm font-medium">
                {t('dialogs.mcpConfig.serverName')}{' '}
                {!!initialConfig && t('dialogs.mcpConfig.notEditable')}
              </Label>
              <Select
                value={selectedServer?.id || ''}
                onValueChange={handleSelectServer}
                disabled={!!initialConfig}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('tools.mcpServers.add')} />
                </SelectTrigger>
                <SelectContent>
                  {availableServers.map(server => (
                    <SelectItem key={server.id} value={server.id}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-orange-500" />
                        <span>{server.name}</span>
                        <Badge variant="outline" className={`text-xs ${getTypeColor(server.type)}`}>
                          {server.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Informações do servidor selecionado */}
            {selectedServer && (
              <>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Server className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">{selectedServer.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {selectedServer.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline">{selectedServer.type}</Badge>
                        <span>
                          {selectedServer.tools.length} {t('tools.title')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variáveis de ambiente */}
                {selectedServer.environments &&
                  Object.keys(selectedServer.environments).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">
                          {t('dialogs.mcpConfig.requiredConfig')}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {Object.keys(selectedServer.environments).length}{' '}
                          {t('dialogs.mcpConfig.variables')}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {Object.entries(selectedServer.environments).map(([key, value]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`env-${key}`} className="text-sm">
                              {key}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Input
                              id={`env-${key}`}
                              value={mcpEnvironments[key]?.toString() || ''}
                              onChange={e => handleEnvChange(key, e.target.value)}
                              placeholder={t('dialogs.mcpConfig.enterValue', { key })}
                              disabled={Boolean(credentialRefs[key])}
                              type={
                                key.toLowerCase().includes('password') ||
                                key.toLowerCase().includes('token') ||
                                key.toLowerCase().includes('secret')
                                  ? 'password'
                                  : 'text'
                              }
                            />
                            {/* EVO-2250 story 2.4 AC7: point this variable at a
                                vault credential instead of typing the secret.
                                The runtime prefers the reference and falls back
                                to the inline value. */}
                            <VaultCredentialSelect
                              id={`env-cred-${key}`}
                              value={credentialRefs[key]}
                              onChange={credentialId => handleCredentialRefChange(key, credentialId)}
                              credentials={vaultCredentials}
                            />
                            {typeof value === 'string' && value !== 'required' && (
                              <p className="text-xs text-muted-foreground">{value}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Seleção de ferramentas */}
                {selectedServer.tools && selectedServer.tools.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-medium">
                          {t('dialogs.mcpConfig.availableTools')}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {toolIds[selectedServer.id]?.length || 0} {t('dialogs.mcpConfig.of')}{' '}
                          {selectedServer.tools.length} {t('tools.systemTools.selected')}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedServer) {
                              setToolIds(prev => ({
                                ...prev,
                                [selectedServer.id]: selectedServer.tools.map(
                                  (tool: any) => tool.id || tool.name,
                                ),
                              }));
                            }
                          }}
                        >
                          {t('tools.systemTools.selectAll')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedServer) {
                              setToolIds(prev => ({
                                ...prev,
                                [selectedServer.id]: [],
                              }));
                            }
                          }}
                        >
                          {t('tools.systemTools.deselectAll')}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedServer.tools.map((tool: any) => (
                        <div
                          key={tool.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            toolIds[selectedServer.id]?.includes(tool.id || tool.name)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleToolToggle(tool)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{tool.name}</span>
                                {toolIds[selectedServer.id]?.includes(tool.id || tool.name) && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              {tool.description && (
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={toolIds[selectedServer.id]?.includes(tool.id || tool.name)}
                              onChange={() => handleToolToggle(tool)}
                              className="h-4 w-4"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              {t('dialogs.mcpConfig.skip')}
            </Button>
          )}
          <Button onClick={handleSave} disabled={!isFormValid}>
            {totalSteps > 1 && currentStep < totalSteps
              ? t('actions.next')
              : initialConfig
              ? t('dialogs.mcpConfig.save')
              : t('tools.mcpServers.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MCPConfigDialog;
