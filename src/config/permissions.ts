/**
 * Configuração de permissões baseada nos menuItems
 * Define quais recursos existem no sistema e quais ações são possíveis em cada um
 */

export interface PermissionResource {
  key: string; // Ex: 'contacts', 'pipelines'
  label: string; // Nome exibido para o usuário
  description?: string;
  actions: PermissionAction[];
  category: 'core' | 'agents' | 'settings' | 'other';
}

export interface PermissionAction {
  key: string; // 'create', 'read', 'update', 'delete'
  label: string;
}

export interface CategoryInfo {
  key: 'core' | 'agents' | 'settings' | 'other';
  label: string;
}

// Definição dos recursos e suas ações disponíveis (estrutural)
// As labels e descriptions vêm do i18n
const RESOURCE_DEFINITIONS = [
  // Core Features
  { key: 'dashboard', actions: ['read'], category: 'core' as const },
  { key: 'conversations', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'contacts', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'pipelines', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'channels', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },

  // AI Agents
  { key: 'ai_agents', actions: ['read', 'create', 'update', 'delete'], category: 'agents' as const },
  { key: 'ai_custom_tools', actions: ['read', 'create', 'update', 'delete'], category: 'agents' as const },
  { key: 'ai_custom_mcp_servers', actions: ['read', 'create', 'update', 'delete'], category: 'agents' as const },
  { key: 'ai_mcp_servers', actions: ['read'], category: 'agents' as const },
  { key: 'ai_tools', actions: ['read'], category: 'agents' as const },

  // Settings
  { key: 'accounts', actions: ['read', 'update'], category: 'settings' as const },
  { key: 'users', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'teams', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'roles', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'labels', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'custom_attribute_definitions', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'canned_responses', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'message_templates', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'macros', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'integrations', actions: ['read', 'update'], category: 'settings' as const },
  { key: 'access_tokens', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'webhooks', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'oauth_applications', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'dashboard_apps', actions: ['read'], category: 'settings' as const },
];

/**
 * Retorna os recursos de permissão traduzidos
 * @param t - Função de tradução do i18n
 */
export const getPermissionResources = (t: (key: string) => string): PermissionResource[] => {
  return RESOURCE_DEFINITIONS.map(resource => ({
    key: resource.key,
    label: t(`permissions.resources.${resource.key}.label`),
    description: t(`permissions.resources.${resource.key}.description`),
    actions: resource.actions.map(actionKey => ({
      key: actionKey,
      label: t(`permissions.actions.${actionKey}`),
    })),
    category: resource.category,
  }));
};

/**
 * Retorna as categorias traduzidas
 * @param t - Função de tradução do i18n
 */
export const getCategories = (t: (key: string) => string): CategoryInfo[] => {
  return [
    { key: 'core', label: t('permissions.categories.core') },
    { key: 'agents', label: t('permissions.categories.agents') },
    { key: 'settings', label: t('permissions.categories.settings') },
    { key: 'other', label: t('permissions.categories.other') },
  ];
};

/**
 * Retorna recursos filtrados por categoria
 * @param category - Categoria para filtrar
 * @param t - Função de tradução do i18n
 */
export const getResourcesByCategory = (
  category: PermissionResource['category'],
  t: (key: string) => string
): PermissionResource[] => {
  return getPermissionResources(t).filter(r => r.category === category);
};

// Função para converter permissões em array de strings (resource.action)
export const permissionsToStringArray = (permissions: Record<string, string[]>): string[] => {
  const result: string[] = [];
  Object.entries(permissions).forEach(([resource, actions]) => {
    actions.forEach(action => {
      result.push(`${resource}.${action}`);
    });
  });
  return result;
};

// Função para converter array de strings em objeto de permissões
export const stringArrayToPermissions = (permissions: string[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  permissions.forEach(permission => {
    const [resource, action] = permission.split('.');
    if (resource && action) {
      if (!result[resource]) {
        result[resource] = [];
      }
      result[resource].push(action);
    }
  });
  return result;
};
