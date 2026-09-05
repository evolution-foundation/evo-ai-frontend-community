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
  KeyRound,
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
  ScrollText,
  Receipt,
  ScanLine,
  Tag,
  Wallet,
  Wrench,
  Building2,
  PenTool,
  UtensilsCrossed,
  Bike,
  Image,
  AudioWaveform,
  Video,
} from 'lucide-react';

export interface MenuItem {
  id?: string;
  name: string;
  href: string;
  icon: LucideIcon;
  /** Imagem customizada (dataURL) — usada no lugar do ícone lucide quando presente */
  iconUrl?: string;
  subItems?: SubMenuItem[];
  resource?: string;
  action?: string;
  permissions?: string[];
  requireAll?: boolean;
  requiredRoleKey?: string;
  badge?: number;
  /**
   * Click target when the item has a badge. Separate from `href`, which
   * useMenuState#isMenuItemActive compares and which never matches a querystring.
   */
  badgeHref?: string;
}

export interface SubMenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Imagem customizada (dataURL) — usada no lugar do ícone lucide quando presente */
  iconUrl?: string;
  /** Submenus aninhados (camadas ilimitadas — usados pelos menus do Editor) */
  children?: SubMenuItem[];
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
    // `dashboard.read` is not a catalog resource — it lives in the auth
    // BASIC_READ_PERMISSIONS (every authenticated user holds it, it is the
    // landing page). Gating on it made `can()` deny for everyone (a key outside
    // the catalog is invalid), hiding the Dashboard from all users. No gate:
    // always visible to authenticated users (EVO-2071 AC7).
    name: t('menu.customer.dashboard'),
    href: '/dashboard',
    icon: PieChart,
    subItems: [
      {
        name: 'Atendimentos',
        href: '/dashboard',
        icon: PieChart,
      },
    ],
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
    // '#': igual Finanças — clicar no pai só abre/fecha o submenu, quem navega
    // são os filhos Empresa/Pessoal.
    href: '#',
    icon: SquareKanban,
    resource: 'pipelines',
    action: 'read',
    subItems: [
      { name: 'Empresa', href: '/pipelines/empresa', icon: SquareKanban, resource: 'pipelines', action: 'read' },
      { name: 'Pessoal', href: '/pipelines/pessoal', icon: SquareKanban, resource: 'pipelines', action: 'read' },
    ],
  },
  {
    name: t('menu.customer.products'),
    href: '/products',
    icon: Package,
    resource: 'products',
    action: 'read',
    subItems: [
      {
        name: t('menu.customer.products'),
        href: '/products',
        icon: Package,
        resource: 'products',
        action: 'read',
      },
      {
        name: 'Estoque',
        href: '/inventory',
        icon: Layers,
        resource: 'products',
        action: 'read',
      },
    ],
  },
  {
    name: 'Cardápio',
    href: '/orders/ifood?tab=cardapio',
    icon: UtensilsCrossed,
    resource: 'products',
    action: 'read',
  },
  {
    name: 'Finanças',
    // '#': clicar apenas abre/fecha o painel do submenu; as entradas Loja /
    // Pessoal / Ambos é que navegam. Com href='/finances', clicar no pai caía
    // na rota principal exata e a regra de auto-detecção mantinha o painel
    // fechado (submenu "não aparecia").
    href: '#',
    icon: Wallet,
    subItems: [
      { name: 'Loja', href: '/finances/loja', icon: Wallet },
      { name: 'Pessoal', href: '/finances/pessoal', icon: User },
      { name: 'Ambos', href: '/finances/ambos', icon: Layers },
      { name: 'Holerite', href: '/finances/holerite', icon: ScrollText },
      { name: 'Nota Fiscal', href: '/finances/nota-fiscal', icon: Receipt },
      { name: 'Notas/Recibos', href: '/finances/recibos', icon: ScanLine },
    ],
  },
  {
    name: 'Marketing',
    // '#': clicar no pai só abre/fecha o submenu (mesmo padrão de Finanças/
    // Ordens) — quem navega são os filhos GTM/Gestor de Posts.
    href: '#',
    icon: Tag,
    subItems: [
      { name: 'GTM', href: '/marketing/gtm', icon: Tag },
      { name: 'Gestor de Posts', href: '/marketing/gestor-posts', icon: Image },
      { name: 'Copy de Tráfego (Meta)', href: '/editor/content/mktia-copytrafego', icon: PenTool },
      { name: 'Gerar Áudio (ElevenLabs)', href: '/editor/content/mktia-audioeleven', icon: AudioWaveform },
      { name: 'Gerar Imagem e Identidade Visual', href: '/editor/content/mktia-gerarimagem', icon: Wand },
      { name: 'Roteiro de Vídeo', href: '/editor/content/mktia-roteirovideo', icon: Video },
      { name: 'Suíte de Mídia', href: '/editor/content/mktia-suitemidia', icon: Layers },
    ],
  },
  {
    name: 'Ordens',
    // '#': clicar no pai só abre/fecha o submenu (mesmo padrão de Pipelines/
    // Finanças) — quem navega são os filhos Ordens/iFood.
    href: '#',
    icon: Wrench,
    resource: 'products',
    action: 'read',
    subItems: [
      { name: 'Ordens', href: '/orders', icon: Wrench, resource: 'products', action: 'read' },
      { name: 'iFood', href: '/orders/ifood', icon: UtensilsCrossed, resource: 'products', action: 'read' },
      { name: '99 Delivery', href: '/orders/99delivery', icon: Bike, resource: 'products', action: 'read' },
      { name: 'Esteira de Pedidos (iFood)', href: '/editor/content/ordens-esteirapedidos', icon: Route },
    ],
  },
  {
    name: 'Sites',
    href: '/sites/azuliapp',
    icon: LayoutTemplate,
    subItems: [
      {
        name: 'azuliapp.com.br',
        href: '/sites/azuliapp',
        icon: LayoutTemplate,
      },
    ],
  },
  {
    name: 'Editor',
    href: '/editor/menu',
    icon: PenTool,
    subItems: [
      {
        name: 'Menu principal',
        href: '/editor/menu',
        icon: PenTool,
      },
    ],
  },
  {
    name: 'Organização',
    href: '/organizacao/dados-empresa',
    icon: Building2,
    subItems: [
      {
        name: 'Dados da Empresa',
        href: '/organizacao/dados-empresa',
        icon: Building2,
      },
      {
        name: 'Cardápio Digital',
        href: '/organizacao/cardapio-digital',
        icon: UtensilsCrossed,
      },
    ],
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
    resource: 'inboxes',
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
        // Mirrors the /settings/account route gate; accounts.read is a basic
        // grant every role holds, so the item stays visible — but menu and
        // route now agree instead of the menu linking into Não Autorizado.
        resource: 'accounts',
        action: 'read',
      },
      {
        name: t('menu.settings.users'),
        href: '/settings/users',
        icon: Users2,
        resource: 'users',
        // EVO-1938: gate the Users (Atendentes) screen on the administrative
        // users.manage. The earlier revert to users.read predated users.manage
        // being registered in the auth ResourceActionsConfig; it now is, so the
        // manage gate resolves for admins (who hold it) and hides the screen from
        // the default agent (who holds only the operational users.read).
        action: 'manage',
      },
      {
        name: t('menu.settings.teams'),
        href: '/settings/teams',
        icon: Clock,
        resource: 'teams',
        action: 'manage',
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
        // CRM-166: administrative gate, not `read` — the agent holds the read to
        // render a contact's attributes and must not reach this Settings screen.
        permissions: [
          'custom_attribute_definitions.create',
          'custom_attribute_definitions.update',
          'custom_attribute_definitions.delete',
        ],
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
        name: t('menu.settings.aiCredentials'),
        href: '/settings/ai-credentials',
        icon: KeyRound,
        resource: 'ai_api_keys',
        action: 'read',
      },
      {
        name: t('menu.settings.integrationCredentials'),
        href: '/settings/integration-credentials',
        icon: Key,
        resource: 'ai_integration_credentials',
        action: 'read',
      },
      {
        name: t('menu.settings.messageTemplates'),
        href: '/settings/message-templates',
        icon: LayoutTemplate,
        resource: 'message_templates',
        action: 'manage',
      },
      {
        name: t('menu.settings.macros'),
        href: '/settings/macros',
        icon: Settings,
        resource: 'macros',
        action: 'manage',
      },
      {
        name: t('menu.settings.crmForms'),
        href: '/settings/crm-forms',
        icon: FileText,
        resource: 'crm_forms',
        action: 'read',
      },
      {
        name: t('menu.settings.chatPages'),
        href: '/settings/chat-pages',
        icon: MessageSquare,
        resource: 'chat_pages',
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
