import { LucideIcon } from 'lucide-react';
import {
  User,
  LogOut,
  Cog,
  MessageSquare,
  Contact,
  SquareKanban,
  Bot,
  Layers,
  PieChart,
  Users2,
  Clock,
  Code,
  MessageCircle,
  LayoutTemplate,
  Key,
  Tags,
  TestTube,
  Wand,
  Workflow,
  Settings,
  List,
  Shield,
  Package,
  Filter,
  Megaphone,
  Route,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export interface MenuItem {
  id?: string;
  name: string;
  href: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
  resource?: string;
  action?: string;
  permissions?: string[];
  requireAll?: boolean;
  requiredRoleKey?: string;
  badge?: number;
}

export interface SubMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  resource?: string;
  action?: string;
  permissions?: string[];
  requireAll?: boolean;
  requiredRoleKey?: string;
}

export interface ProfileMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export const getCustomerMenuItems = (t: (key: string) => string): MenuItem[] => [
  {
    name: t('menu.customer.dashboard'),
    href: '/dashboard',
    icon: PieChart,
    resource: 'dashboard',
    action: 'read',
  },
  {
    name: t('menu.customer.conversations'),
    href: '/conversations',
    icon: MessageSquare,
    resource: 'conversations',
    action: 'read',
  },
  {
    id: 'customer-contacts',
    name: t('menu.customer.contacts'),
    href: '/contacts',
    icon: Contact,
    resource: 'contacts',
    action: 'read',
    subItems: [
      {
        name: t('menu.contacts.list'),
        href: '/contacts',
        icon: Contact,
        resource: 'contacts',
        action: 'read',
      },
      {
        name: t('menu.contacts.scheduledActions'),
        href: '/contacts/scheduled-actions',
        icon: Clock,
        resource: 'contacts',
        action: 'read',
      },
    ],
  },
  {
    name: t('menu.customer.pipelines'),
    href: '/pipelines',
    icon: SquareKanban,
    resource: 'pipelines',
    action: 'read',
  },
  {
    name: t('menu.customer.products'),
    href: '/products',
    icon: Package,
    resource: 'products',
    action: 'read',
  },
  {
    name: t('menu.customer.automation'),
    href: '/automation',
    icon: Workflow,
    resource: 'automation_rules',
    action: 'read',
  },
  {
    name: t('menu.customer.journeys'),
    href: '/journeys',
    icon: Route,
    resource: 'journeys',
    action: 'read',
  },
  {
    name: t('menu.customer.campaigns'),
    href: '/campaigns',
    icon: Megaphone,
    resource: 'campaigns',
    action: 'read',
  },
  {
    id: 'customer-agents',
    name: t('menu.customer.agents'),
    href: '/agents/list',
    icon: Bot,
    resource: 'ai_agents',
    action: 'read',
    subItems: [
      {
        name: t('menu.agents.list'),
        href: '/agents/list',
        icon: List,
        resource: 'ai_agents',
        action: 'read',
      },
      {
        name: t('menu.agents.customTools'),
        href: '/agents/custom-tools',
        icon: Wand,
        resource: 'ai_custom_tools',
        action: 'read',
      },
      {
        name: t('menu.agents.customMcps'),
        href: '/agents/custom-mcp-servers',
        icon: TestTube,
        resource: 'ai_custom_mcp_servers',
        action: 'read',
      },
    ],
  },
  {
    name: t('menu.customer.channels'),
    href: '/channels',
    icon: Layers,
    resource: 'channels',
    action: 'read',
  },
  {
    id: 'customer-settings',
    name: t('menu.customer.settings'),
    href: '#',
    icon: Cog,
    subItems: [
      {
        name: t('menu.settings.account'),
        href: '/settings/account',
        icon: User,
        // Configurações de conta são sempre disponíveis - sem permissão específica
      },
      {
        name: t('menu.settings.users'),
        href: '/settings/users',
        icon: Users2,
        resource: 'users',
        action: 'read',
      },
      {
        name: t('menu.settings.teams'),
        href: '/settings/teams',
        icon: Clock,
        resource: 'teams',
        action: 'read',
      },
      {
        name: t('menu.settings.labels'),
        href: '/settings/labels',
        icon: Tags,
        resource: 'labels',
        action: 'read',
      },
      {
        name: t('menu.settings.customAttributes'),
        href: '/settings/attributes',
        icon: Code,
        resource: 'custom_attribute_definitions',
        action: 'read',
      },
      {
        name: t('menu.settings.segments'),
        href: '/settings/segments',
        icon: Filter,
        resource: 'segments',
        action: 'read',
      },
      {
        name: t('menu.settings.cannedResponses'),
        href: '/settings/canned-responses',
        icon: MessageCircle,
        resource: 'canned_responses',
        action: 'read',
      },
      {
        name: t('menu.settings.messageTemplates'),
        href: '/settings/message-templates',
        icon: LayoutTemplate,
        resource: 'message_templates',
        action: 'read',
      },
      {
        name: t('menu.settings.macros'),
        href: '/settings/macros',
        icon: Settings,
        resource: 'macros',
        action: 'read',
      },
      {
        name: t('menu.settings.crmForms'),
        href: '/settings/crm-forms',
        icon: FileText,
        resource: 'crm_forms',
        action: 'read',
      },
      {
        name: t('menu.settings.templates'),
        href: '/settings/templates',
        icon: Package,
        resource: 'templates',
        action: 'read',
      },
      {
        name: t('menu.settings.integrations'),
        href: '/settings/integrations',
        icon: Settings,
        resource: 'integrations',
        action: 'read',
      },
      {
        name: t('menu.settings.accessTokens'),
        href: '/settings/access-tokens',
        icon: Key,
        resource: 'access_tokens',
        action: 'read',
      },
      {
        name: t('menu.settings.roles'),
        href: '/settings/roles',
        icon: ShieldCheck,
        resource: 'roles',
        action: 'read',
      },
      {
        name: t('menu.settings.admin'),
        href: '/settings/admin',
        icon: Shield,
        resource: 'installation_configs',
        action: 'manage',
      },
    ],
  },
];

