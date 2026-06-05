# i18n pt-BR vs EN — Baseline Snapshot (EVO-1430)

Snapshot taken at the start of the EVO-1430 sweep. Counts the pt-BR values that were **byte-identical to EN** after excluding structurally non-translatable values (URLs, numbers, JSON blobs, `Ex:` samples, masked literals).

- **Candidates** = pt-BR === EN and not structurally ignorable (potential English leakage).
- **Prose** = subset of candidates with 2+ tokens (highest-signal real leaks; single-token candidates are mostly brand/tech terms now in the allowlist).

After the sweep + allowlist curation, the enforced leak count is **0** across all files (see `i18n-parity.spec.ts`). This table is the historical "before" for prioritization and progress tracking.

| File | String keys (pt&en) | Candidates | Prose |
|---|---:|---:|---:|
| `integrations.json` | 881 | 127 | 86 |
| `channels.json` | 1078 | 70 | 15 |
| `aiAgents.json` | 1208 | 54 | 18 |
| `journey.json` | 1421 | 51 | 12 |
| `contacts.json` | 491 | 41 | 3 |
| `whatsapp.json` | 273 | 40 | 29 |
| `adminSettings.json` | 325 | 36 | 9 |
| `chat.json` | 625 | 32 | 6 |
| `pipelines.json` | 604 | 21 | 2 |
| `sms.json` | 71 | 17 | 12 |
| `customMcpServers.json` | 131 | 12 | 4 |
| `profile.json` | 225 | 12 | 2 |
| `segments.json` | 283 | 11 | 1 |
| `customTools.json` | 122 | 10 | 3 |
| `users.json` | 147 | 10 | 1 |
| `apiKeys.json` | 45 | 8 | 2 |
| `auth.json` | 127 | 8 | 1 |
| `campaigns.json` | 248 | 7 | 1 |
| `layout.json` | 84 | 7 | 1 |
| `automation.json` | 184 | 6 | 0 |
| `customAttributes.json` | 153 | 6 | 0 |
| `marketplace.json` | 23 | 6 | 3 |
| `onboarding.json` | 43 | 6 | 0 |
| `products.json` | 87 | 6 | 0 |
| `email.json` | 39 | 5 | 0 |
| `teams.json` | 125 | 5 | 0 |
| `agents.json` | 127 | 4 | 0 |
| `attachments.json` | 26 | 4 | 0 |
| `customerDashboard.json` | 120 | 3 | 0 |
| `macros.json` | 90 | 3 | 0 |
| `setup.json` | 35 | 3 | 0 |
| `telegram.json` | 38 | 3 | 1 |
| `templates.json` | 62 | 3 | 0 |
| `tools.json` | 44 | 3 | 1 |
| `webWidget.json` | 45 | 3 | 1 |
| `widget.json` | 99 | 3 | 0 |
| `api.json` | 19 | 2 | 1 |
| `documentation.json` | 53 | 2 | 1 |
| `mcpServers.json` | 88 | 2 | 1 |
| `messenger.json` | 42 | 2 | 0 |
| `events.json` | 22 | 1 | 0 |
| `instagram.json` | 50 | 1 | 0 |
| `tours.json` | 222 | 1 | 0 |
| `accessTokens.json` | 88 | 0 | 0 |
| `accountSettings.json` | 58 | 0 | 0 |
| `cannedResponses.json` | 70 | 0 | 0 |
| `changePassword.json` | 12 | 0 | 0 |
| `common.json` | 109 | 0 | 0 |
| `customerMcpServers.json` | 14 | 0 | 0 |
| `labels.json` | 70 | 0 | 0 |
| `notFound.json` | 3 | 0 | 0 |
| `oauth.json` | 60 | 0 | 0 |
| `roles.json` | 54 | 0 | 0 |
| `tutorials.json` | 2 | 0 | 0 |
| `unauthorized.json` | 8 | 0 | 0 |
| **TOTAL** | **10773** | **657** | **217** |

Files audited: 55 | Files with ≥1 candidate: 43 | Clean: 12
