import { ShieldAlert } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

interface PermissionsLoadFailureProps {
  className?: string;
}

/**
 * Shown when the permission fetch left no list to answer `can()` with (CRM-164).
 * Lives here because two hosts render it: RouterGuard, for the standalone app,
 * and PermissionsProvider, which is all the embedded shell mounts.
 */
const PermissionsLoadFailure: React.FC<PermissionsLoadFailureProps> = ({ className }) => {
  const { t } = useLanguage('common');
  const { logout } = useAuth();
  const { loading, refreshPermissions } = usePermissions();

  return (
    <div
      data-testid="permissions-load-failure"
      className={cn('flex flex-col items-center justify-center h-full', className)}
    >
      <EmptyState
        icon={ShieldAlert}
        title={t('permissions.loadFailed.title')}
        description={t('permissions.loadFailed.description')}
        action={{
          label: loading ? t('permissions.loadFailed.retrying') : t('permissions.loadFailed.retry'),
          onClick: () => {
            void refreshPermissions();
          },
          disabled: loading,
        }}
      />
      {/* A deterministic failure retries into itself forever, and this panel
          replaces every protected screen — so it needs a way out. */}
      <button
        type="button"
        data-testid="permissions-load-failure-signout"
        className="mt-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        onClick={() => {
          void logout();
        }}
      >
        {t('permissions.loadFailed.signOut')}
      </button>
    </div>
  );
};

export default PermissionsLoadFailure;