export const getProfileMenuItems = (
  t: (key: string) => string,
  navigate: (path: string) => void,
  setLogoutDialogOpen: (open: boolean) => void,
): ProfileMenuItem[] => {
  return [
    {
      name: t('profile.myProfile'),
      href: '/profile',
      icon: User,
      onClick: () => navigate('/profile'),
    },
    {
      name: t('profile.logout'),
      href: '#',
      icon: LogOut,
      onClick: () => setLogoutDialogOpen(true),
    },
  ];
};

// Função utilitária para verificar se um item de menu deve ser exibido
export const shouldShowMenuItem = (
  item: MenuItem | SubMenuItem,
  canFunction: (resource: string, action: string) => boolean,
  canAnyFunction: (permissions: string[]) => boolean,
  canAllFunction: (permissions: string[]) => boolean,
  userRoleKey?: string
): boolean => {
  // Verificar role obrigatória
  if (item.requiredRoleKey) {
    return userRoleKey === item.requiredRoleKey;
  }

  // Verificar permissões específicas
  if (item.permissions && item.permissions.length > 0) {
    return item.requireAll
      ? canAllFunction(item.permissions)
      : canAnyFunction(item.permissions);
  }

  // Verificar permissão resource.action
  if (item.resource && item.action) {
    return canFunction(item.resource, item.action);
  }

  // Se não há permissões específicas, permitir acesso para usuários autenticados
  return true;
};

// Função para filtrar menus baseado em permissões
export const filterMenuItemsByPermissions = (
  items: MenuItem[],
  canFunction: (resource: string, action: string) => boolean,
  canAnyFunction: (permissions: string[]) => boolean,
  canAllFunction: (permissions: string[]) => boolean,
  userRoleKey?: string
): MenuItem[] => {
  return items
    .filter(item => shouldShowMenuItem(item, canFunction, canAnyFunction, canAllFunction, userRoleKey))
    .map(item => {
      // Se o item tem subitens, filtrar os subitens também
      if (item.subItems && item.subItems.length > 0) {
        const filteredSubItems = item.subItems.filter(subItem =>
          shouldShowMenuItem(subItem, canFunction, canAnyFunction, canAllFunction, userRoleKey)
        );

        // Se não há subitens visíveis, não mostrar o item pai
        if (filteredSubItems.length === 0) {
          return null;
        }

        return {
          ...item,
          subItems: filteredSubItems
        };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
};
