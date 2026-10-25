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
import { AlertTriangle, Edit, Key, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import AgentToggle from '@/components/agents/configuration/AgentToggle';
import { cn } from '@/utils/cn';
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
  is_active: boolean;
  /** State when the form opened: is_active travels only if the toggle moved off it. */
  stored_is_active?: boolean;
}

const EMPTY_DRAFT: CredentialDraft = {
  name: '',
  provider: '',
  key_value: '',
  base_url: '',
  scope: 'account',
  is_active: true,
};

// Font sizes below 14px stay on text-xs/text-sm: the shell lifts those two to its
// accessibility floor, and an arbitrary text-[Npx] would skip it.

/** `h-auto` cancels the fixed height of the design-system Button, which otherwise wins. */
const PRIMARY_BUTTON_CLASS =
  'h-auto rounded-[9px] px-[18px] py-[11px] text-sm font-semibold shadow-md shadow-primary/25 hover:bg-primary hover:brightness-90';

const SECONDARY_BUTTON_CLASS =
  'h-auto rounded-[9px] border-border bg-card px-[18px] py-2.5 text-sm font-semibold text-foreground shadow-none hover:bg-muted';

const GREEN_SOFT_BUTTON_CLASS =
  'h-auto rounded-[9px] border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-none hover:bg-primary/15 hover:text-primary';

const ICON_BUTTON_CLASS =
  'size-8 rounded-[8px] p-0 text-muted-foreground hover:bg-muted hover:text-foreground';

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-[0.3px] text-muted-foreground';

const CARD_CLASS =
  'rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(20,30,45,.05)]';

const CHIP_CLASS =
  'rounded-[7px] border-transparent px-2 py-0.5 text-xs font-bold leading-4';

const LABEL_CLASS = 'text-sm font-semibold text-muted-foreground';

const FIELD_CLASS =
  'h-10 rounded-[10px] border-border bg-card px-3 text-sm shadow-none focus-visible:border-primary focus-visible:ring-primary/15';

