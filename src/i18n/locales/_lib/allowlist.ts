/**
 * Anti-leakage allowlist (EVO-1430).
 *
 * Values that are legitimately byte-identical between EN and pt-BR: brand and
 * product names, technical acronyms, protocol/field-label identifiers used
 * as-is in Brazilian Portuguese, and sample literals. Structurally
 * non-translatable values (URLs, numbers, JSON blobs, "Ex: ..." samples) are
 * handled by `isIgnorableValue` and do NOT need an entry here.
 *
 * Split into a shared `COMMON_ALLOWED` set and `PER_FILE_ALLOWED` overrides for
 * values that are only legitimate inside a specific locale file.
 */

export const COMMON_ALLOWED = new Set<string>([
  // --- bare tech terms / acronyms (carried over from EVO-1260) ---
  'Webhook', 'Webhooks', 'JSON', 'URL', 'URI', 'Auth', 'API', 'HTTP', 'HTTPS',
  'OAuth', 'Bearer', 'Token', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'UUID',
  'UTC', 'SLA', 'CRM', 'ID', 'Trigger', 'Triggers', 'Tag', 'Tags', 'Status',
  'Timeout', 'Headers', 'Header', 'Timestamp', 'XML', 'Total', 'Logs',
  'Form Data', 'Pipeline', 'Pipelines', 'Content-Type', 'X-API-Key',
  // --- units / time ---
  'min', 'h', 'd', 's', 'ms', 'B', 'KB', 'MB', 'GB',
  // --- data-type / generic tech nouns kept as loanwords in pt-BR ---
  'Array', 'Buffer', 'String', 'Checkbox', 'Regex', 'Script', 'CSV', 'PDF',
  'SKU', 'Labels', 'Link', 'Login', 'Loop', 'Macros', 'Manual', 'Marketing',
  'Notification', 'Payload', 'Performance', 'Placeholder', 'Plain', 'Preview',
  'Provider', 'Sandbox', 'Scopes', 'Sidebar', 'Studio', 'Timeline', 'Timezone',
  'Web', 'Website', 'Inbox', 'Interface', 'Item', 'Dashboard', 'Canvas',
  'Cards', 'Custom', 'Digital', 'Endpoint', 'SMTP', 'IMAP/SMTP', 'CRAM-MD5',
  'UUID/Token', 'Chat', 'Bot', 'Bell', 'Magic', 'Follow-up', 'Latest', 'Lead',
  'Legacy', 'Online', 'Offline', 'Sandbox',
  // --- colon-suffixed field labels ---
  'Email', 'Email:', 'ID:', 'Inbox:', 'Status:', 'Tags:', 'Workspace:',
  // --- tone / enum labels identical by design ---
  'FORMAL', 'NORMAL',
  // --- single-letter / abbreviation fallbacks ---
  'U', 'N/A', 'NA',
  // --- loanwords / cognates legitimately identical in pt-BR ---
  'Popular', 'Templates', 'leads', 'total', 'timeout', 'default', 'production',
  'Argentina', 'Ding',
  // --- tech field labels (with required-marker asterisk / interpolation) ---
  'URL *', 'Email *', 'Website URL', '+{{count}}', 'Tags ({{count}})',
  // --- masked / sample credential literals (no trailing ellipsis) ---
  'AKIAIOSFODNN7EXAMPLE', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  // --- brand & product names ---
  'WhatsApp', 'WhatsApp Cloud', 'WhatsApp Business', 'Telegram', 'Telegram Bot',
  'Instagram', 'Facebook', 'Facebook Messenger', 'Messenger', 'Twilio',
  'Twilio SMS', 'Evolution', 'Evolution API', 'Evolution API V2', 'Evolution Go',
  'Evolution Go API', 'Evo Hub', 'Evo CRM', 'EvoAI', 'Dialogflow', 'Dify',
  'Flowise', 'Typebot', 'Rasa', 'N8N', 'CSML', 'OpenAI', 'Azure OpenAI',
  'Anthropic', 'Cohere', 'Groq', 'Mistral AI', 'Google', 'Google Translate',
  'Google Calendar', 'Google Sheets', 'Gmail', 'Slack', 'HubSpot', 'GitHub',
  'Notion', 'Stripe', 'PayPal', 'Shopify', 'Linear', 'Canva', 'Monday.com',
  'Atlassian', 'Asana', 'Supabase', 'Microsoft Azure', 'Microsoft / Azure',
  'Amazon S3', 'Z-API', 'Notificame', 'Bandwidth', 'BMS', 'LeadSquared',
  'Marketplace', 'Live Chat', 'LINE', 'LinkedIn', 'Twitter', 'Outlook',
  'Mailgun', 'Mandrill', 'Resend', 'SendGrid', 'Chime', 'SMS', 'Word', 'Excel',
  'A2A', 'Agent-to-Agent', 'LLM', 'Workflow', 'Task',
  // --- protocol / integration field-label identifiers (cross-file) ---
  'Client ID', 'Client Secret', 'Client Token', 'Redirect URI',
  'Redirect URI (MCP)', 'MCP Redirect URI', 'Callback URL', 'App ID',
  'App Secret', 'API Key', 'API Key *', 'API Key SID', 'API Key Secret',
  'API Token', 'API Secret', 'API URL', 'API Version', 'Access Key',
  'Access Token', 'Secret Key', 'Endpoint URL', 'Webhook URL',
  'Webhook Verify Token', 'Account SID', 'Account ID', 'Account ID:',
  'Auth Token', 'Bearer Token', 'Bearer Token *', 'Instance ID',
  'Instance Token', 'Phone Number ID', 'Business Account ID', 'WABA ID',
  'Config ID', 'Verify Token', 'Admin Token', 'Messaging Service SID',
  'Application ID', 'Project ID', 'Project ID *', 'GCP Project ID',
  'Space ID', 'Assistant ID', 'Assistant ID *', 'Pub/Sub Topic',
  'Headers HTTP', 'Headers HTTP (JSON)', 'Basic Auth', 'Templates JSON',
  'Bot:', 'Chat API', 'SSE (Server-Sent Events)',
  // --- AI-provider model/config labels kept as-is ---
  'Top P', 'Max Tokens', 'Model', 'Model *', 'Chat Bot', 'Text Generator',
  'Assistant API', 'Chat Completion API',
  // --- sample / masked literals with letters (not caught structurally) ---
  'gpt-4o', 'us-east-1', 'v18.0', 'gmail-topic', 'sms-bandwidth',
  'imap.gmail.com', 'smtp.gmail.com', 'reply.example.com', 'abc123xyz',
  'v{{version}}', '{{size}} KB', '{{seconds}}s',
  // --- language autonyms (shown in their own language regardless of UI locale) ---
  'English', 'Español', 'Français', 'Italiano', 'Português', 'Português (BR)',
  // --- EN file authored with Portuguese values (out-of-scope to fix EN) ---
  'Nome', 'Valor', 'ou', 'Ver IDs',
]);

