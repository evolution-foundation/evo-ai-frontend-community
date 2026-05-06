import PayPalService from '@/services/integrations/paypalService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const PayPalCallback = createCallbackPage({
  integrationName: 'PayPal',
  service: PayPalService,
  integrationId: 'paypal',
});

export default PayPalCallback;