const DIALOG_CLASS =
  'gap-5 rounded-[18px] p-6 shadow-[0_24px_60px_rgba(15,23,35,.28)] sm:max-w-[560px]';

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
      is_active: credential.is_active,
      stored_is_active: credential.is_active,
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
        // The status read when the form opened can be stale by now (another tab,
        // another admin): resending it untouched would undo their change.
        if (draft.is_active !== draft.stored_is_active) {
          payload.is_active = draft.is_active;
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
      <div className={cn(CARD_CLASS, 'overflow-x-auto')}>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted-foreground/[0.06] text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5 text-left font-bold">{t('columns.name')}</th>
              <th className="px-5 py-3.5 text-left font-bold">{t('columns.provider')}</th>
              <th className="px-5 py-3.5 text-left font-bold">{t('columns.key')}</th>
              <th className="px-5 py-3.5 text-left font-bold">{t('columns.serves')}</th>
              <th className="px-5 py-3.5 text-left font-bold">{t('columns.status')}</th>
              <th className="px-5 py-3.5 text-right font-bold">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(credential => (
              <tr
                key={credential.id}
                className="border-b border-border/70 transition-colors duration-150 last:border-b-0 hover:bg-accent/40"
              >
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-[11px]">
                    <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-primary/30 bg-primary/10 text-primary">
                      <Key className="size-4" aria-hidden="true" />
                    </span>
                    <span className="max-w-[280px] truncate text-sm font-semibold text-foreground">
                      {credential.name}
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <Badge className={cn(CHIP_CLASS, 'bg-muted-foreground/10 text-muted-foreground')}>
                    {providerLabel(credential.provider)}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">
                  {maskKey(credential.key_hint)}
                </td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">
                  {servesAllFeatures(credential) ? t('serves.all') : t('serves.agentsOnly')}
                </td>
                <td className="px-5 py-3.5">
                  <Badge
                    className={cn(
                      CHIP_CLASS,
                      'gap-1.5',
                      credential.is_active
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted-foreground/10 text-muted-foreground',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full',
                        credential.is_active ? 'bg-primary' : 'bg-muted-foreground/60',
                      )}
                    />
                    {credential.is_active ? t('status.active') : t('status.inactive')}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {writable ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={ICON_BUTTON_CLASS}
                          aria-label={t('actions.edit')}
                          onClick={() => openEditForm(credential)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-[8px] px-2.5 text-sm font-semibold text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
                        className={cn(ICON_BUTTON_CLASS, 'hover:bg-destructive/10 hover:text-destructive')}
                        aria-label={t('actions.delete')}
                        onClick={() => openDeleteDialog(credential)}
                      >
                        <Trash2 className="size-4" />
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
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.3px] text-foreground">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {canCreateInScope('account') && (
          <Button className={PRIMARY_BUTTON_CLASS} onClick={() => openCreateForm('account')}>
            <Plus className="mr-2 size-4" />
            {t('actions.add')}
          </Button>
        )}
      </div>

      {/* Answers "which credential is in effect right now". Story 1.3 adds the
          inbox assist row and 1.4 the remaining three. */}
      <section
        aria-label={t('inUse.title')}
        className={cn(CARD_CLASS, 'space-y-2.5 p-5')}
      >
        <div className="mb-3.5 flex items-center gap-3">
          <span className="flex size-9 flex-none items-center justify-center rounded-[10px] bg-primary/10 text-primary">
            <Sparkles className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-[15px] font-bold text-foreground">{t('inUse.title')}</h2>
        </div>

        {featuresInUse.map(feature => (
          <div key={feature.key} className="flex items-baseline gap-2 text-sm">
            <span className="text-muted-foreground">{t(`inUse.features.${feature.key}`)}</span>
            {listPending || (signalPending && feature.resolution.state !== 'registry') ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : feature.resolution.state === 'registry' ? (
              <>
                <span className="font-semibold text-foreground">{feature.resolution.credential.name}</span>
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
          <p className="pt-1 text-xs text-muted-foreground">{t('inUse.inheritingHint')}</p>
        )}
      </section>

      <section aria-label={t('sections.account')} className="space-y-3">
        <h2 className={SECTION_LABEL_CLASS}>{t('sections.account')}</h2>

        {loading ? (
          <div className={cn(CARD_CLASS, 'flex h-40 items-center justify-center')}>
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : accountCredentials.length === 0 ? (
          <EmptyState
            className={cn(CARD_CLASS, 'rounded-2xl py-12')}
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
          <h2 className={SECTION_LABEL_CLASS}>{t('sections.installation')}</h2>
          {canCreateInScope('installation') && (
            <Button
              variant="outline"
              size="sm"
              className={GREEN_SOFT_BUTTON_CLASS}
              onClick={() => openCreateForm('installation')}
            >
              <Plus className="mr-1.5 size-4" />
              {t('actions.add')}
            </Button>
          )}
        </div>

        {loading ? null : installationCredentials.length === 0 ? (
          <p className="rounded-[12px] border-[1.5px] border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
            {t('installationEmpty')}
          </p>
        ) : (
          renderCredentialsTable(installationCredentials, 'installation')
        )}
      </section>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-foreground">
              {isEditing ? t('form.title.edit') : t('form.title.new')}
            </DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="credential-name" className={LABEL_CLASS}>
                {t('form.labels.name')}
              </Label>
              <Input
                id="credential-name"
                className={FIELD_CLASS}
                value={draft.name}
                placeholder={t('form.placeholders.name')}
                onChange={event => setDraft({ ...draft, name: event.target.value })}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="credential-provider" className={LABEL_CLASS}>
                {t('form.labels.provider')}
              </Label>
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
                <SelectTrigger
                  id="credential-provider"
                  className={cn(FIELD_CLASS, 'w-full data-[size=default]:h-10')}
                >
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
              <div className="grid gap-1.5">
                <Label htmlFor="credential-base-url" className={LABEL_CLASS}>
                  {t('form.labels.baseUrl')}
                </Label>
                <Input
                  id="credential-base-url"
                  className={FIELD_CLASS}
                  value={draft.base_url}
                  placeholder="https://api.example.com/v1"
                  onChange={event => setDraft({ ...draft, base_url: event.target.value })}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="credential-key" className={LABEL_CLASS}>
                {t('form.labels.key')}
              </Label>
              <Input
                id="credential-key"
                type="password"
                className={FIELD_CLASS}
                value={draft.key_value}
                placeholder={
                  isEditing ? t('form.placeholders.keyEdit') : t('form.placeholders.keyNew')
                }
                onChange={event => setDraft({ ...draft, key_value: event.target.value })}
              />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border px-3.5 py-3">
                <Label htmlFor="credential-active" className="text-sm font-semibold text-foreground">
                  {t('form.labels.active')}
                </Label>
                <AgentToggle
                  id="credential-active"
                  checked={draft.is_active}
                  onCheckedChange={checked => setDraft({ ...draft, is_active: checked })}
                />
              </div>
            )}

            {draftIsIncompatible && (
              <p
                role="alert"
                className="flex gap-2 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {t('form.incompatibleWarning', { provider: providerLabel(draft.provider) })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => setFormOpen(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button className={PRIMARY_BUTTON_CLASS} onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(credentialToDelete)}
        onOpenChange={open => !open && setCredentialToDelete(null)}
      >
        <DialogContent className={cn(DIALOG_CLASS, 'sm:max-w-[470px]')}>
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-foreground">
              {t('deleteDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: credentialToDelete?.name })}
            </DialogDescription>
          </DialogHeader>

          {agentsUsingCredential.length > 0 && (
            <p
              role="alert"
              className="flex gap-2 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {t('deleteDialog.inUseWarning', {
                count: agentsUsingCredential.length,
                agents: agentsUsingCredential.join(', '),
              })}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => setCredentialToDelete(null)}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              className="h-auto rounded-[9px] px-[18px] py-2.5 text-sm font-semibold"
              onClick={handleDeleteConfirm}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
