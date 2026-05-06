import AsanaService from '@/services/integrations/asanaService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const AsanaCallback = createCallbackPage({
  integrationName: 'Asana',
  service: AsanaService,
  integrationId: 'asana',
});

export default AsanaCallback;
