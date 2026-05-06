import HubSpotService from '@/services/integrations/hubspotService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const HubSpotCallback = createCallbackPage({
  integrationName: 'HubSpot',
  service: HubSpotService,
  integrationId: 'hubspot',
});

export default HubSpotCallback;
