import apiAuth from '@/services/core/apiAuth';
import { extractData } from '@/utils/apiHelpers';
import { useAuthStore } from '@/store/authStore';
import { UserResponse } from '@/types/auth';

const CODE_VERIFIER_KEY = '_kc_cv';

function _getKeycloakEnv() {
  return {
    enabled:  (import.meta.env.VITE_KEYCLOAK_ENABLED  as string | undefined) ?? '',
    issuer:   (import.meta.env.VITE_KEYCLOAK_ISSUER   as string | undefined) ?? '',
    clientId: (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? '',
  };
}

export function isKeycloakEnabled(): boolean {
  const { enabled, issuer, clientId } = _getKeycloakEnv();
  if (enabled.startsWith('VITE_') || enabled !== 'true') return false;
  const issuerSet  = !!issuer   && !issuer.startsWith('VITE_');
  const clientSet  = !!clientId && !clientId.startsWith('VITE_');
  return issuerSet && clientSet;
}


// ─── PKCE helpers ──────────────────────────────────────────────────────────

function generateRandom(byteLength: number): string {
  const array = new Uint8Array(byteLength);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const str = String.fromCharCode(...new Uint8Array(buffer));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the Keycloak authorization URL with a fresh PKCE code challenge.
 * Stores the code verifier in sessionStorage for retrieval at the callback.
 */
export async function buildKeycloakAuthUrl(redirectUri: string): Promise<string> {
  const { issuer, clientId } = _getKeycloakEnv();
  if (!issuer || !clientId) {
    throw new Error('Keycloak is not configured (VITE_KEYCLOAK_ISSUER / VITE_KEYCLOAK_CLIENT_ID)');
  }

  const codeVerifier = generateRandom(32);
  const challenge = base64UrlEncode(await sha256(codeVerifier));

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 'openid email profile',
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });

  return `${issuer}/protocol/openid-connect/auth?${params}`;
}

/**
 * Complete the PKCE flow after Keycloak redirects back.
 *
 * Sends the authorization code and PKCE verifier to the Evolution backend,
 * which handles the Keycloak token exchange server-side (avoiding browser
 * SSL issues with self-signed certs in development).
 */
export async function exchangeKeycloakCode(
  code: string,
  redirectUri: string,
): Promise<{ user: UserResponse }> {
  const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
  if (!codeVerifier) throw new Error('Missing PKCE code verifier — session may have expired');

  try {
    const response = await apiAuth.post('/auth/keycloak_exchange', {
      code,
      code_verifier: codeVerifier,
      redirect_uri:  redirectUri,
    });

    // Only remove code_verifier after successful exchange
    sessionStorage.removeItem(CODE_VERIFIER_KEY);

  const data = extractData<{ user: UserResponse; token: { access_token: string } }>(response);

  const accessToken =
    data?.token?.access_token ||
    (response.data as any)?.access_token;

    if (accessToken) {
      useAuthStore.getState().setAccessToken(accessToken);
    }

    return { user: data.user };
  } catch (error) {
    // Don't remove code_verifier on error - allows retry if needed
    throw error;
  }
}
