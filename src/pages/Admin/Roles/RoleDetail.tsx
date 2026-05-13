import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@evoapi/design-system';
import { ArrowLeft, Loader2, Pencil, Save, X } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import { rolesService, type Role } from '@/services/roles/rolesService';
import { permissionsService } from '@/services/permissions';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import type { ResourceActionsData } from '@/types/auth/permissions';

export default function RoleDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage('roles');
  const navigate = useNavigate();
  const { can } = useUserPermissions();

  const [role, setRole] = useState<Role | null>(null);
  const [resourceActions, setResourceActions] = useState<ResourceActionsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: '', description: '' });
  const [savingMeta, setSavingMeta] = useState(false);

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

  const togglePermission = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleResource = (resource: string) => {
    if (!resourceActions) return;
    const keys = Object.keys(resourceActions.resources[resource]?.actions ?? {}).map(a => `${resource}.${a}`);
    const allSelected = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const updated = await rolesService.bulkUpdatePermissions(role.id, Array.from(selected));
      setRole(updated);
      permissionsService.clearPermissionsCache();
      toast.success(t('messages.permissionsSuccess'));
    } catch {
      toast.error(t('messages.permissionsError'));
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
    } catch {
      toast.error(t('messages.updateError'));
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!role || !resourceActions) return null;

  const canEdit = can('roles', 'bulk_update_permissions');
  const canUpdate = can('roles', 'update');
  const resources = resourceActions.resources;

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(resources).map(([resourceKey, resourceConfig]) => {
              const actions = Object.entries(resourceConfig.actions);
              const permKeys = actions.map(([a]) => `${resourceKey}.${a}`);
              const allChecked = permKeys.every(k => selected.has(k));
              const someChecked = permKeys.some(k => selected.has(k));

              return (
                <Card key={resourceKey} className="overflow-hidden border-sidebar-border bg-sidebar">
                  <CardHeader className="pb-2 pt-3 px-4 border-b border-sidebar-border bg-sidebar-accent/30">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <Checkbox
                          id={`resource-${resourceKey}`}
                          checked={allChecked}
                          data-indeterminate={!allChecked && someChecked}
                          onCheckedChange={() => toggleResource(resourceKey)}
                          className="shrink-0"
                        />
                      )}
                      <CardTitle className="text-sm font-medium text-sidebar-foreground">
                        {resourceConfig.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 py-2 space-y-1">
                    {actions.map(([actionKey, actionConfig]) => {
                      const key = `${resourceKey}.${actionKey}`;
                      return (
                        <div key={key} className="flex items-center gap-2 py-0.5">
                          <Checkbox
                            id={key}
                            checked={selected.has(key)}
                            onCheckedChange={canEdit ? () => togglePermission(key) : undefined}
                            disabled={!canEdit}
                          />
                          <Label
                            htmlFor={key}
                            className={`text-sm font-normal text-sidebar-foreground/80 ${canEdit ? 'cursor-pointer' : ''}`}
                          >
                            {actionConfig.name}
                          </Label>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
