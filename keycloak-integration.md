# Keycloak Integration

## Overview

This document describes the Keycloak SSO (Single Sign-On) integration for the Evo AI Frontend. The integration enables users to authenticate through a centralized Keycloak identity provider, supporting OAuth2/OIDC flows with PKCE (Proof Key for Code Exchange) for enhanced security.

## Features

- **SSO Authentication**: Users can authenticate via Keycloak using OAuth2/OIDC
- **PKCE Flow**: Secure client-side flow with server-side code verification
- **Role Synchronization**: User roles synced from Keycloak to local permissions
- **Seamless Logout**: Proper Keycloak session termination with redirect
- **Token Refresh**: Automatic handling of token expiration

## Required Environment Variables

### Essential Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_KEYCLOAK_ENABLED` | Enable Keycloak integration | `true` |
| `VITE_KEYCLOAK_ISSUER` | Keycloak realm URL | `https://keycloak.example.com/realms/organization` |
| `VITE_KEYCLOAK_CLIENT_ID` | Public client ID | `evo-frontend-client` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_KEYCLOAK_REDIRECT_URI` | OAuth callback URL | `window.location.origin + /auth/callback` |

## Authentication Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Frontend  │                                    │  Keycloak   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. User clicks "Login with Keycloak"             │
       │                                                  │
       │ 2. Frontend generates PKCE code_verifier         │
       │    and code_challenge, then redirects             │
       │    to Keycloak authorize endpoint                │
       │───────────────────────────────────────────────────>│
       │                                                  │
       │ 3. User authenticates in Keycloak                  │
       │    (enters credentials or uses existing session)   │
       │                                                  │
       │ 4. Keycloak redirects back with                    │
       │    authorization code to redirect_uri              │
       │<───────────────────────────────────────────────────│
       │                                                  │
       │ 5. Frontend sends code + code_verifier             │
       │    to backend /api/v1/auth/keycloak_exchange       │
       │───────────────────────────────────────────────────>│
       │                                ┌───────────────────┐
       │                                │   Evo Auth        │
       │                                │   Service         │
       │                                └─────────┬─────────┘
       │                                          │
       │                                          │ 6. Backend validates
       │                                          │    and provisions user
       │                                          │
       │ 7. Backend returns Evo tokens            │
       │<─────────────────────────────────────────│
       │                                          │
       │ 8. Frontend stores tokens and             │
       │    redirects to app                        │
       │                                          │
```

## PKCE Implementation

### Generating PKCE Parameters

```typescript
// Generate code_verifier (43-128 characters)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate code_challenge from verifier
async function generateCodeChallenge(verifier: string): string {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64URLEncode(digest);
}

// Helper: Base64URL encoding
function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### Login Flow

```typescript
// 1. Generate PKCE parameters
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// 2. Store code_verifier (sessionStorage for retrieval after redirect)
sessionStorage.setItem('pkce_code_verifier', codeVerifier);

