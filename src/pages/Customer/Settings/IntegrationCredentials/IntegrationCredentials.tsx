import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useCredentialScopePermissions } from '@/hooks/useCredentialScopePermissions';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@evoapi/design-system';
import { AlertTriangle, Edit, Loader2, Lock, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { maskKey } from '@/constants/aiProviders';
import {
  createIntegrationCredential,
  deleteIntegrationCredential,
  listCustomMcpServers,
  listCustomTools,
  listIntegrationCredentials,
  updateIntegrationCredential,
} from '@/services/agents';
import agentIntegrationsService from '@/services/agents/agentIntegrationsService';
import AgentBotsService from '@/services/channels/agentBotsService';
import { parseOwnerTimestamp } from './ownerTimestamp';
import type {
  ApiKeyScope,
  IntegrationCredential,
  IntegrationCredentialCreate,
  IntegrationCredentialUpdate,
} from '@/types/agents';

// Free-text provider field with suggestions: the vault accepts any provider,
// these are just the known consumers of the epic.
const PROVIDER_SUGGESTIONS = [
  'dify',
  'flowise',
  'n8n',
  'typebot',
  'openai',
  'elevenlabs',
  'knowledge_nexus',
  'custom_tool',
  'mcp',
];

interface CredentialDraft {
  id?: string;
  name: string;
  provider: string;
  value: string;
  scope: ApiKeyScope;
}

const EMPTY_DRAFT: CredentialDraft = {
  name: '',
  provider: '',
  value: '',
  scope: 'account',
};

interface ConsumerInUse {
  key: string;
  /** i18n suffix under inUse.kinds.* */
  kind: 'tool' | 'mcp' | 'bot' | 'credential';
  name: string;
  /** Client-side join mode: resolved to names against the loaded list. */
  credentialIds?: string[];
  /** Server mode (AC10): consumer names aggregated by the backend. */
  consumerNames?: string[];
}

export default function IntegrationCredentials() {
  const { t } = useLanguage('integrationCredentials');

  const [credentials, setCredentials] = useState<IntegrationCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<CredentialDraft>(EMPTY_DRAFT);
  const [credentialToDelete, setCredentialToDelete] = useState<IntegrationCredential | null>(null);
  const [connectionToDisconnect, setConnectionToDisconnect] =
    useState<IntegrationCredential | null>(null);
  const [consumersInUse, setConsumersInUse] = useState<ConsumerInUse[]>([]);

  const {
    can,
    permissionsReady,
    canRead,
    canCreateInScope,
    canUpdateInScope,
    canDeleteInScope,
  } = useCredentialScopePermissions('ai_integration_credentials');
  // Disconnecting delegates to the agent-integration flow, which the backend
  // gates on ai_agents.update — the vault grants play no part here.
  const canDisconnect = can('ai_agents', 'update');

  const isEditing = Boolean(draft.id);

  // Only static credentials belong to these tables: oauth rows are references
  // (no value in the vault, by database CHECK) and render in the connections
  // section below.
  const staticCredentials = useMemo(
    () => credentials.filter(credential => credential.kind !== 'oauth'),
    [credentials],
  );

  const oauthConnections = useMemo(
    () => credentials.filter(credential => credential.kind === 'oauth'),
    [credentials],
  );

  const accountCredentials = useMemo(
    () => staticCredentials.filter(credential => (credential.scope ?? 'account') === 'account'),
    [staticCredentials],
  );

  const installationCredentials = useMemo(
    () => staticCredentials.filter(credential => credential.scope === 'installation'),
    [staticCredentials],
  );

  // The panel is fed client-side from the consumer listings, the same way the
  // AI credentials screen reads agents. Advisory: any listing failure leaves
  // the panel empty without blocking the vault itself.
  const loadConsumers = useCallback(async () => {
    const [tools, mcpServers, bots] = await Promise.allSettled([
      listCustomTools(),
      listCustomMcpServers(),
      AgentBotsService.getAll(),
    ]);

    const rows: ConsumerInUse[] = [];

    if (tools.status === 'fulfilled') {
      tools.value.forEach(tool => {
        const ids = Object.values(tool.credential_refs ?? {});
        if (ids.length > 0) {
          rows.push({ key: `tool-${tool.id}`, kind: 'tool', name: tool.name, credentialIds: ids });
        }
      });
    }

    if (mcpServers.status === 'fulfilled') {
      mcpServers.value.forEach(server => {
        const ids = Object.values(server.credential_refs ?? {});
        if (ids.length > 0) {
          rows.push({
            key: `mcp-${server.id}`,
            kind: 'mcp',
            name: server.name,
            credentialIds: ids,
          });
        }
      });
    }

    if (bots.status === 'fulfilled') {
      bots.value.forEach(bot => {
        if (bot.credential_id) {
          rows.push({
            key: `bot-${bot.id}`,
            kind: 'bot',
            name: bot.name,
            credentialIds: [bot.credential_id],
          });
        }
      });
    }

    setConsumersInUse(rows);
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!canRead) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    try {
      setLoading(true);
      const list = await listIntegrationCredentials();
      setCredentials(list);

      // AC10 (2.4): the backend aggregates the consumers of each credential
      // into `referenced_by`. When ANY row carries the field, the server is
      // the source and the client-side join stays off; an older backend
      // without the field keeps the join as a graceful fallback.
      if (list.some(credential => Array.isArray(credential.referenced_by))) {
        setConsumersInUse(
          list
            .filter(credential => (credential.referenced_by?.length ?? 0) > 0)
            .map(credential => ({
              key: `credential-${credential.id}`,
              kind: 'credential' as const,
              name: credential.name,
              consumerNames: credential.referenced_by ?? [],
            })),
        );
      } else {
        loadConsumers();
      }
    } catch (error) {
      console.error('Error loading integration credentials:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [canRead, t, loadConsumers]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  const openCreateForm = (scope: ApiKeyScope = 'account') => {
    setDraft({ ...EMPTY_DRAFT, scope });
    setFormOpen(true);
  };


  const openEditForm = (credential: IntegrationCredential) => {
    setDraft({
      id: credential.id,
      name: credential.name,
      provider: credential.provider,
      value: '',
      scope: credential.scope ?? 'account',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const needsValue = !isEditing;
    if (!draft.name.trim() || !draft.provider.trim() || (needsValue && !draft.value.trim())) {
      toast.error(t('messages.requiredFields'));
      return;
    }

    const allowed = isEditing ? canUpdateInScope(draft.scope) : canCreateInScope(draft.scope);
    if (!allowed) {
      toast.error(t('messages.permissionDenied.installation'));
      return;
    }

    try {
      setSaving(true);

      if (draft.id) {
        const payload: IntegrationCredentialUpdate = {
          name: draft.name,
          provider: draft.provider,
          scope: draft.scope,
        };
        // An empty field keeps the stored value: never send it blank.
        if (draft.value.trim()) {
          payload.value = draft.value;
        }

        await updateIntegrationCredential(draft.id, payload);
        toast.success(t('messages.updateSuccess'));
      } else {
        // Only `static` is creatable here: the `oauth` kind is opened by 2.5
        // and never carries a value.
        const payload: IntegrationCredentialCreate = {
          name: draft.name,
          provider: draft.provider,
          value: draft.value,
          kind: 'static',
          scope: draft.scope,
        };

        await createIntegrationCredential(payload);
        toast.success(t('messages.createSuccess'));
      }

      setFormOpen(false);
      setDraft(EMPTY_DRAFT);
      loadCredentials();
    } catch (error) {
      console.error('Error saving integration credential:', error);
      toast.error(t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (credential: IntegrationCredential) => {
    try {
      setSaving(true);
      await updateIntegrationCredential(credential.id, {
        name: credential.name,
        provider: credential.provider,
        is_active: !credential.is_active,
      });
      toast.success(t('messages.updateSuccess'));
      loadCredentials();
    } catch (error) {
      console.error('Error toggling integration credential:', error);
      toast.error(t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Disconnecting delegates to the existing agent-integration flow: the vault
  // row is a reference, so nothing is deleted from the vault here and no
  // token is touched — and the provider-side grant is NOT revoked.
  const handleDisconnectConfirm = async () => {
    if (!connectionToDisconnect?.agent_id) {
      return;
    }

    try {
      setSaving(true);
      await agentIntegrationsService.deleteIntegration(
        connectionToDisconnect.agent_id,
        connectionToDisconnect.provider,
      );
      toast.success(t('oauthSection.disconnectSuccess'));
      setConnectionToDisconnect(null);
      loadCredentials();
    } catch (error) {
      console.error('Error disconnecting OAuth integration:', error);
      toast.error(t('oauthSection.disconnectError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!credentialToDelete) {
      return;
    }

    try {
      setSaving(true);
      await deleteIntegrationCredential(credentialToDelete.id);
      toast.success(t('messages.deleteSuccess'));
      setCredentialToDelete(null);
      loadCredentials();
    } catch (error) {
      console.error('Error deleting integration credential:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  if (permissionsReady && !canRead) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Lock}
          title={t('title')}
          description={t('messages.permissionDenied.read')}
        />
      </div>
    );
  }

  const renderCredentialsTable = (rows: IntegrationCredential[], scope: ApiKeyScope) => {
    const writable = canUpdateInScope(scope);

    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">{t('columns.name')}</th>
              <th className="text-left p-3">{t('columns.provider')}</th>
              <th className="text-left p-3">{t('columns.value')}</th>
              <th className="text-left p-3">{t('columns.kind')}</th>
              <th className="text-left p-3">{t('columns.status')}</th>
              <th className="text-right p-3">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(credential => (
              <tr key={credential.id} className="border-t">
                <td className="p-3 font-medium">{credential.name}</td>
                <td className="p-3">
                  <Badge variant="outline">{credential.provider}</Badge>
                </td>
                <td className="p-3 font-mono">{maskKey(credential.value_hint)}</td>
                <td className="p-3">{t(`kind.${credential.kind}`)}</td>
                <td className="p-3">
                  <Badge variant={credential.is_active ? 'default' : 'secondary'}>
                    {credential.is_active ? t('status.active') : t('status.inactive')}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {writable ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('actions.edit')}
                          onClick={() => openEditForm(credential)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => handleToggleActive(credential)}
                        >
                          {credential.is_active ? t('actions.deactivate') : t('actions.activate')}
                        </Button>
                      </>
                    ) : (
                      scope === 'installation' && (
                        <span className="text-xs text-muted-foreground">
                          {t('inheritedReadOnly')}
                        </span>
                      )
                    )}
                    {canDeleteInScope(scope) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t('actions.delete')}
                        onClick={() => setCredentialToDelete(credential)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        {canCreateInScope('account') && (
          <Button onClick={() => openCreateForm('account')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.add')}
          </Button>
        )}
      </div>

      {/* Answers "which credential is in effect right now". Born empty: the
          consumers plug in with stories 2.3 and 2.4, and each one adds its
          row here, like the AI credentials panel grew in 1.2. */}
      <section aria-label={t('inUse.title')} className="border rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-medium">{t('inUse.title')}</h2>
        {consumersInUse.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('inUse.empty')}</p>
        ) : (
          consumersInUse.map(consumer => (
            <div key={consumer.key} className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground">{t(`inUse.kinds.${consumer.kind}`)}</span>
              <span className="font-medium">{consumer.name}</span>
              <span className="text-xs text-muted-foreground">
                {consumer.consumerNames
                  ? consumer.consumerNames.join(', ')
                  : (consumer.credentialIds ?? [])
                      .map(id => credentials.find(credential => credential.id === id)?.name ?? id)
                      .join(', ')}
              </span>
            </div>
          ))
        )}
      </section>

      <section aria-label={t('sections.account')} className="space-y-3">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          {t('sections.account')}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : accountCredentials.length === 0 ? (
          <EmptyState
            icon={Lock}
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              canCreateInScope('account')
                ? { label: t('actions.addFirst'), onClick: () => openCreateForm('account') }
                : undefined
            }
          />
        ) : (
          renderCredentialsTable(accountCredentials, 'account')
        )}
      </section>

      <section aria-label={t('sections.installation')} className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium uppercase text-muted-foreground">
            {t('sections.installation')}
          </h2>
          {canCreateInScope('installation') && (
            <Button variant="outline" size="sm" onClick={() => openCreateForm('installation')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('actions.add')}
            </Button>
          )}
        </div>

        {loading ? null : installationCredentials.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
            {t('installationEmpty')}
          </p>
        ) : (
          renderCredentialsTable(installationCredentials, 'installation')
        )}
      </section>

      {/* OAuth connections by reference (story 2.5): these rows hold NO
          secret in the vault — status and expiry are read from the owner
          store by the backend at listing time, never from a copy. */}
      <section aria-label={t('sections.oauth')} className="space-y-3">
        <h2 className="text-sm font-medium uppercase text-muted-foreground">
          {t('sections.oauth')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('oauthSection.noSecretHint')}</p>

        {loading ? null : oauthConnections.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
            {t('oauthSection.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">{t('columns.provider')}</th>
                  <th className="text-left p-3">{t('oauthSection.columns.agent')}</th>
                  <th className="text-left p-3">{t('columns.status')}</th>
                  <th className="text-left p-3">{t('oauthSection.columns.expires')}</th>
                  <th className="text-right p-3">{t('columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {oauthConnections.map(connection => (
                  <tr key={connection.id} className="border-t">
                    <td className="p-3">
                      <Badge variant="outline">{connection.provider}</Badge>
                    </td>
                    <td className="p-3">{connection.agent_name ?? connection.owner_ref}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          connection.connection_status === 'connected' ? 'default' : 'secondary'
                        }
                      >
                        {t(`oauthSection.status.${connection.connection_status ?? 'connected'}`)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {connection.connection_expires_at
                        ? parseOwnerTimestamp(connection.connection_expires_at).toLocaleString()
                        : t('oauthSection.noExpiry')}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {canDisconnect && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t('oauthSection.actions.disconnect')}
                            onClick={() => setConnectionToDisconnect(connection)}
                          >
                            {t('oauthSection.actions.disconnect')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('form.title.edit') : t('form.title.new')}
            </DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="integration-credential-name">{t('form.labels.name')}</Label>
              <Input
                id="integration-credential-name"
                value={draft.name}
                placeholder={t('form.placeholders.name')}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="integration-credential-provider">{t('form.labels.provider')}</Label>
              <Input
                id="integration-credential-provider"
                value={draft.provider}
                list="integration-credential-provider-suggestions"
                placeholder={t('form.placeholders.provider')}
                onChange={event => setDraft({ ...draft, provider: event.target.value })}
              />
              <datalist id="integration-credential-provider-suggestions">
                {PROVIDER_SUGGESTIONS.map(provider => (
                  <option key={provider} value={provider} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="integration-credential-value">{t('form.labels.value')}</Label>
              <Input
                id="integration-credential-value"
                type="password"
                value={draft.value}
                placeholder={
                  isEditing ? t('form.placeholders.valueEdit') : t('form.placeholders.valueNew')
                }
                onChange={event => setDraft({ ...draft, value: event.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(connectionToDisconnect)}
        onOpenChange={open => !open && setConnectionToDisconnect(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('oauthSection.disconnectDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('oauthSection.disconnectDialog.description', {
                provider: connectionToDisconnect?.provider,
              })}
            </DialogDescription>
          </DialogHeader>

          {/* Honest receipt: there is no remote revoke anywhere in the stack,
              so the dialog says exactly what happens (R5). */}
          <p role="alert" className="flex gap-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {t('oauthSection.disconnectDialog.noRevokeWarning')}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectionToDisconnect(null)}>
              {t('oauthSection.disconnectDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDisconnectConfirm} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('oauthSection.disconnectDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(credentialToDelete)}
        onOpenChange={open => !open && setCredentialToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: credentialToDelete?.name })}
            </DialogDescription>
          </DialogHeader>

          {(credentialToDelete?.referenced_by?.length ?? 0) > 0 && (
            <p role="alert" className="flex gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {t('deleteDialog.inUseWarning', {
                count: credentialToDelete?.referenced_by?.length,
                consumers: credentialToDelete?.referenced_by?.join(', '),
              })}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCredentialToDelete(null)}>
              {t('deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
