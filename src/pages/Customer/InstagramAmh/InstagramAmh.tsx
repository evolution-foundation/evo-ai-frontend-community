import { AmhOperations } from '@/components/instagram-amh/AmhOperations';
import { AmhVisualProof } from '@/components/instagram-amh/AmhVisualProof';
import { usePermissions } from '@/contexts/PermissionsContext';
export default function InstagramAmh() {
  const { can } = usePermissions();
  return (
    <>
      <AmhOperations />
      <AmhVisualProof
        permissions={{
          create: can('journeys', 'create'),
          edit: can('journeys', 'update'),
          publish: can('journeys', 'toggle_active'),
        }}
      />
    </>
  );
}
