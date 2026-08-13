/**
 * NON-AUTHORITATIVE mirror of the RBAC catalog. The single source of truth is
 * the backend catalog (evo-auth-service `ResourceActionsConfig::RESOURCES`),
 * surfaced live via the resource_actions endpoint and consumed by
 * `PermissionsContext.can()`. This file gates nothing; it exists only as a
 * structural reference for building permission UIs. Keep it aligned with the
 * catalog, but never treat it as the source of truth for access decisions.
 */

/**
 * Configuração de permissões baseada no catálogo do backend
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
// As labels e descriptions vêm do i18n. Espelha o catálogo do backend
// (ResourceActionsConfig::RESOURCES); mantenha as chaves/ações em sincronia.
const RESOURCE_DEFINITIONS = [
  // Core Features (CRM / customer support surface)
  { key: 'conversations', actions: ['read', 'create', 'update', 'delete', 'meta', 'search', 'filter', 'available_for_pipeline', 'mute', 'unmute', 'transcript', 'toggle_status', 'toggle_priority', 'toggle_typing_status', 'update_last_seen', 'unread', 'custom_attributes', 'attachments', 'inbox_assistant', 'read_all', 'import'], category: 'core' as const },
  { key: 'contacts', actions: ['read', 'create', 'update', 'delete', 'active', 'search', 'filter', 'import', 'export', 'contactable_inboxes', 'destroy_custom_attributes', 'avatar'], category: 'core' as const },
  // Channels surface is enforced under `inboxes.*` (not `channels.*`).
  { key: 'inboxes', actions: ['read', 'create', 'update', 'delete', 'assignable_agents', 'agent_bot', 'set_agent_bot', 'setup_channel_provider', 'disconnect_channel_provider', 'avatar', 'sync_whatsapp_templates', 'whatsapp_templates', 'update_whatsapp_template', 'delete_whatsapp_template', 'message_templates', 'update_message_template', 'delete_message_template'], category: 'core' as const },
  { key: 'pipelines', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'pipeline_stages', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'products', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'segments', actions: ['read', 'create', 'update', 'delete', 'recompute'], category: 'core' as const },
  { key: 'journeys', actions: ['read', 'create', 'update', 'delete', 'toggle_active', 'duplicate', 'manage_sessions'], category: 'core' as const },
  { key: 'campaigns', actions: ['read', 'create', 'update', 'delete', 'schedule', 'execute', 'pause', 'resume', 'stop', 'duplicate', 'bulk_action'], category: 'core' as const },
  { key: 'crm_forms', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'chat_pages', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },
  { key: 'csat_survey_responses', actions: ['read', 'create', 'update', 'delete'], category: 'core' as const },

  // AI Agents
  { key: 'ai_agents', actions: ['read', 'create', 'update', 'delete', 'sync', 'import', 'share', 'manage_folder'], category: 'agents' as const },
  { key: 'ai_tools', actions: ['read', 'create', 'update', 'delete', 'test', 'available', 'categories', 'config'], category: 'agents' as const },
  { key: 'ai_api_keys', actions: ['read', 'create', 'update', 'delete'], category: 'agents' as const },
  { key: 'ai_folders', actions: ['read', 'create', 'update', 'delete', 'share', 'access_shared'], category: 'agents' as const },
  { key: 'ai_mcp_servers', actions: ['read', 'create', 'update', 'delete', 'test'], category: 'agents' as const },
  { key: 'ai_agent_processor', actions: ['read', 'execute', 'stream'], category: 'agents' as const },
  { key: 'ai_chat_sessions', actions: ['read', 'create', 'update', 'delete', 'bulk_delete', 'metrics'], category: 'agents' as const },
  { key: 'ai_a2a_protocol', actions: ['read', 'execute', 'stream', 'message_send', 'task_management'], category: 'agents' as const },
  { key: 'ai_custom_mcp_servers', actions: ['read', 'create', 'update', 'delete', 'test'], category: 'agents' as const },
  { key: 'ai_custom_tools', actions: ['read', 'create', 'update', 'delete', 'test'], category: 'agents' as const },
  { key: 'ai_clients', actions: ['read', 'usage', 'limits'], category: 'agents' as const },
  { key: 'agent_bots', actions: ['read', 'create', 'update', 'delete', 'avatar'], category: 'agents' as const },

  // Settings / administration
  { key: 'accounts', actions: ['read', 'create', 'update', 'delete', 'stats', 'types'], category: 'settings' as const },
  { key: 'users', actions: ['read', 'create', 'update', 'delete', 'bulk_operations', 'stats', 'types', 'permissions', 'check_permission', 'destroy_access_token', 'remove_avatar', 'create_account_user', 'manage'], category: 'settings' as const },
  { key: 'profiles', actions: ['read', 'update', 'update_avatar', 'update_password', 'manage_notifications'], category: 'settings' as const },
  { key: 'teams', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'roles', actions: ['read', 'create', 'update', 'delete', 'bulk_assign', 'bulk_update_permissions'], category: 'settings' as const },
  { key: 'labels', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'custom_attribute_definitions', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'canned_responses', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'procedures', actions: ['read', 'create', 'update', 'delete', 'publish', 'share', 'send_to_customer', 'manage_visibility', 'write'], category: 'settings' as const },
  { key: 'message_templates', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'macros', actions: ['read', 'create', 'update', 'delete', 'execute'], category: 'settings' as const },
  { key: 'automation_rules', actions: ['read', 'create', 'update', 'delete', 'clone'], category: 'settings' as const },
  { key: 'integrations', actions: ['read', 'create', 'update', 'delete', 'connect', 'disconnect', 'execute'], category: 'settings' as const },
  { key: 'access_tokens', actions: ['read', 'create', 'update', 'delete', 'update_token'], category: 'settings' as const },
  { key: 'webhooks', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'oauth_applications', actions: ['read', 'create', 'update', 'delete', 'regenerate_secret'], category: 'settings' as const },
  { key: 'dashboard_apps', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'working_hours', actions: ['read', 'create', 'update', 'delete'], category: 'settings' as const },
  { key: 'installation_configs', actions: ['manage'], category: 'settings' as const },

  // Other (filters, templates, channel authorizations)
  { key: 'custom_filters', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
  { key: 'templates', actions: ['read', 'export', 'import'], category: 'other' as const },
  { key: 'microsoft_authorizations', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
  { key: 'google_authorizations', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
  { key: 'instagram_authorizations', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
  { key: 'whatsapp_authorizations', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
  { key: 'twitter_authorizations', actions: ['read', 'create', 'update', 'delete'], category: 'other' as const },
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
