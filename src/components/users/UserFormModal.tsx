import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import usersService from '@/services/users/usersService';
import useRoles from '@/hooks/useRoles';
import type { User, UserFormData, UserUpdateData } from '@/types/users';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';


interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

export default function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const { t } = useLanguage('users');

  // Buscar system roles
  const { roles: systemRoles, error: rolesError } = useRoles();

  // Deduplicar roles por chave para evitar que apareçam duplicados ou que a seleção marque múltiplos
  const uniqueRoles = useMemo(() => {
    // Definimos os papéis básicos que devem estar sempre disponíveis
    const baseRoles = [
      { id: 'role-agent', key: 'agent', name: 'Agent', type: 'user' },
      { id: 'role-account-owner', key: 'account_owner', name: 'Account Owner', type: 'user' },
    ];

    // Filtramos os papéis vindos do sistema
    const userRoleTypes = ['user', null, undefined];
    const filteredSystemRoles = systemRoles.filter(
      role => !!role.key && (userRoleTypes.includes(role.type as any) || !role.type)
    );

    // Combinamos e removemos duplicatas (dando preferência ao que vem do sistema se existir)
    return Array.from(
      new Map(
        [...baseRoles, ...filteredSystemRoles].map(role => [role.key, role])
      ).values()
    );
  }, [systemRoles]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'agent',
    availability: 'online',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role?.key || 'agent',
        availability: user.availability || 'online',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'agent',
        availability: 'online',
        password: '',
        confirmPassword: '',
      });
    }
    setErrors({});
  }, [user]);

  const handleFieldChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.validation.nameRequired');
    }

    if (!formData.role) {
      newErrors.role = t('form.validation.roleRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('form.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.validation.emailInvalid');
    }

    if (!user) {
      // Validações apenas para criação
      if (!formData.password) {
        newErrors.password = t('form.validation.passwordRequired');
      } else if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    } else if (formData.password) {
      // Validações para atualização (senha opcional)
      if (formData.password.length < 6) {
        newErrors.password = t('form.validation.passwordMinLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('form.validation.passwordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (user) {
        // Atualizar usuário
        const updateData: UserUpdateData = {
          name: formData.name,
          role: formData.role,
          availability: formData.availability,
        };

        await usersService.updateUser(user.id, updateData);
        toast.success(t('form.messages.updateSuccess'));
      } else {
        // Criar novo usuário
        const createData: UserFormData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          availability: formData.availability,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        };

        await usersService.createUser(createData);
        toast.success(t('form.messages.createSuccess'));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(t('form.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-sidebar border-sidebar-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground">
            {user ? t('form.title.edit') : t('form.title.create')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('form.fields.name.label')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder={t('form.fields.name.placeholder')}
              className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                errors.name ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('form.fields.email.label')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleFieldChange('email', e.target.value)}
              placeholder={t('form.fields.email.placeholder')}
              className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                errors.email ? 'border-red-500' : ''
              }`}
              disabled={loading || !!user}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            {user && (
              <p className="text-xs text-sidebar-foreground/60">
                {t('form.fields.email.cannotChange')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('form.fields.role.label')}</Label>
            <Select
              value={formData.role}
              onValueChange={value => handleFieldChange('role', value)}
              disabled={loading}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder={t('form.fields.role.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {uniqueRoles.length === 0 && (
                  <div className="px-2 py-4 text-sm text-center text-sidebar-foreground/60">
                    {rolesError ? rolesError : t('form.messages.loading')}
                  </div>
                )}
                {uniqueRoles.map(role => (
                  <SelectItem key={role.id} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability">{t('form.fields.availability.label')}</Label>
            <Select
              value={formData.availability}
              onValueChange={value => handleFieldChange('availability', value)}
              disabled={loading}
            >
              <SelectTrigger className="bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">{t('form.fields.availability.online')}</SelectItem>
                <SelectItem value="busy">{t('form.fields.availability.busy')}</SelectItem>
                <SelectItem value="offline">{t('form.fields.availability.offline')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(!user || formData.password) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {user ? t('form.fields.password.labelOptional') : t('form.fields.password.label')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={e => handleFieldChange('password', e.target.value)}
                  placeholder={t('form.fields.password.placeholder')}
                  className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  disabled={loading}
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {user
                    ? t('form.fields.confirmPassword.labelOptional')
                    : t('form.fields.confirmPassword.label')}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                  placeholder={t('form.fields.confirmPassword.placeholder')}
                  className={`bg-sidebar border-sidebar-border text-sidebar-foreground ${
                    errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="bg-sidebar hover:bg-sidebar-accent border-sidebar-border"
            >
              {t('form.actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('form.actions.saving')}
                </>
              ) : user ? (
                t('form.actions.save')
              ) : (
                t('form.actions.create')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
