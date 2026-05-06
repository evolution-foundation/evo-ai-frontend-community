import GoogleCalendarService from '@/services/integrations/googleCalendarService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const GoogleCalendarCallback = createCallbackPage({
  integrationName: 'Google Calendar',
  service: GoogleCalendarService,
  integrationId: 'google-calendar',
  onSuccess: async (response, agentId) => {
    await GoogleCalendarService.saveConfiguration(agentId, {
      provider: 'google_calendar',
      email: response.email,
      connected: true,
      calendars: response.calendars || [],
    });
  },
});

export default GoogleCalendarCallback;
