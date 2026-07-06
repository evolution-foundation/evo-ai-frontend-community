import axios from 'axios';
import type { OnboardingFormData } from '@/pages/Setup/OnboardingPage';

const authBaseURL =
  import.meta.env.VITE_AUTH_API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001';

const setupApi = axios.create({
  baseURL: authBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

export interface SetupStatus {
  status: 'active' | 'inactive';
  instance_id: string | null;
  api_key?: string;
  licensed?: boolean;
  /** True when a consumer contributes extra setup steps. */
  extra_setup_steps?: boolean;
}

export interface BootstrapPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  /** Opaque bag forwarded to the server's after_bootstrap hook; populated
   *  only by a contributed step. */
  extension_payload?: Record<string, unknown>;
}

export interface BootstrapResponse {
  status: string;
  message: string;
  survey_token: string | null;
}

export const setupService = {
  async getStatus(): Promise<SetupStatus> {
    const { data } = await setupApi.get<SetupStatus>('/setup/status');
    return data;
  },

  async bootstrap(payload: BootstrapPayload): Promise<BootstrapResponse> {
    const { data } = await setupApi.post<BootstrapResponse>('/setup/bootstrap', payload);
    return data;
  },

  /** POST /setup/survey — pre-login, authenticated via one-time survey_token */
  async saveSurvey(form: OnboardingFormData, surveyToken: string): Promise<void> {
    await setupApi.post(
      '/setup/survey',
      {
        team_size:          form.teamSize,
        daily_volume:       form.dailyVolume,
        main_channel:       form.mainChannel,
        main_channel_other: form.mainChannelOther,
        uses_ai:            form.usesAI,
        biggest_pain:       form.biggestPain,
        crm_experience:     form.crmExperience,
        main_goal:          form.mainGoal,
      },
      { headers: { 'X-Survey-Token': surveyToken } },
    );
  },
};
