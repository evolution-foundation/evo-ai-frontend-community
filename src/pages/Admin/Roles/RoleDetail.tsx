import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@evoapi/design-system';
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Loader2, Lock, Pencil, Save, X } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import { rolesService, type Role } from '@/services/roles/rolesService';
import { permissionsService } from '@/services/permissions';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { ResourceActionsData } from '@/types/auth/permissions';
import {
  groupResourcesByDomain,
  groupsFor,
  isHiddenAction,
  isStandaloneAction,
  expandCoarseKeys,
  type ActionGroup,
  RESOURCE_NESTING,
} from '@/config/permissionDomains';

// Nested resource -> i18n key for its sub-label inside the parent card (AC6).
// Every key in RESOURCE_NESTING needs an entry here: the nested row renders its label
// through this map, so a missing one is t(undefined) — an unnamed row of checkboxes.
const NESTED_LABEL_KEYS: Record<string, string> = {
  pipeline_stages: 'detail.nested.pipelineStages',
  pipeline_items: 'detail.nested.pipelineItems',
  working_hours: 'detail.nested.workingHours',
};

export default function RoleDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage('roles');
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [role, setRole] = useState<Role | null>(null);
  const [resourceActions, setResourceActions] = useState<ResourceActionsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  // Collapsed domains. Sections start open; a search forces them open anyway.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: '', description: '' });
  const [savingMeta, setSavingMeta] = useState(false);
  const [duplicate, setDuplicate] = useState({ open: false, name: '', running: false });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [roleData, actionsData] = await Promise.all([
        rolesService.get(id),
        permissionsService.getResourceActions(),
      ]);
      setRole(roleData);
      setResourceActions(actionsData.data);

      const initialSelected = new Set<string>();
      Object.entries(roleData.permissions_by_resource).forEach(([resource, actions]) => {
        (actions as string[]).forEach(action => initialSelected.add(`${resource}.${action}`));
      });
      setSelected(initialSelected);
    } catch {
      toast.error(t('messages.loadError'));
      navigate('/settings/roles');
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // A permission is locked (held regardless of the role, so not a manageable
  // checkbox) when it is either basic (every user holds it) or operationally
  // implied by a grant THIS role actually holds. `implied_by` is global catalog
  // metadata, so the implication only applies when the source permission is in
  // the role's own selection — otherwise the implied permission is a normal,
  // editable grant. The decision therefore consults the selection and updates
  // reactively as the source permission is toggled.
  const isKeyLocked = useCallback(
    (key: string, sel: Set<string>): boolean => {
      const [resource, action] = key.split('.');
      const cfg = resourceActions?.resources[resource]?.actions?.[action];
      if (!cfg) return false;
      if (cfg.basic === true) return true;
      if (cfg.implied_by) return sel.has(cfg.implied_by);
      return false;
    },
    [resourceActions],
  );

  // A locked permission is never toggled — it is not a real role grant, so we
  // neither add it to nor remove it from the selection.
  const togglePermission = (key: string) => {
    setSelected(prev => {
      if (isKeyLocked(key, prev)) return prev;
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleResource = (resource: string) => {
    if (!resourceActions) return;
    setSelected(prev => {
      const actions = resourceActions.resources[resource]?.actions ?? {};
      const keys = Object.keys(actions)
        // System actions are never editable and must not leak into the payload via
        // "select all" (AC3 / NFR1); hidden ones render nothing either. Grouped
        // actions are ordinary grants — select-all covers them like any other.
        .filter(a => actions[a].system !== true && !isHiddenAction(resource, a))
        .map(a => `${resource}.${a}`)
        .filter(k => !isKeyLocked(k, prev));
      const allSelected = keys.length > 0 && keys.every(k => prev.has(k));
      const next = new Set(prev);
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // Nested children render inside their parent's row but are separate resources, so
  // a "select all" that skipped them would leave half the screen untouched.
  const childrenOf = (resourceKey: string): string[] =>
    Object.entries(RESOURCE_NESTING)
      .filter(([, parent]) => parent === resourceKey)
      .map(([child]) => child)
      .filter(child => resourceActions?.resources[child]);

  // Every key a bulk toggle owns: not system, not hidden. Lock is deliberately NOT
  // consulted here. A lock can flip mid-operation — granting conversations.read locks
  // users.read — and a set computed against the old selection would skip the key on
  // the way back, stranding it. Granting or revoking a locked key is harmless anyway:
  // `handleSave` never persists one.
  const bulkKeysOf = (resourceKey: string): string[] => {
    const cfg = resourceActions?.resources[resourceKey];
    if (!cfg) return [];
    return Object.keys(cfg.actions)
      .filter(a => cfg.actions[a].system !== true && !isHiddenAction(resourceKey, a))
      .map(a => `${resourceKey}.${a}`);
  };

  const keysOfResources = (resourceKeys: string[]): string[] =>
    resourceKeys.flatMap(r => [r, ...childrenOf(r)]).flatMap(bulkKeysOf);

  const toggleKeys = (keys: string[]) => {
    if (keys.length === 0) return;
    setSelected(prev => {
      const allSelected = keys.every(k => prev.has(k));
      const next = new Set(prev);
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // The checkbox reflects only what the admin can actually decide, so a basic or
  // implied key never leaves it stuck as indeterminate.
  const bulkState = (keys: string[]) => {
    const decidable = keys.filter(k => !isKeyLocked(k, selected));
    return {
      all: decidable.length > 0 && decidable.every(k => selected.has(k)),
      some: decidable.some(k => selected.has(k)),
    };
  };

  const toggleDomain = (domainKey: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(domainKey) ? next.delete(domainKey) : next.add(domainKey);
      return next;
    });
  };

  const handleSave = async () => {
    if (!role || !resourceActions) return;
    setSaving(true);
    try {
      const knownKeys = Array.from(selected).filter(key => {
        const [resource, action] = key.split('.');
        const cfg = resourceActions.resources[resource]?.actions?.[action];
        // Persist only real grants: skip unknown keys and locked ones. A basic
        // permission is always locked; an implied one is locked only while its
        // source grant is selected — otherwise it is a genuine, persistable grant.
        //
        // System keys ARE re-sent when the role already holds them. The endpoint
        // replaces the whole permission set, so omitting a held key deletes it:
        // filtering them out here would silently strip every system grant on the
        // first save — and ai_agent_processor.execute gates the chat WebSocket.
        // Re-sending is safe because a system key can never enter `selected` by
        // user action: it renders no checkbox and `toggleResource` skips it, so it
        // is only ever there because the role already had it.
        return cfg !== undefined && !isKeyLocked(key, selected);
      });
      // EVO-2127: also persist the coarse read/write/delete groups the editor
      // shows — additively (granular stays) and guarded against the live catalog
      // so a backend without `<resource>.write` never triggers a 422.
      const payload = expandCoarseKeys(
        knownKeys,
        (resource, action) => resourceActions.resources[resource]?.actions?.[action] !== undefined,
      );
      const updated = await rolesService.bulkUpdatePermissions(role.id, payload);
      setRole(updated);
      permissionsService.clearPermissionsCache();
      toast.success(t('messages.permissionsSuccess'));
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.permissionsError'));
    } finally {
      setSaving(false);
    }
  };

  const startEditMeta = () => {
    if (!role) return;
    setMetaForm({ name: role.name, description: role.description ?? '' });
    setEditingMeta(true);
  };

  const cancelEditMeta = () => {
    setEditingMeta(false);
  };

  const handleSaveMeta = async () => {
    if (!role || !metaForm.name.trim()) return;
    setSavingMeta(true);
    try {
      const updated = await rolesService.update(role.id, {
        name: metaForm.name.trim(),
        description: metaForm.description.trim() || undefined,
      });
      setRole(updated);
      toast.success(t('messages.updateSuccess'));
      setEditingMeta(false);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.updateError'));
    } finally {
      setSavingMeta(false);
    }
  };

  const startDuplicate = () => {
    if (!role) return;
    setDuplicate({ open: true, name: `${role.name} ${t('detail.duplicateSuffix')}`, running: false });
  };

  // The only supported way to get a tuned copy of a system role, and what the
  // read-only notice points at. `create` always yields `system: false`, so the copy
  // accepts bulk_update_permissions.
  const handleDuplicate = async () => {
    if (!role || !resourceActions || !duplicate.name.trim()) return;
    setDuplicate(prev => ({ ...prev, running: true }));

    let created: Role;
    try {
      created = await rolesService.create({
        name: duplicate.name.trim(),
        description: role.description ?? undefined,
      });
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.createError'));
      setDuplicate(prev => ({ ...prev, running: false }));
      return;
    }

    // Only grants the live catalog still defines: a role can hold keys a later
    // release dropped, and the endpoint 422s the whole batch on the first one.
    const keys = Object.entries(role.permissions_by_resource)
      .flatMap(([resource, actions]) => (actions as string[]).map(action => `${resource}.${action}`))
      .filter(key => {
        const [resource, action] = key.split('.');
        return resourceActions.resources[resource]?.actions?.[action] !== undefined;
      });

    try {
      await rolesService.bulkUpdatePermissions(created.id, keys);
      toast.success(t('messages.duplicateSuccess'));
    } catch (err: unknown) {
      // Keep the created role: it carries a name the user chose, and an empty custom
      // role is editable. Usual cause is the anti-escalation gate.
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.duplicatePartial'));
    }

    permissionsService.clearPermissionsCache();
    setDuplicate({ open: false, name: '', running: false });
    navigate(`/settings/roles/${created.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!role || !resourceActions) return null;

  // Auth answers 403 on bulk_update_permissions for any system role, so the grid and
  // every permission stay visible but nothing is writable: no toggles, no select-all,
  // no Save. A Save whose request is refused is the lying control to avoid.
  const isSystemRole = role.system === true;
  const canEdit = can('roles', 'bulk_update_permissions') && !isSystemRole;
  const canUpdate = can('roles', 'update');
  // Needs both halves of the flow: create the copy, then write its permissions.
  const canDuplicate =
    isSystemRole && can('roles', 'create') && can('roles', 'bulk_update_permissions');
  const resources = resourceActions.resources;

  const term = filter.trim().toLowerCase();
  const domains = groupResourcesByDomain(Object.keys(resources));

  // Case-insensitive match over the resource name + action name + description
  // (AC4). Runs AFTER the system filter, so hidden actions never match.
  const passesFilter = (resourceName: string, actionName: string, description: string): boolean => {
    if (!term) return true;
    return (
      resourceName.toLowerCase().includes(term) ||
      actionName.toLowerCase().includes(term) ||
      description.toLowerCase().includes(term)
    );
  };

  // Visible action keys for a resource, restricted to `actionKeys`: drop system
  // actions (AC3) and grouped ones (they render inside their group), then apply the
  // text filter (AC4). Order is preserved.
  const visibleActionKeys = (resourceKey: string, actionKeys: string[]): string[] => {
    const resourceConfig = resources[resourceKey];
    if (!resourceConfig) return [];
    return actionKeys.filter(a => {
      const cfg = resourceConfig.actions[a];
      if (!cfg || cfg.system === true || isHiddenAction(resourceKey, a)) return false;
      // Only standalone actions keep a row of their own. Everything else lives in a
      // group. Locked actions (basic, or implied by a grant this role holds) render
      // nothing at all: the role holds them regardless, so there is no decision to
      // offer — `groupKeys` drops them from the group and `handleSave` never sends
      // them. Giving them a row would put a second, unactionable "View" next to the
      // Read group that already covers them.
      if (!isStandaloneAction(resourceKey, a)) return false;
      return passesFilter(resourceConfig.name, cfg.name, cfg.description ?? '');
    });
  };

  // The real catalog keys a group stands for, restricted to the ones this catalog
  // actually declares and that are editable (not system, not locked).
  const groupKeys = (resourceKey: string, actions: string[]): string[] =>
    actions
      .filter(a => {
        const cfg = resources[resourceKey]?.actions?.[a];
        return cfg !== undefined && cfg.system !== true;
      })
      .map(a => `${resourceKey}.${a}`)
      .filter(k => !isKeyLocked(k, selected));

  // One checkbox, several grants. Toggling on adds every key it stands for; off
  // removes them. A role that holds only some of them shows indeterminate and keeps
  // exactly what it has until the admin actually toggles — hiding the granularity
  // must not silently rewrite a role nobody touched.
  const toggleGroup = (resourceKey: string, actions: string[]) => {
    const keys = groupKeys(resourceKey, actions);
    if (keys.length === 0) return;
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = keys.every(k => prev.has(k));
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // nome | Read | Write | Delete | extras. Shared by the header and every row so the
  // columns line up even when a resource has no key of a given kind.
  const ROW_GRID =
    'grid grid-cols-[minmax(9rem,18rem)_4.5rem_4.5rem_4.5rem_minmax(0,1fr)] items-center gap-x-2';

  const renderGroupCell = (resourceKey: string, group: ActionGroup | undefined) => {
    if (!group) {
      // The resource has no key of this kind — an empty cell, not a missing column.
      return <span className="text-center text-sidebar-foreground/20">–</span>;
    }
    const keys = groupKeys(resourceKey, group.actions);
    const id = `group-${resourceKey}-${group.key}`;
    const allChecked = keys.every(k => selected.has(k));
    const someChecked = !allChecked && keys.some(k => selected.has(k));
    return (
      <div className="flex justify-center">
        <Checkbox
          id={id}
          aria-label={t(group.labelKey)}
          checked={allChecked}
          data-indeterminate={someChecked}
          onCheckedChange={canEdit ? () => toggleGroup(resourceKey, group.actions) : undefined}
          disabled={!canEdit}
        />
      </div>
    );
  };

  // Groups of a resource that survive the text filter and still have editable keys.
  const visibleGroupsFor = (resourceKey: string, actionKeys: string[]): ActionGroup[] =>
    groupsFor(resourceKey, actionKeys).filter(
      g =>
        groupKeys(resourceKey, g.actions).length > 0 &&
        passesFilter(
          resources[resourceKey]?.name ?? '',
          t(g.labelKey),
          t(`${g.labelKey}Description`),
        ),
    );

  const renderActionRow = (resourceKey: string, actionKey: string) => {
    const actionConfig = resources[resourceKey].actions[actionKey];
    const key = `${resourceKey}.${actionKey}`;
    const locked = isKeyLocked(key, selected);
    const lockLabel = locked
      ? actionConfig.basic
        ? t('detail.lock.basic')
        : t('detail.lock.impliedBy', { source: actionConfig.implied_by ?? '' })
      : undefined;
    return (
      <div key={key} className="flex items-center gap-1.5">
        <Checkbox
          id={key}
          // Locked perms are always effectively granted, so render them checked
          // and never editable.
          checked={locked || selected.has(key)}
          onCheckedChange={canEdit && !locked ? () => togglePermission(key) : undefined}
          disabled={!canEdit || locked}
        />
        <Label
          htmlFor={key}
          className={`text-sm font-normal text-sidebar-foreground/80 ${canEdit && !locked ? 'cursor-pointer' : ''}`}
        >
          {actionConfig.name}
        </Label>
        {locked && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4" title={lockLabel}>
            {actionConfig.basic ? t('detail.lock.basicBadge') : t('detail.lock.impliedBadge')}
          </Badge>
        )}
      </div>
    );
  };

  const renderResourceCard = (resourceKey: string) => {
    const resourceConfig = resources[resourceKey];
    if (!resourceConfig) return null;

    const nonSystemKeys = Object.keys(resourceConfig.actions).filter(
      a => resourceConfig.actions[a].system !== true,
    );

    // Card "select all" governs only this resource's own manageable (non-system,
    // non-locked) actions — independent of the text filter.
    const manageableKeys = nonSystemKeys
      .filter(a => !isKeyLocked(`${resourceKey}.${a}`, selected))
      .map(a => `${resourceKey}.${a}`);
    const allChecked = manageableKeys.length > 0 && manageableKeys.every(k => selected.has(k));
    const someChecked = manageableKeys.some(k => selected.has(k));

    // Child resources nested inside this card (pipeline_stages, working_hours).
    const nestedChildren = Object.entries(RESOURCE_NESTING)
      .filter(([, parent]) => parent === resourceKey)
      .map(([child]) => child)
      .filter(child => resources[child]);

    // One checkbox per group; standalone actions keep their own row.
    const ownActions = Object.keys(resourceConfig.actions);
    const visibleGroups = visibleGroupsFor(resourceKey, ownActions);
    const visibleStandalone = visibleActionKeys(resourceKey, ownActions);

    const visibleNested = nestedChildren
      .map(child => {
        const childActions = Object.keys(resources[child].actions);
        return {
          child,
          groups: visibleGroupsFor(child, childActions),
          standalone: visibleActionKeys(child, childActions),
        };
      })
      .filter(n => n.groups.length > 0 || n.standalone.length > 0);

    // No visible rows at all (all system/hidden, or filtered out) → no card.
    if (visibleGroups.length === 0 && visibleStandalone.length === 0 && visibleNested.length === 0) {
      return null;
    }

    const groupBy = (k: ActionGroup['key']) => visibleGroups.find(g => g.key === k);

    return (
      <div key={resourceKey} className="border-b border-sidebar-border/30 last:border-0">
        <div className={`${ROW_GRID} py-1`}>
          <div className="flex items-center gap-2">
            {canEdit && manageableKeys.length > 0 && (
              <Checkbox
                id={`resource-${resourceKey}`}
                checked={allChecked}
                data-indeterminate={!allChecked && someChecked}
                onCheckedChange={() => toggleResource(resourceKey)}
                className="shrink-0"
              />
            )}
            <span className="truncate text-sm text-sidebar-foreground">{resourceConfig.name}</span>
          </div>
          {renderGroupCell(resourceKey, groupBy('read'))}
          {renderGroupCell(resourceKey, groupBy('write'))}
          {renderGroupCell(resourceKey, groupBy('delete'))}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {visibleStandalone.map(a => renderActionRow(resourceKey, a))}
          </div>
        </div>
        {visibleNested.map(({ child, groups, standalone }) => {
          const childBy = (k: ActionGroup['key']) => groups.find(g => g.key === k);
          return (
            <div key={child} className={`${ROW_GRID} pb-1`}>
              <span className="truncate pl-8 text-xs text-sidebar-foreground/50">
                {t(NESTED_LABEL_KEYS[child])}
              </span>
              {renderGroupCell(child, childBy('read'))}
              {renderGroupCell(child, childBy('write'))}
              {renderGroupCell(child, childBy('delete'))}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {standalone.map(a => renderActionRow(child, a))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render each domain's rows once, so the section and global "select all" own
  // exactly the resources on screen — a search must not let them toggle rows the
  // admin cannot see.
  const renderedDomains = domains
    .map(domain => {
      const items = domain.resources
        .map(resourceKey => ({ resourceKey, node: renderResourceCard(resourceKey) }))
        .filter(item => item.node !== null);
      return { domain, items };
    })
    .filter(({ items }) => items.length > 0);

  const allVisibleKeys = keysOfResources(
    renderedDomains.flatMap(({ items }) => items.map(i => i.resourceKey)),
  );

  return (
    <div className="h-full flex flex-col p-4">
      <BaseHeader
        title={role.name}
        subtitle={role.description ?? undefined}
        primaryAction={
          canEdit
            ? {
                label: saving ? t('saving') : t('savePermissions'),
                icon: saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
                onClick: handleSave,
                disabled: saving,
              }
            : canDuplicate
              ? {
                  label: t('detail.duplicate'),
                  icon: <Copy className="h-4 w-4" />,
                  onClick: startDuplicate,
                  disabled: duplicate.running,
                }
              : undefined
        }
        secondaryActions={[
          {
            label: t('backToList'),
            icon: <ArrowLeft className="h-4 w-4" />,
            onClick: () => navigate('/settings/roles'),
            variant: 'outline',
          },
        ]}
      >
        <div className="flex items-center gap-2 -mt-2">
          {role.system && <Badge variant="secondary">{t('badges.system')}</Badge>}
          <Badge variant="outline">{t(`type.${role.type}`)}</Badge>
          <span className="text-sm text-sidebar-foreground/60">
            {selected.size} {t('detail.permissionsSelected')}
          </span>
          {canUpdate && !role.system && !editingMeta && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={startEditMeta}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              {t('editRole')}
            </Button>
          )}
        </div>
      </BaseHeader>

      {isSystemRole && (
        <div
          data-testid="system-role-readonly-notice"
          className="mt-4 flex items-start gap-2 rounded-md border border-sidebar-border bg-sidebar/60 p-3 text-sm text-sidebar-foreground/80"
        >
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{t('detail.systemReadOnly')}</span>
        </div>
      )}

      {editingMeta && (
        <div className="mt-4 mb-2 rounded-md border border-sidebar-border bg-sidebar p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="meta-name">{t('createModal.nameLabel')}</Label>
            <Input
              id="meta-name"
              value={metaForm.name}
              onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
              disabled={savingMeta}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meta-description">{t('createModal.descriptionLabel')}</Label>
            <Textarea
              id="meta-description"
              value={metaForm.description}
              onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              disabled={savingMeta}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta || !metaForm.name.trim()}>
              {savingMeta ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {t('saveChanges')}
            </Button>
            <Button variant="outline" size="sm" onClick={cancelEditMeta} disabled={savingMeta}>
              <X className="h-3.5 w-3.5 mr-1" />
              {t('createModal.cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto mt-6">
        {Object.keys(resources).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detail.noPermissions')}</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={t('detail.filterPlaceholder')}
                className="max-w-sm"
              />
              {canEdit &&
                (() => {
                  const keys = allVisibleKeys;
                  const { all, some } = bulkState(keys);
                  return (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-everything"
                        checked={all}
                        data-indeterminate={!all && some}
                        onCheckedChange={() => toggleKeys(keys)}
                      />
                      <Label htmlFor="select-all-everything" className="cursor-pointer text-sm font-normal">
                        {all ? t('detail.deselectAll') : t('detail.selectAll')}
                      </Label>
                    </div>
                  );
                })()}
            </div>
            {renderedDomains.map(({ domain, items }) => {
              const cards = items.map(i => i.node);
              // A search must never hide its own results behind a collapsed section.
              const open = term ? true : !collapsed.has(domain.key);
              const domainKeys = keysOfResources(items.map(i => i.resourceKey));
              const domainState = bulkState(domainKeys);
              return (
                <div key={domain.key} className="space-y-2">
                  <div className="flex items-center gap-2 py-1">
                    {canEdit && domainKeys.length > 0 && (
                      <Checkbox
                        id={`select-all-${domain.key}`}
                        aria-label={t('detail.selectAll')}
                        checked={domainState.all}
                        data-indeterminate={!domainState.all && domainState.some}
                        onCheckedChange={() => toggleKeys(domainKeys)}
                        className="shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDomain(domain.key)}
                      aria-expanded={open}
                      className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      {t(domain.labelKey)}
                      <span className="text-xs font-normal text-sidebar-foreground/40">
                        {cards.length}
                      </span>
                    </button>
                  </div>
                  {open && (
                    <div className="rounded-md border border-sidebar-border/40 bg-sidebar px-3">
                      {/* Column labels and their tooltips live here, once per section,
                          instead of being repeated on every row. */}
                      <div
                        className={`${ROW_GRID} border-b border-sidebar-border/40 py-1.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40`}
                      >
                        <span />
                        {(['read', 'write', 'delete'] as const).map(key => (
                          <div key={key} className="flex items-center justify-center gap-1">
                            <span>{t(`detail.actionGroups.${key}`)}</span>
                            <TooltipInfo
                              title={t(`detail.actionGroups.${key}`)}
                              content={t(`detail.actionGroups.${key}Description`)}
                            />
                          </div>
                        ))}
                        <span />
                      </div>
                      {cards}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={duplicate.open}
        onOpenChange={open => !open && !duplicate.running && setDuplicate({ open: false, name: '', running: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.duplicateTitle')}</DialogTitle>
            <DialogDescription>{t('detail.duplicateDescription', { name: role.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="duplicate-name">{t('createModal.nameLabel')}</Label>
            <Input
              id="duplicate-name"
              value={duplicate.name}
              onChange={e => setDuplicate(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleDuplicate()}
              disabled={duplicate.running}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicate({ open: false, name: '', running: false })}
              disabled={duplicate.running}
            >
              {t('createModal.cancel')}
            </Button>
            <Button onClick={handleDuplicate} disabled={duplicate.running || !duplicate.name.trim()}>
              {duplicate.running ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('detail.duplicating')}</>
              ) : (
                <><Copy className="h-4 w-4 mr-2" />{t('detail.duplicateConfirm')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