export const PER_FILE_ALLOWED: Record<string, Set<string>> = {
  'adminSettings.json': new Set([
    'Frontend Runtime', 'Google OAuth', 'Relay (Exim / Postfix / Qmail)',
  ]),
  'aiAgents.json': new Set([
    // kept as a product term — surrounding pt-BR copy embeds "Knowledge Base"
    'Knowledge Base', 'Knowledge space', 'Space ID', 'Timeout (s)',
  ]),
  'channels.json': new Set([
    'WhatsApp Business API (Cloud)', 'Twilio WhatsApp Business API', 'Twilio SMS',
    'Brasília (GMT-3)', 'Acre (GMT-5)', 'Manaus (GMT-4)',
    'Fernando de Noronha (GMT-2)', 'Paris (GMT+1)',
    'Bot via webhook', 'Total: {{count}}',
  ]),
  'chat.json': new Set([
    '🤖 Bot', 'WhatsApp Business', 'Twilio SMS', 'Inbox ID:', 'Account ID:',
    '📎 {{fileType}}',
  ]),
  'campaigns.json': new Set(['Inbox - {{channel}}']),
  'contacts.json': new Set([
    'Twilio SMS', '+{{count}} pipeline', '+{{count}} pipelines',
    '{{days}}d {{hours}}h', '{{hours}}h {{minutes}}m', '{{minutes}}m {{seconds}}s',
  ]),
  'customMcpServers.json': new Set([
    'Timeout: {{timeout}}s', 'api, search, database',
  ]),
  'customTools.json': new Set(['api, http, webhook']),
  'integrations.json': new Set([
    'BMS (Brius Message System)', 'BMS Email Provider', 'BMS API Key',
    'Google Cloud Project ID', 'Gmail Pub/Sub Topic', 'Google OAuth (Gmail)',
    'read:conversations write:messages', 'Webhook Verify Token',
    // brand-prefixed technical field labels kept as-is in pt-BR
    'App URL', 'OpenAI API URL', 'OpenAI API Key', 'OpenAI Model',
    'Slack Client ID', 'Slack Client Secret', 'Facebook API Version',
    'WhatsApp App ID', 'WhatsApp Config ID', 'WhatsApp API Version',
    'Instagram App ID', 'Instagram App Secret', 'Instagram Verify Token',
    'Instagram API Version', 'Evolution API URL', 'Evolution Admin Token',
    'Evolution Go API URL', 'Evolution Go Admin Token', 'Shopify Client ID',
    'Shopify Client Secret', 'Google Client ID', 'Google Client Secret',
    'Google Calendar Client ID', 'Google Calendar Client Secret',
    'Google Sheets Client ID', 'Google Sheets Client Secret', 'Azure App ID',
    'Azure App Secret', 'HubSpot Client ID', 'HubSpot Client Secret',
    'GitHub Client ID', 'GitHub Client Secret', 'Notion Client ID',
    'Notion Client Secret', 'Stripe Client ID', 'Stripe Client Secret',
    'PayPal Client ID', 'PayPal Client Secret',
  ]),
  'marketplace.json': new Set([
    'AI Assistant Agent', 'Customer Support Bot', 'Data Analysis Agent',
  ]),
  'pipelines.json': new Set(['Euro (EUR)']),
  'crmForms.json': new Set([
    'Leads', 'Leads — {{name}}', 'E-mail', 'Pipeline…', 'pipeline…', 'key', 'label',
  ]),
  'chatPages.json': new Set([
    'Widget', 'Web widget',
  ]),
  'profile.json': new Set(['Enter (↵)', 'Cmd + Enter (⌘ + ↵)']),
  'sms.json': new Set([
    'SMS via {{provider}}', 'SMS {{provider}}', 'Account SID', 'Auth Token',
    'SMS Bandwidth',
  ]),
  'whatsapp.json': new Set([
    'WhatsApp Cloud', 'Evolution API', 'Evolution API V2', 'Evolution Go',
    'Evolution Go API', 'WhatsApp via Notificame', 'WhatsApp via Z-API',
    'WhatsApp via Twilio', 'Account SID', 'Auth Token',
    // EN value authored in pt-BR at this key (out-of-scope to fix EN)
    'Use o Facebook Embedded Signup para configurar automaticamente seu canal WhatsApp.',
  ]),
};

/** Allowed-identical set for a given locale file (common ∪ per-file). */
export function allowedFor(file: string): Set<string> {
  const perFile = PER_FILE_ALLOWED[file];
  if (!perFile) return COMMON_ALLOWED;
  return new Set([...COMMON_ALLOWED, ...perFile]);
}
