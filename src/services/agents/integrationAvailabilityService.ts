import api from '@/services/core/api';

/**
 * Integration Availability Service
 *
 * Fetches the *availability* signal (whether an integration provider is
 * globally configured/available for this tenant) from the CRM Ruby backend
 * (`:3000`, `GET /api/v1/integrations/availability`).
 *
 * This is a SEPARATE axis from "connected" (per-agent, which comes from
 * `GET /agents/:id/integrations` on the core Go service). Availability gates
 * the "Em breve" / ATIVAR-disabled UI; "connected" reflects whether *this*
 * agent already has the integration wired up.
 *
 * IMPORTANT: it uses the CRM client `@/services/core/api` (baseURL
 * `${VITE_API_URL}/api/v1` → :3000), NOT `evoaiApi`.
 *
 * The endpoint returns snake_case keys:
 *   { data: { google_calendar: bool, google_sheets: bool, github: bool,
 *             notion: bool, hubspot: bool, linear: bool, monday: bool,
 *             atlassian: bool, asana: bool, paypal: bool, canva: bool,
 *             supabase: bool, stripe: bool } }
 * (elevenlabs / knowledge-nexus are NOT returned — they stay on the
 * front-end allowlist.)
 */

/**
 * Fetch the raw availability map (snake_case keys as returned by the backend).
 * Fail-safe: on any error, resolves to `null` instead of throwing, so the editor
 * tabs never crash on a network/permission failure and can still tell "the check
 * failed" apart from "not configured".
 */
export async function getIntegrationAvailability(): Promise<Record<string, boolean> | null> {
  try {
    const res = await api.get('/integrations/availability');
    const data = res.data?.data;
    return data && typeof data === 'object' ? (data as Record<string, boolean>) : {};
  } catch (error) {
    console.error('Error loading integration availability:', error);
    return null;
  }
}

export default getIntegrationAvailability;
