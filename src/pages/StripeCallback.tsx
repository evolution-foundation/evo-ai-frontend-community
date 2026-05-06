import StripeService from '@/services/integrations/stripeService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const StripeCallback = createCallbackPage({
  integrationName: 'Stripe',
  service: StripeService,
  integrationId: 'stripe',
});

export default StripeCallback;