// 3. Build Keycloak authorize URL
const params = new URLSearchParams({
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  response_type: 'code',
  scope: 'openid email profile',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

const authorizeUrl = `${import.meta.env.VITE_KEYCLOAK_ISSUER}/protocol/openid-connect/auth?${params}`;

// 4. Redirect to Keycloak
window.location.href = authorizeUrl;
```

### Handling Callback

```typescript
// /auth/callback route handler
async function handleKeycloakCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  
  if (error) {
    // Handle error (access_denied, invalid_scope, etc.)
    console.error('Keycloak error:', error);
    return;
  }
  
  if (!code) {
    console.error('No authorization code received');
    return;
  }
  
  // Retrieve stored code_verifier
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  if (!codeVerifier) {
    console.error('PKCE verifier not found');
    return;
  }
  
  // Exchange code for tokens via backend
  const response = await fetch('/api/v1/auth/keycloak_exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: `${window.location.origin}/auth/callback`
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    // Store Evo tokens (access_token, refresh_token)
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    
    // Clear PKCE verifier
    sessionStorage.removeItem('pkce_code_verifier');
    
    // Redirect to app
    window.location.href = '/dashboard';
  } else {
    console.error('Token exchange failed:', await response.json());
  }
}
```

## Logout Flow

### Frontend Logout

```typescript
async function logout() {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    }
  });
  
  const data = await response.json();
  
  // Clear local tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // If Keycloak logout URL is provided, redirect to it
  if (data.data.keycloak_logout_url) {
    window.location.href = data.data.keycloak_logout_url;
  } else {
    window.location.href = '/login';
  }
}
```

The Keycloak logout URL will:
1. Terminate the Keycloak session
2. Clear the Keycloak cookie
3. Redirect back to the specified `post_logout_redirect_uri`

## API Integration

### Keycloak Exchange Endpoint

**Endpoint**: `POST /api/v1/auth/keycloak_exchange`

**Request**:
```json
{
  "code": "authorization_code_from_keycloak",
  "code_verifier": "pkce_code_verifier",
  "redirect_uri": "http://localhost:5173/auth/callback"
}
```

**Success Response**:
```json
{
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    },
    "access_token": "evo_access_token",
    "refresh_token": "evo_refresh_token",
    "expires_in": 7200,
    "token_type": "Bearer"
  },
  "message": "Login successful"
}
```

### Error Handling

| Error Code | Description | Action |
|------------|-------------|--------|
| `KEYCLOAK_NOT_CONFIGURED` | Backend Keycloak not enabled | Check backend configuration |
| `MISSING_TOKEN` | No code or token provided | Ensure PKCE flow completed |
| `TOKEN_EXCHANGE_FAILED` | Code exchange with Keycloak failed | Check client configuration |
| `INVALID_TOKEN` | Token validation failed | Token expired or invalid |
| `VALIDATION_ERROR` | User creation failed | Check user data requirements |

## Component Example

### KeycloakLoginButton.vue

```vue
<template>
  <button @click="loginWithKeycloak" :disabled="loading">
    {{ loading ? 'Redirecting...' : 'Login with Keycloak' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);

async function loginWithKeycloak() {
  if (!import.meta.env.VITE_KEYCLOAK_ENABLED) {
    console.error('Keycloak is not enabled');
    return;
  }
  
  loading.value = true;
  
  try {
    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store verifier for callback
    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    
    // Build and redirect to Keycloak
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    window.location.href = `${import.meta.env.VITE_KEYCLOAK_ISSUER}/protocol/openid-connect/auth?${params}`;
  } catch (error) {
    console.error('Login initiation failed:', error);
    loading.value = false;
  }
}

// PKCE utilities
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64URLEncode(digest);
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
</script>
```

### AuthCallback.vue

```vue
<template>
  <div class="callback-container">
    <p v-if="error">{{ error }}</p>
    <p v-else>Processing login...</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const error = ref(null);

onMounted(async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      throw new Error(`Keycloak error: ${errorParam}`);
    }
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      throw new Error('PKCE verifier not found');
    }
    
    const response = await fetch('/api/v1/auth/keycloak_exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: window.location.origin + window.location.pathname
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Token exchange failed');
    }
    
    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    
    // Clear PKCE data
    sessionStorage.removeItem('pkce_code_verifier');
    
    // Redirect to dashboard
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message;
    console.error('Authentication failed:', err);
  }
});
</script>
```

## Configuration

### Environment Setup

```env
# .env.development
VITE_KEYCLOAK_ENABLED=true
VITE_KEYCLOAK_ISSUER=http://localhost:8080/realms/organization
VITE_KEYCLOAK_CLIENT_ID=evo-frontend-client

# .env.production
VITE_KEYCLOAK_ENABLED=true
VITE_KEYCLOAK_ISSUER=https://keycloak.example.com/realms/organization
VITE_KEYCLOAK_CLIENT_ID=evo-frontend-client
```

### Route Configuration

```typescript
// router/index.ts
const routes = [
  {
    path: '/auth/callback',
    name: 'KeycloakCallback',
    component: () => import('@/views/AuthCallback.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  }
];
```

## Security Considerations

1. **PKCE Required**: Always use PKCE for public clients
2. **Store code_verifier in sessionStorage**: Cleared when tab closes, safer than localStorage
3. **Clear sensitive data**: Remove `code_verifier` after successful exchange
4. **Validate state**: Consider adding `state` parameter for CSRF protection
5. **HTTPS in production**: Never use HTTP in production environments

## Troubleshooting

### Common Issues

**PKCE Verification Failed**
- Ensure `code_challenge_method` is exactly `S256`
- Verify `code_verifier` matches the generated challenge
- Check that `code_verifier` is URL-safe base64 encoded

**Invalid Client**
- Verify `VITE_KEYCLOAK_CLIENT_ID` matches Keycloak configuration
- Ensure client is public (not confidential)
- Check redirect URI matches exactly in Keycloak

**CORS Errors**
- Add frontend origin to Keycloak client's "Web Origins"
- Use `+` in Keycloak to allow all subdomains

**Token Exchange 502 Error**
- Backend cannot reach Keycloak
- Check `KEYCLOAK_INTERNAL_URL` configuration
- Verify network connectivity between services

