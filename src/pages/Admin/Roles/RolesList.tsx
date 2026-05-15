import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Button,
  Badge,
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
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import BaseHeader from '@/components/base/BaseHeader';
import EmptyState from '@/components/base/EmptyState';
import { rolesService, type Role } from '@/services/roles/rolesService';
import { permissionsService } from '@/services/permissions';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export default function RolesList() {
  const { t } = useLanguage('roles');
  const navigate = useNavigate();
  const { can } = useUserPermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; role: Role | null; deleting: boolean }>({
    open: false,
    role: null,
    deleting: false,
  });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesService.list();
      setRoles(data);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const role = await rolesService.create({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      });
      toast.success(t('messages.createSuccess'));
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      navigate(`/settings/roles/${role.id}`);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string; details?: Array<{ full_messages: string[] }> } } } })?.response?.data?.error;
      const message =
        apiErr?.message && apiErr.message !== 'Validation failed'
          ? apiErr.message
          : (apiErr?.details?.[0]?.full_messages?.[0] ?? t('messages.createError'));
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.role) return;
    setDeleteDialog(prev => ({ ...prev, deleting: true }));
    try {
      await rolesService.destroy(deleteDialog.role.id);
      permissionsService.clearPermissionsCache();
      toast.success(t('messages.deleteSuccess'));
      setRoles(prev => prev.filter(r => r.id !== deleteDialog.role?.id));
      setDeleteDialog({ open: false, role: null, deleting: false });
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.deleteError'));
      setDeleteDialog(prev => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <BaseHeader
        title={t('title')}
        subtitle={t('header.subtitle', { count: roles.length })}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('header.searchPlaceholder')}
        primaryAction={
          can('roles', 'create')
            ? {
                label: t('addRole'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      <div className="flex-1 overflow-auto mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t('noRoles')}
            description={t('noRolesDescription')}
            action={
              can('roles', 'create')
                ? { label: t('addRole'), onClick: () => setCreateOpen(true) }
                : undefined
            }
            className="h-full"
          />
        ) : (
          <div className="rounded-md border border-sidebar-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border bg-sidebar-accent/50">
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground">{t('table.name')}</th>
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden md:table-cell">{t('table.description')}</th>
                  <th className="px-4 py-3 text-left font-medium text-sidebar-foreground hidden sm:table-cell">{t('table.type')}</th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground hidden sm:table-cell">{t('table.permissions')}</th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground hidden md:table-cell">{t('table.users')}</th>
                  <th className="px-4 py-3 text-right font-medium text-sidebar-foreground">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(role => (
                  <tr
                    key={role.id}
                    className="border-b border-sidebar-border last:border-0 hover:bg-sidebar-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sidebar-foreground">{role.name}</span>
                        {role.system && (
                          <Badge variant="secondary" className="text-xs">{t('badges.system')}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sidebar-foreground/60 hidden md:table-cell max-w-xs truncate">
                      {role.description || '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {t(`type.${role.type}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sidebar-foreground/80 hidden sm:table-cell">
                      {role.permissions_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-sidebar-foreground/80 hidden md:table-cell">
                      {role.users_count}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('roles', 'update') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                            onClick={() => navigate(`/settings/roles/${role.id}`)}
                            title={t('editRole')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {can('roles', 'delete') && !role.system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-sidebar-accent"
                            onClick={() => setDeleteDialog({ open: true, role, deleting: false })}
                            title={t('deleteRole')}
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
        )}
      </div>

      {/* Create Role Modal */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm({ name: '', description: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createModal.title')}</DialogTitle>
            <DialogDescription>{t('createModal.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">{t('createModal.nameLabel')}</Label>
              <Input
                id="role-name"
                placeholder={t('createModal.namePlaceholder')}
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-description">{t('createModal.descriptionLabel')}</Label>
              <Textarea
                id="role-description"
                placeholder={t('createModal.descriptionPlaceholder')}
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t('createModal.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !createForm.name.trim()}>
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('createModal.creating')}</>
              ) : t('createModal.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={open => !open && setDeleteDialog({ open: false, role: null, deleting: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: deleteDialog.role?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, role: null, deleting: false })}
              disabled={deleteDialog.deleting}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteDialog.deleting}>
              {deleteDialog.deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('deleteDialog.deleting')}</>
              ) : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
