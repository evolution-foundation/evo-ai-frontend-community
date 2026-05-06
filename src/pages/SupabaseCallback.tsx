import SupabaseService from '@/services/integrations/supabaseService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const SupabaseCallback = createCallbackPage({
  integrationName: 'Supabase',
  service: SupabaseService,
  integrationId: 'supabase',
});

export default SupabaseCallback;
