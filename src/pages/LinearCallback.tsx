import LinearService from '@/services/integrations/linearService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const LinearCallback = createCallbackPage({
  integrationName: 'Linear',
  service: LinearService,
  integrationId: 'linear',
});

export default LinearCallback;
