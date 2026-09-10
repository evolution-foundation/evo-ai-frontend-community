import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { AlertTriangle, Edit, Key, Loader2, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import {
  AI_PROVIDERS,
  CUSTOM_OPENAI_PROVIDER,
  isOpenAICompatible,
  maskKey,
  resolveCredentialState,
} from '@/constants/aiProviders';
import {
  createApiKey,
  deleteApiKey,
  getAiCredentialMigrationState,
  listApiKeys,
  listAgents,
  updateApiKey,
} from '@/services/agents';
import { apiErrorCode } from '@/utils/apiHelpers';
import type { ApiKey, ApiKeyCreate, ApiKeyScope, ApiKeyUpdate } from '@/types/agents';

interface CredentialDraft {
  id?: string;
  name: string;
  provider: string;
  key_value: string;
  base_url: string;
  scope: ApiKeyScope;
}

const EMPTY_DRAFT: CredentialDraft = {
  name: '',
  provider: '',
  key_value: '',
  base_url: '',
  scope: 'account',
};

export default function AiCredentials() {
  const { t } = useLanguage('aiCredentials');

  const [credentials, setCredentials] = useState<ApiKey[]>([]);
  // The server's word on the legacy fallback: 'pending' while a request is in
  // flight, then a boolean, or null when it stays unknown (older CRM without
  // the endpoint, transient failure). It goes back to 'pending' on every
  // refresh: an answer about the previous registry must not be rendered
  // against the new one.
  const [legacyFallbackActive, setLegacyFallbackActive] = useState<boolean | null | 'pending'>('pending');
  const migrationStateRequest = useRef(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<CredentialDraft>(EMPTY_DRAFT);
  const [credentialToDelete, setCredentialToDelete] = useState<ApiKey | null>(null);
  const [agentsUsingCredential, setAgentsUsingCredential] = useState<string[]>([]);

  const {
    permissionsReady,
    canRead,
    canCreateInScope,
    canUpdateInScope,
    canDeleteInScope,
  } = useCredentialScopePermissions('ai_api_keys');

  const isEditing = Boolean(draft.id);

  const accountCredentials = useMemo(
    () => credentials.filter(credential => (credential.scope ?? 'account') === 'account'),
    [credentials],
  );

  const installationCredentials = useMemo(
    () => credentials.filter(credential => credential.scope === 'installation'),
    [credentials],
  );

  // Every AI feature of the CRM, mirroring Ai::ConsumerCompatibility. Agents
  // reach any provider; the other four build OpenAI-shaped requests, so they
  // resolve with the same compatibility filter the backend applies.
  // An installation that has not migrated resolves through the resolver's
  // legacy fallback, so AI works while the registry is empty. Only the server
  // (Ai::MigrationState) can tell that apart from "migrated and off": a
  // migrated install with its last credential deactivated used to read
  // "configured before this screen" while AI was simply disabled (CRM-187).
  // While the signal stays unknown (an older CRM without the endpoint, a
  // failure) the pre-existing heuristic — no active credential — stands in,
  // so a deploy window swaps no lie for another.
  const legacyActive = useMemo(
    () =>
      typeof legacyFallbackActive === 'boolean'
        ? legacyFallbackActive
        : !credentials.some(credential => credential.is_active),
    [legacyFallbackActive, credentials],
  );
  // Each half of the verdict waits only for what it depends on. A credential
  // resolved from the registry follows the list alone, so a slow signal must
  // not hide a name the screen already knows; "legacy" vs "none" is the only
  // branch the signal decides, and that one waits.
  const listPending = loading;
  const signalPending = legacyFallbackActive === 'pending';

  const featuresInUse = useMemo(() => {
    const openAIOnly = resolveCredentialState(credentials, {
      openAICompatibleOnly: true,
      legacyActive,
    });

    return [
      { key: 'aiAgents', resolution: resolveCredentialState(credentials, { legacyActive }) },
      { key: 'inboxAssist', resolution: openAIOnly },
      { key: 'audioTranscription', resolution: openAIOnly },
      { key: 'labelSuggestion', resolution: openAIOnly },
      { key: 'moderation', resolution: openAIOnly },
    ];
  }, [credentials, legacyActive]);

  const loadCredentials = useCallback(async () => {
    if (!canRead) {
      // Never reached through the route (PermissionRoute gates on
      // ai_api_keys.read), but leaving the signal 'pending' here would spin
      // forever instead of degrading.
      setLegacyFallbackActive(null);
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    // Advisory: a failure here must not block the list, it only leaves the
    // panel on the heuristic. Refreshed with the list because deleting the last
    // imported credential can flip it, and reset to 'pending' first so the
    // previous answer is not rendered against the new list. Last response wins.
    const request = ++migrationStateRequest.current;
    setLegacyFallbackActive('pending');
    getAiCredentialMigrationState()
      .then(state => {
        if (request !== migrationStateRequest.current) return;
        const active = state?.legacy_fallback_active;
        setLegacyFallbackActive(typeof active === 'boolean' ? active : null);
      })
      .catch(error => {
        if (request !== migrationStateRequest.current) return;
        // Expected while a CRM without the endpoint is still deployed: the
        // panel falls back to the heuristic, so this is a degradation notice,
        // not a failure.
        console.warn('AI credential migration state unavailable, using the heuristic:', error);
        setLegacyFallbackActive(null);
      });

    try {
      setLoading(true);
      // The registry answers "active only" by default, which hid a deactivated
      // credential and left it with no way back from the screen. Both states
      // are listed so the row stays visible and can be re-enabled.
      const [active, inactive] = await Promise.all([
        listApiKeys(1, 100, { active: true }),
        // The inactive listing is additive: losing it must degrade to the
        // active list, never blank the screen the way a rejected Promise.all
        // would.
        listApiKeys(1, 100, { active: false }).catch(error => {
          console.error('Error loading inactive AI credentials:', error);
          return [];
        }),
      ]);
      // The two calls are concurrent, so a key toggled while they run comes
      // back in both with no telling which read is newer. The inactive copy
      // wins: the in-use panel keys off is_active, and under-reporting a live
      // credential is safer than claiming a deactivated one is serving.
      const inactiveIds = new Set(inactive.map(credential => credential.id));
      setCredentials([
        ...active.filter(credential => !inactiveIds.has(credential.id)),
        ...inactive,
      ]);
    } catch (error) {
      console.error('Error loading AI credentials:', error);
      const code = apiErrorCode(error);
      toast.error(code ? t('messages.loadErrorWithCode', { code }) : t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [canRead, t]);

  useEffect(() => {
    if (!permissionsReady) {
      return;
    }

    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady]);

  const providerLabel = useCallback(
    (value: string) => AI_PROVIDERS.find(provider => provider.value === value)?.label ?? value,
    [],
  );

  // The backend derives openai_compatible; fall back to the local table so the
  // column still renders against an older core-service.
  const servesAllFeatures = useCallback(
    (credential: ApiKey) => credential.openai_compatible ?? isOpenAICompatible(credential.provider),
    [],
  );

  const draftIsIncompatible = useMemo(
    () => Boolean(draft.provider) && !isOpenAICompatible(draft.provider),
    [draft.provider],
  );

  const openCreateForm = (scope: ApiKeyScope = 'account') => {
    setDraft({ ...EMPTY_DRAFT, scope });
    setFormOpen(true);
  };

  const openEditForm = (credential: ApiKey) => {
    setDraft({
      id: credential.id,
      name: credential.name,
      provider: credential.provider,
      key_value: '',
      base_url: credential.base_url ?? '',
      scope: credential.scope ?? 'account',
    });
    setFormOpen(true);
  };


  const handleSave = async () => {
    const needsKey = !isEditing;
    if (!draft.name.trim() || !draft.provider || (needsKey && !draft.key_value.trim())) {
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
        const payload: ApiKeyUpdate = {
          name: draft.name,
          provider: draft.provider,
          base_url: draft.base_url || undefined,
          scope: draft.scope,
        };
        // An empty field keeps the stored key: never send a blank key_value.
        if (draft.key_value.trim()) {
          payload.key_value = draft.key_value;
        }

        await updateApiKey(draft.id, payload);
        toast.success(t('messages.updateSuccess'));
      } else {
        const payload: ApiKeyCreate = {
          name: draft.name,
          provider: draft.provider,
          key_value: draft.key_value,
          base_url: draft.base_url || undefined,
          scope: draft.scope,
        };

        await createApiKey(payload);
        toast.success(t('messages.createSuccess'));
      }

      setFormOpen(false);
      setDraft(EMPTY_DRAFT);
      loadCredentials();
    } catch (error) {
      console.error('Error saving AI credential:', error);
      const code = apiErrorCode(error);
      toast.error(code ? t('messages.saveErrorWithCode', { code }) : t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (credential: ApiKey) => {
    try {
      setSaving(true);
      await updateApiKey(credential.id, {
        name: credential.name,
        provider: credential.provider,
        is_active: !credential.is_active,
      });
      toast.success(t('messages.updateSuccess'));
      loadCredentials();
    } catch (error) {
      console.error('Error toggling AI credential:', error);
      const code = apiErrorCode(error);
      toast.error(code ? t('messages.saveErrorWithCode', { code }) : t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Walks the agent listing to the end. Bounded so a paging bug on the server
  // cannot spin here forever; the bound is far above any real agent count.
  const listAllAgents = async () => {
    const PAGE_SIZE = 100;
    const MAX_PAGES = 50;
    const collected: { api_key_id?: string; name: string }[] = [];

    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await listAgents(page, PAGE_SIZE);
      const batch = Array.isArray(response) ? response : (response?.data ?? []);
      collected.push(...batch);

      if (batch.length < PAGE_SIZE) {
        break;
      }
    }

    return collected;
  };

  const openDeleteDialog = async (credential: ApiKey) => {
    setCredentialToDelete(credential);
    setAgentsUsingCredential([]);

    try {
      // Every page, not just the first: the warning exists to say what breaks,
      // and an agent past the default page size used to go uncounted, so the
      // user confirmed a delete believing nothing used the credential
      // (EVO-2250 review, BAIXO 19).
      const agents = await listAllAgents();
      setAgentsUsingCredential(
        agents.filter(agent => agent.api_key_id === credential.id).map(agent => agent.name),
      );
    } catch (error) {
      // Listing agents is advisory: a failure must not block the deletion flow.
      console.error('Error checking agents using the credential:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!credentialToDelete) {
      return;
    }

    try {
      setSaving(true);
      await deleteApiKey(credentialToDelete.id);
      toast.success(t('messages.deleteSuccess'));
      setCredentialToDelete(null);
      loadCredentials();
    } catch (error) {
      console.error('Error deleting AI credential:', error);
      const code = apiErrorCode(error);
      toast.error(code ? t('messages.deleteErrorWithCode', { code }) : t('messages.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  if (permissionsReady && !canRead) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Key}
          title={t('title')}
          description={t('messages.permissionDenied.read')}
        />
      </div>
    );
  }

  const renderCredentialsTable = (rows: ApiKey[], scope: ApiKeyScope) => {
    const writable = canUpdateInScope(scope);

    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">{t('columns.name')}</th>
              <th className="text-left p-3">{t('columns.provider')}</th>
              <th className="text-left p-3">{t('columns.key')}</th>
              <th className="text-left p-3">{t('columns.serves')}</th>
              <th className="text-left p-3">{t('columns.status')}</th>
              <th className="text-right p-3">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(credential => (
              <tr key={credential.id} className="border-t">
                <td className="p-3 font-medium">{credential.name}</td>
                <td className="p-3">
                  <Badge variant="outline">{providerLabel(credential.provider)}</Badge>
                </td>
                <td className="p-3 font-mono">{maskKey(credential.key_hint)}</td>
                <td className="p-3">
                  {servesAllFeatures(credential) ? t('serves.all') : t('serves.agentsOnly')}
                </td>
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
                        onClick={() => openDeleteDialog(credential)}
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

      {/* Answers "which credential is in effect right now". Story 1.3 adds the
          inbox assist row and 1.4 the remaining three. */}
      <section
        aria-label={t('inUse.title')}
        className="border rounded-lg p-4 space-y-2"
      >
        <h2 className="text-sm font-medium">{t('inUse.title')}</h2>

        {featuresInUse.map(feature => (
          <div key={feature.key} className="flex items-baseline gap-2 text-sm">
            <span className="text-muted-foreground">{t(`inUse.features.${feature.key}`)}</span>
            {listPending || (signalPending && feature.resolution.state !== 'registry') ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : feature.resolution.state === 'registry' ? (
              <>
                <span className="font-medium">{feature.resolution.credential.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(feature.resolution.credential.scope ?? 'account') === 'installation'
                    ? t('inUse.fromInstallation')
                    : t('inUse.fromAccount')}
                </span>
              </>
            ) : feature.resolution.state === 'legacy' ? (
              <span className="text-muted-foreground">{t('inUse.legacy')}</span>
            ) : (
              <span className="text-muted-foreground">{t('inUse.none')}</span>
            )}
          </div>
        ))}

        {!accountCredentials.some(credential => credential.is_active) &&
          installationCredentials.some(credential => credential.is_active) && (
          <p className="text-xs text-muted-foreground">{t('inUse.inheritingHint')}</p>
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
            icon={Key}
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
              <Label htmlFor="credential-name">{t('form.labels.name')}</Label>
              <Input
                id="credential-name"
                value={draft.name}
                placeholder={t('form.placeholders.name')}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="credential-provider">{t('form.labels.provider')}</Label>
              <Select
                value={draft.provider}
                onValueChange={value =>
                  setDraft({
                    ...draft,
                    provider: value,
                    ...(value !== CUSTOM_OPENAI_PROVIDER ? { base_url: '' } : {}),
                  })
                }
              >
                <SelectTrigger id="credential-provider">
                  <SelectValue placeholder={t('form.placeholders.provider')} />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.provider === CUSTOM_OPENAI_PROVIDER && (
              <div className="grid gap-2">
                <Label htmlFor="credential-base-url">{t('form.labels.baseUrl')}</Label>
                <Input
                  id="credential-base-url"
                  value={draft.base_url}
                  placeholder="https://api.example.com/v1"
                  onChange={event => setDraft({ ...draft, base_url: event.target.value })}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="credential-key">{t('form.labels.key')}</Label>
              <Input
                id="credential-key"
                type="password"
                value={draft.key_value}
                placeholder={
                  isEditing ? t('form.placeholders.keyEdit') : t('form.placeholders.keyNew')
                }
                onChange={event => setDraft({ ...draft, key_value: event.target.value })}
              />
            </div>

            {draftIsIncompatible && (
              <p role="alert" className="flex gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {t('form.incompatibleWarning', { provider: providerLabel(draft.provider) })}
              </p>
            )}
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

          {agentsUsingCredential.length > 0 && (
            <p role="alert" className="flex gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {t('deleteDialog.inUseWarning', {
                count: agentsUsingCredential.length,
                agents: agentsUsingCredential.join(', '),
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
