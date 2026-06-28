// Catalog of OAuth integrations the superadmin can configure (clientId + clientSecret).
//
// `configType` is the CRM app_config bucket (`/admin/app_configs/:configType`).
// `clientIdKey` / `clientSecretKey` are the exact env-key names persisted in that
// bucket and read by the processor at OAuth-flow time — keep them in sync with the
// processor (see B2 spec §3, naming reconciliation).
//
// Each `key` must have a matching i18n block under `integrations.<key>` in every
// locale's `adminSettings.json` (cardTitle, fields, placeholders, saveSuccess, saveError).

export interface IntegrationDef {
  key: string;
  configType: string;
  clientIdKey: string;
  clientSecretKey: string;
}

export const INTEGRATIONS: IntegrationDef[] = [
  { key: 'linear', configType: 'linear', clientIdKey: 'LINEAR_CLIENT_ID', clientSecretKey: 'LINEAR_CLIENT_SECRET' },
  // hubspot here = CRM-native HubSpot integration (HUBSPOT_CLIENT_ID). The agent/MCP
  // HubSpot OAuth flow uses a DIFFERENT key (HUBSPOT_OAUTH_CLIENT_ID) and is out of
  // scope for this screen — do not "reconcile" these two; they are distinct flows.
  { key: 'hubspot', configType: 'hubspot', clientIdKey: 'HUBSPOT_CLIENT_ID', clientSecretKey: 'HUBSPOT_CLIENT_SECRET' },
  // shopify & slack: kept for back-compat, but they have NO processor route and
  // NO CRM credentials_controller — configuring them is currently a no-op (orphans).
  { key: 'shopify', configType: 'shopify', clientIdKey: 'SHOPIFY_CLIENT_ID', clientSecretKey: 'SHOPIFY_CLIENT_SECRET' },
  { key: 'slack', configType: 'slack', clientIdKey: 'SLACK_CLIENT_ID', clientSecretKey: 'SLACK_CLIENT_SECRET' },
  { key: 'github', configType: 'github', clientIdKey: 'GITHUB_OAUTH_CLIENT_ID', clientSecretKey: 'GITHUB_OAUTH_CLIENT_SECRET' },
  { key: 'notion', configType: 'notion', clientIdKey: 'NOTION_OAUTH_CLIENT_ID', clientSecretKey: 'NOTION_OAUTH_CLIENT_SECRET' },
  { key: 'asana', configType: 'asana', clientIdKey: 'ASANA_OAUTH_CLIENT_ID', clientSecretKey: 'ASANA_OAUTH_CLIENT_SECRET' },
  { key: 'canva', configType: 'canva', clientIdKey: 'CANVA_OAUTH_CLIENT_ID', clientSecretKey: 'CANVA_OAUTH_CLIENT_SECRET' },
  { key: 'google_calendar', configType: 'google_calendar', clientIdKey: 'GOOGLE_CALENDAR_CLIENT_ID', clientSecretKey: 'GOOGLE_CALENDAR_CLIENT_SECRET' },
  { key: 'google_sheets', configType: 'google_sheets', clientIdKey: 'GOOGLE_SHEETS_CLIENT_ID', clientSecretKey: 'GOOGLE_SHEETS_CLIENT_SECRET' },
  { key: 'monday', configType: 'monday', clientIdKey: 'MONDAY_OAUTH_CLIENT_ID', clientSecretKey: 'MONDAY_OAUTH_CLIENT_SECRET' },
  { key: 'paypal', configType: 'paypal', clientIdKey: 'PAYPAL_OAUTH_CLIENT_ID', clientSecretKey: 'PAYPAL_OAUTH_CLIENT_SECRET' },
  { key: 'atlassian', configType: 'atlassian', clientIdKey: 'ATLASSIAN_OAUTH_CLIENT_ID', clientSecretKey: 'ATLASSIAN_OAUTH_CLIENT_SECRET' },
  // Intentionally excluded:
  //  - stripe:   no CRM credentials_controller and no processor OAuth route (not wired).
  //  - supabase: OAuth via dynamic discovery — no client_id/secret to configure.
];
