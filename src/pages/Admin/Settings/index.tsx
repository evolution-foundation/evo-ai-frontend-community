import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Mail, MailOpen, HardDrive, KeyRound, MessageSquare, Sparkles, Puzzle, Globe, Cable } from 'lucide-react';

const navItems = [
  { key: 'email', path: '/settings/admin/email', icon: Mail },
  { key: 'storage', path: '/settings/admin/storage', icon: HardDrive },
  { key: 'socialLogin', path: '/settings/admin/social-login', icon: KeyRound },
  { key: 'channels', path: '/settings/admin/channels', icon: MessageSquare },
  { key: 'openai', path: '/settings/admin/openai', icon: Sparkles },
  { key: 'integrations', path: '/settings/admin/integrations', icon: Puzzle },
  { key: 'evolutionHub', path: '/settings/admin/evolution-hub', icon: Cable },
  { key: 'inboundEmail', path: '/settings/admin/inbound-email', icon: MailOpen },
  { key: 'frontendRuntime', path: '/settings/admin/frontend-runtime', icon: Globe },
] as const;

export default function AdminSettingsLayout() {
  const { t } = useLanguage('adminSettings');
  const location = useLocation();

  if (location.pathname === '/settings/admin' || location.pathname === '/settings/admin/') {
    return <Navigate to="/settings/admin/email" replace />;
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r border-sidebar-border p-4">
        <h3 className="text-sm font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4">
          {t('title')}
        </h3>
        <nav className="space-y-1">
          {navItems.map(({ key, path, icon: Icon }) => (
            <NavLink
              key={key}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {t(`navigation.${key}`)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
