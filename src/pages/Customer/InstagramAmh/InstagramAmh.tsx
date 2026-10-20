import { AmhAutomation } from '@/components/instagram-amh/AmhAutomation';
import { usePermissions } from '@/contexts/PermissionsContext';
export default function InstagramAmh() {
  const { can } = usePermissions();
  if (!can('journeys', 'read')) return null;
  return (
    <AmhAutomation
      permissions={{
        create: can('journeys', 'create'),
        edit: can('journeys', 'update'),
        publish: can('journeys', 'toggle_active'),
      }}
    />
  );
}
