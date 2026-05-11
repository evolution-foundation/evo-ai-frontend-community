import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
} from '@evoapi/design-system';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
      toast.success(t('messages.permissionsSuccess'));
    } catch {
      toast.error(t('messages.permissionsError'));
    } finally {
      setSaving(false);
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
        </div>
      </BaseHeader>

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
