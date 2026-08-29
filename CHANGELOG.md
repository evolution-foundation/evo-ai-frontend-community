# Changelog

All notable changes to **evo-ai-frontend-community** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- N/A

### Changed

- N/A

### Fixed

- N/A

## [v1.0.0-rc6] - 2026-07-04

Largest release candidate so far — 125 non-merge commits on top of rc5. Four main themes: **(1) Message Templates end-to-end** — a unified global Message Templates screen, template mode on the Send Message journey node, and template pickers for inbox greeting/out-of-office; **(2) Journey/Flow builder maturity** — a pre-activation validation framework, a structured webhook body builder, six new pipeline-oriented nodes/triggers, a committed node-type manifest as the cross-repo parity source, and a batch of persistence/validation fixes; **(3) chat & channels overhaul** — redesigned conversation list with numeric unread badges, a channel hub with real live connectivity, and a full-width composer with mobile polish and a "Return to bot" action; and **(4) feature breadth** — Lead Capture UI, contact PII masking, products CSV import, Segments canvas builder, advanced list filters, and RBAC gating on agent management. Deploy-wise, the build now consumes `VITE_EVOFLOW_API_URL` and the entrypoint extends the CSP for plain-http installs.

### Added

- **EVO-1907 — Unified global Message Templates screen** (#221) — template management consolidated into a single global screen reusing the per-channel components, replacing the split channel-scoped flows. Follow-up **EVO-1971** (#222) reintroduced example/source fields and fixed i18n/parity of the global template.
- **EVO-1233 / EVO-1716 — Global message template menu on a dedicated flat endpoint** (#153, #157, #158) — global template menu in the composer, repointed to the new flat message-templates endpoint (stale `channel_id` filter docs dropped).
- **EVO-1235 / EVO-1255 / EVO-1267 — Template mode on the Send Message journey node** (#156, #154, #155) — Send Message node config gains a template mode: the composer sends `message_template_id`, and template variables can be mapped to variable sources directly in the node config.
- **EVO-1760 — Template pickers for inbox greeting and out-of-office** (#165) — inbox settings can now pick a global template instead of free text for greeting and out-of-office messages.
- **EVO-1744 — Journey pre-activation validation framework** (#180) — structured validation runs before a journey can be activated, surfacing per-node errors and warnings. Includes warnings for flows with no path to an exit node (**EVO-1692**, #160) and for no-exit cycles (**EVO-1857**, #189).
- **EVO-1742 — Structured webhook body builder** (#178) — the Webhook node body is now built field-by-field with variable pickers instead of a raw JSON textarea.
- **Six pipeline nodes/triggers in the Journey builder** — Create Pipeline Task node (**EVO-1273**, #149), Move to Pipeline Stage node (**EVO-1272**, #148), Assign to Pipeline action node (**EVO-1265**, #119), Send Canned Response action node (**EVO-1257**, #136), pipeline-stage condition in the Conditional node (**EVO-1256**, #132), and Pipeline Stage Changed trigger variant (**EVO-1266**, #125).
- **EVO-1634 — Journey node-type manifest committed as the cross-repo parity source** (#140) — canonical manifest of node types consumed by parity checks against the backend; **EVO-1935** (#199) added the pipeline nodes to the manifest.
- **EVO-1960 — Conversation-list overhaul** (#223) — redesigned conversation list (rolls up 4 related cards), plus numeric unread badges on the conversation list and sidebar menu (**EVO-1550**, #137).
- **EVO-1674 / EVO-1554 — Channel hub with real live connectivity** (#152, #145) — new channel overview hub, now showing real per-inbox connectivity status instead of derived-only state.
- **EVO-1884 — Full-width composer input with action row below** (#187) — composer redesigned for more writing room; mobile back gesture deselects the conversation. Mobile chat polish and contact drawer declutter (**EVO-1782**, #169) and mobile-usable data tables with horizontal scroll + dvh shell height (**EVO-1869**, #186).
- **EVO-1680 — "Return to bot" action** (#219) — conversation dropdown gains a button to hand a human-assigned conversation back to the bot.
- **EVO-1771 — CRM Lead Capture UI** (#171) — form and chat lead-capture builders plus public capture pages.
- **EVO-1551 — Visual masking of contact PII** (#147) — phone, email, and WhatsApp identifier masked on five render sites (chat sidebar, chat header, contact card, contacts table, contact details). Controlled by new `account.settings.mask_contact_pii` toggle in Account Settings (default OFF). Admin users always see full data; non-admin users see masked values with a `Lock` icon affordance, tooltip, and clipboard receiving the masked string. i18n added in 6 locales. Frontend-only feature — the API still returns full values.
- **EVO-1734 — Products CSV bulk import UI** (#163) — import products in bulk from a CSV file, with mapping and validation feedback.
- **EVO-1247 — Segments drag-drop canvas builder + preview** (#114) — visual segment building on a canvas, with direct segment calls routed through the CRM proxy (**EVO-1569**, #115).
- **EVO-1952 / EVO-1953 — Advanced list filters wired end-to-end** (#216, #217) — the Agents, Custom Tools, and Custom MCP Servers lists gain functional advanced filters; filter chip rendering and operator i18n centralized, with non-functional filters hidden (**EVO-1937**, #207).
- **EVO-1938 — RBAC gating on agent management** (#220) — the Atendentes (agents) screen is gated on `users.manage`, and the permission cache is cleared on logout.
- **EVO-1790 — Custom Tools redesigned as a 6-step wizard with edit support** (#191).
- **Setup wizard — "Your brand" step** — the install wizard gains a branding step.
- **CI — per-PR image builds** (EVO-1998) — every internal PR now builds a `:pr-N` (+ `:sha`) image for the review environment.

### Changed

- **Integrations screen reorganized** (#203) — OAuth and reCAPTCHA/Clarity grouped under Integrations, e-mail configuration moved to Channels, and the screen redesigned as a card directory. (The change was reverted and reapplied during the cycle; the final state is the reorganized card directory.)
- **EVO-1906 — `VITE_EVOFLOW_API_URL` injected into the frontend Docker build** (#193) — the EvoFlow API base URL is now a first-class build-time environment variable instead of being derived at runtime. See Upgrade notes.
- **EVO-1961 — Entrypoint extends CSP for plain-http origins** — `img-src`/`media-src` in the runtime-patched CSP now allow plain-http media origins, so installs without TLS (e.g. LAN/IP-based) can render media.
- **EVO-1855 — Polished variable/expression pickers in the Journey builder** (#185).

### Fixed

- **Journey persistence/validation fixes** — Update Custom Attribute node persists its value by `attribute_key` (**EVO-1850**, #181) and its validator checks `attributeName` (**EVO-1905**, #197); Create Pipeline Task writes `task_type` and `due_date` in the backend format (**EVO-1903**, #195); exit-journey node gains a config panel with `exitReason` (**EVO-1904**, #196); `unreachableExit` restricted to real cycles instead of flagging linear chains (**EVO-1889**, #212); Conditional node keeps its `path-<id>` handles with legacy-flow regression coverage (**EVO-1902**, #194); removed an auto-persist effect that caused an infinite render loop in assign panels (**EVO-1945**, #204); manual trigger treated as conversation-indeterminate like webhook (**EVO-1946**, #205).
- **EVO-1939 — "Clear filters" resets global filters so the badge clears** (#214).
- **EVO-1974 — Theme-aware conversation-list scrollbar visible in light theme** (#224).
- **Composer — empty editor doc kept schema-valid** so the placeholder and focus survive send, with the wrapper focus-forward scoped to padding clicks only.
- **Flow Builder — editor mutations persisted to the store** (**EVO-1643**, #143) and canvas edge mutations propagated to the editor store (**EVO-1573**, #120).
- **Chat/list stability** — conversation-list pagination with the current query preserving totals (**EVO-1671**, #146), smooth scroll pagination (**EVO-1672**, #151), page prefetch before reaching the bottom (#134), and in-flight GET neutralized on unread-store reset (**EVO-1675**, #159).
- **EVO-1687 — Journeys, Campaigns and Segments re-exposed in the community sidebar** (#161).
- **EVO-1943 / EVO-1944 / EVO-1887 — Contacts fixes** (#200, #201, #202) — linked companies loaded on edit to prevent association wipe, pagination spacing + compact mobile toolbar, and a company-picker filter with a readable applied chip.
- **EVO-1681 — Audio transcription toggle persisted under account settings** (#177) and canned responses inserted correctly into the composer (**EVO-1685**, #173).

### Upgrade notes

- **New environment variable: `VITE_EVOFLOW_API_URL`** (EVO-1906) — the base URL of the EvoFlow API, consumed at **build time** by Vite and injected into the frontend Docker image build. Deployments that build their own image must pass it as a build arg; installs using the standard compose/swarm stacks get it from the stack configuration. Without it, Journey/Flow builder API calls fall back to the previous derivation and may point at the wrong host.
- **Plain-http installs** (EVO-1961) — the container entrypoint now extends the runtime-patched CSP so `img-src`/`media-src` accept `http:` media origins. No action needed; TLS installs are unaffected.
- The Journey node-type manifest (EVO-1634/EVO-1935) is the cross-repo parity source — backend node additions must land in the manifest to pass the parity check.

## [v1.0.0-rc5] - 2026-05-27

Hardening release on the frontend side of CRM Community rc5 — **"fresh-install hardening + EvoFlow expansion"**. Two main themes: **(1) EvoFlow event UI** — new shared `EventSelector` and `EventPropertiesForm` components that consume the event manifest, replacing hard-coded event lists in flow editor nodes; and **(2) notifications polish** — redesigned `NotificationItem` with sender name, avatar, message preview and locale-aware relative timestamps, plus WS update merge guards and reducer-level remove-on-read tests. Also rolls up small accessibility (WCAG AA contrast), i18n, and EvoFlow cleanup fixes, and an Evolution Hub UX improvement to link inboxes to existing Hub channels.

### Added

- **EVO-1261 — Shared `EventSelector` + `EventPropertiesForm` consuming event manifest** (#108) — new shared components that read the canonical event manifest instead of duplicating hard-coded event lists across flow editor nodes. Foundation for EvoFlow event configuration UI.
- **Evolution Hub — link inbox to existing Hub channel** — connect flow now allows operators to link an inbox to an already-existing Hub channel, instead of only creating a new one each time.
- **Notifications — redesigned `NotificationItem`** — notification row now shows sender name, avatar, message preview, and relative timestamp, replacing the previous minimal layout.

### Changed

- **Notifications — locale-aware relative time** — `NotificationItem` switched to `date-fns` locale-aware relative time helpers (and dropped unrelated storybook deps that had been pulled in by mistake).

### Fixed

- **Notifications — WS update merge guard + reducer tests** — guarded the WebSocket update merge path so concurrent updates do not produce inconsistent state, and added reducer tests covering the remove-on-read behavior.
- **Notifications — use `notification.sender` for name and avatar** in `NotificationItem` (the field was being read from the wrong source, causing missing/incorrect avatars).
- **EVO-1421 — Remove inert floating-panel wrapper and retire `BaseFlowPanel`** — the wrapper was rendered but inert (no click/keyboard interaction reached the panel); removed and the legacy `BaseFlowPanel` was retired now that consumers migrated.
- **EVO-1454 — `ConditionalNode` empty-state hint contrast bumped to `text-yellow-700` for WCAG AA** — previous shade did not meet AA contrast on the node background.
- **i18n — Spanish accent in `channel_message` key + double blank line cleanup** — corrected the Spanish translation accent and removed a stray double blank line in the same locale file.
- **Build — sync `package-lock.json` and exclude `.stories.tsx` from `tsc -b`** — the `@tanstack/react-virtual` dep was added to `package.json` without updating the lock file, breaking `npm ci` in the Docker build; storybook devDependencies were removed but `.stories.tsx` files remained, causing `tsc -b` to fail on missing `@storybook/react-vite`. Lock file was regenerated against Node 20 (the CI/Dockerfile target) and `*.stories.{ts,tsx}` are now excluded from `tsconfig.app.json`. Stories were not part of the production bundle anyway.

### Upgrade notes

- `EventSelector` / `EventPropertiesForm` are drop-in shared components for flow editor nodes — they read the event manifest at runtime, so adding/removing events on the backend side no longer requires touching the frontend node code.
- The retired `BaseFlowPanel` (EVO-1421) had no remaining consumers at the time of removal; if a downstream fork still imports it, migrate to the per-panel components directly.

## [v1.0.0-rc4] - 2026-05-25

Three main themes: **(1) Evolution Hub** — admin configuration page plus `HubConnectButton` that lets operators connect Meta channels through the Hub proxy; **(2) Typebot interactive buttons** — `choice` blocks now render as clickable button lists in the main chat and the widget; and **(3) groundwork for upcoming features** — internal preparation of a new flow editor with atomic autosave, exponential-backoff retry, IndexedDB recovery, explicit state machine, and a new shared `NodeConfigModal` component (3 variants, ~20 node modals migrated). Also rolls up several chat fixes (sidebar scroll, conversation count, loadMore race condition), contact sidebar, and a menu cleanup that hides in-development entries.

### Added

- **Evolution Hub admin page + `HubConnectButton`** (tasks 25-30) — full configuration UI for Evolution Hub (URL, API key, webhook secret with `crypto.getRandomValues` generator) and a connect button for Meta channels through the Hub proxy. Paired with the webhook receiver in `evo-ai-crm-community` and the `evolution_hub` config type in `adminConfigService`.
- **Typebot interactive buttons in chat and widget** — Typebot `choice` blocks render as interactive button lists instead of plain text. Paired with `evo-ai-processor-community` (#12) and `evo-ai-crm-community`.
- **EVO-1088 — Real macro execution result in the UI** (#89) — the UI used to show "running…" / "ok" without reflecting the real result. It now displays the success/failure/error message persisted by the backend.
- **EVO-1264 — `NodeConfigModal`** — shared component with 3 variants (simple / medium / tabbed). Migrates ~20 node configuration modals to the new component for visual consistency. Includes Storybook coverage (3 stories) plus a design-system cross-reference. Preparation for an upcoming flow-editor refactor.
- **EVO-1269 — `JourneyEditorHeader` shared component** — 3-zone header with Storybook stories, README, and integration tests. Preparation for an upcoming feature that is not yet user-facing.
- **EVO-1258 — `useFlowEditorStore` (state machine + IndexedDB recovery)** — new flow-editor store with explicit state machine, IndexedDB local persistence, atomic autosave, exponential-backoff retry capped at 3 attempts, unsaved-changes guard, and `acceptRecovery` flow. **Preparation for an upcoming feature — not user-facing in this release.**

### Changed

- **Sidebar menu — hide in-development entries** — menu entries that pointed at areas still under preparation have been removed from the sidebar. Underlying routes remain in the app; only menu visibility was adjusted.
- **EVO-1274 — `useRelativeTime` cadence coarsened** — adaptive cadence (30s / 60s / 10min) instead of a fixed 1s tick. Reduces re-renders in conversations with many messages.
- **EVO-1254 — Natural-language `lastSaved` indicator** — replaced raw HH:MM:SS with "2 minutes ago" / "just now" etc. Cadence aligned with `useRelativeTime`.

### Fixed

- **EVO-1258 / EVO-1269 — groundwork-editor review and QA fixes** — multiple review iterations applied to the upcoming-feature groundwork: hooks order, hoisting of `useRelativeTime`, recovery race condition, toast.success only on manual save (never on autosave), normalisation of volatile node fields before compare, retry cap, drop of `variables` from the store, memoisation of `flowData`, lint cleanup, second-pass Back affordance + unsaved-changes guard, replacement of `useBlocker` with a Browser-compatible local confirmation guard, client-side persistence of the last-saved timestamp.
- **EVO-1406 / EVO-1407 — `SessionsViewer` envelope unwrap + defensive stats guards** — the service returned `{success, data, meta}` but some call sites did not unwrap. Standardised across the relevant flows.
- **EVO-1405 — Contact sidebar fetches full contact data on open** — previously the sidebar showed partial data; it now triggers a full fetch when opened.
- **Chat — total conversation count from API** — the sidebar header showed the count of loaded conversations instead of the server total. Corrected.
- **Chat — loadMore race condition (auto-load cascade on slow networks)** — on slow networks, multiple `loadMore` calls fired in cascade. Guarded with a loading flag.
- **Chat — sidebar scroll / layout collapse** — fixes for layout collapsing and scroll jumping while paginating.
- **EVO-1258 — `BaseFlowCanvas.updateNode` side effects moved out of the `setNodes` updater** — side effects were running inside the reducer; moved to an appropriate `useEffect`.
- **EVO-1259 / EVO-1260 — internal audits on upcoming-feature surface** — node inventory audit and i18n audit on the upcoming flow-editor surface. Internal documentation work, not user-facing in this release.
- **`HubConnectButton` — drop `accountId`, use `/api/v1/inboxes`** — refactor to use the canonical inboxes endpoint, removing a dependency on `accountId` that does not exist in the single-account model.

### Upgrade notes

- Areas under preparation that were removed from the sidebar menu in this release do not affect data or APIs. Operators and end users do not need to take any action.
- The new shared components (`NodeConfigModal`, `JourneyEditorHeader`) are available for internal use only — no impact on existing features.

## [v1.0.0-rc3] - 2026-05-17

Stabilization release — focused on fixes for large-file upload, configuration polling, WebSocket reconnection, i18n, pagination scroll, global configuration banners, password flow, and media download. Also consolidates the open-core foundation via Plugin Host Runtime and `EXTENSION_POINTS.md` (4 declared categories), introduces a complete Roles & Permissions UI, products catalog, template bundles export/import, and several improvements to automation rules and pipelines.

### Added

- **Plugin Host Runtime (EVO-1379)** (#79) — frontend runtime that loads external plugins at runtime, with bundle isolation. Foundation for the Enterprise edition to inject features without forking.
- **EVO-1387 — `EXTENSION_POINTS.md` v2.1.0** (#81) — "Plugin host runtime" category added, formalizing the plugin contract.
- **EVO-1378 — Neutral extension points for open-core** (#78) — extension points declared without reference to Enterprise, keeping the document usable outside the closed context.
- **EVO-1284 — Initial `EXTENSION_POINTS.md`** (#76) — first version of the document with 4 declared categories.
- **EVO-1061 — Roles & Permissions admin UI** (#55) — complete admin page for roles and permissions: create, edit, delete custom roles, assign permissions granularly.
- **EVO-1189 — Delete contact** (#70) — functional contact deletion action from the contact detail page.
- **EVO-990 — Pipeline actions in the 3-dot menu + context menu** (#51) — pipeline actions accessible both via the `⋮` menu and via right-click on the card.
- **EVO-1058 — `attribute_changed` operator with From/To pickers** (#56) — automation rules gain an "attribute changed" operator with explicit before/after value selectors.
- **EVO-1011 — Bulk resolve conversations via checkbox** — multi-selection in the conversation list + bulk resolve action.
- **EVO-988 — Contact phone number in the conversation list and header** (#48) — phone number visible on the conversation card and on the chat header.
- **Templates UI (EVO-1116)** — Settings → Templates page with bundle export/import, clearer export wizard, locales pt/es/fr/it.
- **Knowledge Nexus retrieval tool in Agent Builder** — Nexus space selector integrated into the agent builder (via core-service backend proxy).
- **Roles UI — agents** — "Allow manage labels" toggle with persistence of `allow_manage_labels`.
- **Automation rules — logs panel** — execution logs panel for automation rules, with filters and per-execution detail.
- **Automation rules — canned responses + message templates** — support for these types in the action registry, with dynamic parameter handling.
- **Products catalog UI** — list, edit, variants, attach to agents, sales panel in the pipeline.
- **EVO-1051 — "Clear Configuration" button in Admin Settings** — the install operator can clear specific configurations directly from the UI.
- **Pipelines — `apply_label` action** — instead of a free-text field, now opens the label picker.

### Changed

- **EVO-1107 — Configuration tab — error states, cancel flags, a11y** — review feedback applied: error states handled, request-cancellation flags, accessibility improvements.
- **EVO-1085 — WebSocket reconnection** — active reconnection with success toast + background backoff. Previously a dropped connection stayed silent; now the user gets confirmation when back online.
- **EVO-1131 — File upload** (#65) — skip fetch+blob for large files; upload limit raised to 100MB.
- **EVO-1146 — i18n** — added 9+ missing keys across 6 locales.
- **EVO-1147 — Provider config polling** — `provider_config` removed from polling deps + Page Visibility API integrated (does not poll while the tab is in the background).
- **EVO-1044 — Per-field GlobalConfig fallback detection** (#71) — global configuration banner on Connection Settings now detects fallback field by field, not only on the whole document.
- **EVO-1106 / EVO-1132** — scroll preserved across pagination + download tests in `MessageFile`.
- **EVO-1059** — `AutomationCondition.values` expanded to a mixed array (no cast).
- **EVO-1063 — Password validation** — inline checklist + structured errors on user creation (consumes the structured 422 response from auth-service).
- **EVO-1053** — error gating, stale closure, helper extraction, and test coverage (review round 4).
- **Integrations** — configs normalized and improved error handling.
- **Docs** standardized for AutomaLead 2026 (README, LICENSE, NOTICE, TRADEMARKS).
- **Docs (org)** — GitHub URLs updated from `EvolutionAPI` to `evolution-foundation`.

### Fixed

#### Chat / Messages
- **EVO-1145 — Conversation match in `selection` and `lifecycle` reducers** — now matches by `id || uuid`, preventing state desync across identifiers.
- **Duplicate messages in chat + delete button color** — fixed the handler that added a duplicate entry to the local list.
- **EVO-1078 / EVO-1054 / EVO-1062 / EVO-1056** — multiple chat and auth bugs resolved in batch.

#### Configuration / Connection Settings
- **EVO-1107 — Configuration tab blank/slow load** — skeleton added + polling fixed.
- **EVO-1044 — Global config banner on Evolution Go/API Connection Settings** — banner did not appear in certain combinations.
- **EVO-1046 — `setupRequired=false` default when `/setup/status` errors** (#59) — previously a 5xx error on setup status blocked the entire app; now it falls back to "setup already done" behavior and lets the user attempt login.
- **EVO-1049 — Remove banner from the email config screen** (#64) — workaround banner dropped after the runtime fix in auth-service.
- **EVO-1048 — Collapsed sidebar** (#54) — submenu flyout and link tooltip now appear when the sidebar is collapsed.

#### Automation rules
- **Build break** — `MessageTemplateVariable` defined locally.
- **Menu** — automation item added and duplicate entry removed.
- **i18n** — unused language fields removed from automation localization.
- **`labels` condition** — restricted to `has`/`has-not` (dropped `is_present`).
- **`apply_label` action** — opens the label picker, not a text input.

#### Templates / Products
- **i18n templates** — locales pt/es/fr/it added (EVO-1116).
- **Products** — total count calculation fixed for pagination.
- **Export wizard** — removed unused import of `DialogDescription`.

#### Media / Download (EVO-999)
- **HIGH review findings** applied for the force-download fix.
- **Toast feedback on download fallbacks** in `MessageFile`.

#### Notificame / Contacts
- **EVO-986 — Verify response parsing** — correct response shape now being read.
- **EVO-1018 — Group contacts** — review feedback applied.
- **Removed contact-events trigger** that caused 404s.

#### Other
- **EVO-995 — Agent creation UX wizard** — review fixes applied.
- **EVO-1083 — `ContactHeader` presence** (#66) — wired to `availability_status` and `channel`.
- **i18n pt-BR** (#31) — missing keys in chat/channels/aiAgents/integrations/sms/whatsapp.
- **Lock file sync** — `package-lock.json` synced with new dependencies.

## [v1.0.0-rc2] - 2026-05-05

Stabilization release — fixes for user creation flows, team member management, axios session, and various UI refinements.

### Added

- **EVO-989 UI** — **"Automation" tab in the Edit Stage Modal** of the kanban: per-stage `trigger → action` rule configuration (label_added / status_changed / custom_attribute_updated → move_to_stage / assign_agent / apply_label). New `StageAutomationRules` component, with stable keys (`useState + generateKey()`), conditional rendering per trigger, i18n across 6 locales. (#41)
- **EVO-1007** — clicking a pipeline kanban card navigates to `/conversations/<uuid>`; cards without a conversation (lead / orphan) fall back to the edit modal. Drag-suppression preserved. Edit remains available via the `⋮` menu. (#40)
- **EVO-987** — inline label creation from the "Assign Label" modal. (#33)
- **EVO-1006** — search and filters added to the pipeline kanban. (#30)
- **Brand icons**: static brand images replaced with `@icons-pack/react-simple-icons`. (#25)
- **Tour**: new onboarding tour component. (#23)

### Fixed

- **Role select on the user creation form (issue #16)**: the dropdown opened but selecting an option did not update the form state. Fixed as a Select controlled from mount with `placeholder`, role deduplication via `useMemo`, fallback to `agent` / `account_owner` when system roles do not arrive, mandatory role validation, loading / error states, and an inline message for the field. (#28)
- **EVO-1000 — session being killed on business 401s**: the axios interceptor invalidated the session on any 401 (except `/unread_count`). Endpoints that mistakenly returned 401 for validation errors (e.g., team-member creation before the backend fix) logged the admin out. Now the session only terminates when `error.response.data.error.code` is one of `{UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED, MISSING_TOKEN, INVALID_CREDENTIALS, SESSION_EXPIRED}`. (#26)
- **EVO-1010 — team member management only allowed adding**: existing members had a `disabled` checkbox and the page never called the removal endpoint. Rewritten as a unified manage-members view (single `selectedIds` state with an initial snapshot; diff computed on save → `POST` adds + `DELETE` removes in parallel). Added the `addUsers.alreadyMemberBadge` badge and i18n across 6 locales (`en`, `pt-BR`, `pt`, `es`, `fr`, `it`). (#27)
- **EVO-996** — reply preview: HTML is stripped and a placeholder is rendered for non-text content. (#36)
- **EVO-997** — non-functional "delete contact" option removed from the contact actions menu. (#37)
- **EVO-977** — desktop push, bell empty state, audio unlock, and permission auto-request fixed (3 review rounds). Handles stale closures, audio unlock flag, SPA navigation, and denied permission state.
- **EVO-1012** — regression spec for contact avatar field priority. (#32)
- **WhatsApp groups**: sender name and media labels displayed correctly across the chat UI. (#34)
- **EVO-974** — `OR` operator wiring, fixes in `priority` / `assignee` rewrites, `Contact` filter added; toast when the `assignee=me` filter is dropped on an expired session.
- **EVO-1002** — no longer hides non-approved templates; the management table now shows the real Meta status.
- **EVO-1001** — account labels loaded as options in the conversation filter. (#24)
- **EVO-971** — fallback to the setup wizard when `/setup/status` is unreachable. (#22)

#### UX & icons (regression from the migration to `@icons-pack/react-simple-icons`)
PR #25 migrated from static PNGs to monochromatic SVGs from `@icons-pack/react-simple-icons`, but lost brand color and introduced several visual issues. Fixed in sequence:
- **Official brand colors restored**: `BrandIcon.tsx` now applies the official color via a new `getBrandColor()` helper (map with hex for each brand). `ChannelIcon`, `MCPCard`, `IntegrationCard`, and `IntegrationsSection` were updated to use the default `<BrandIcon />` instead of invoking `BrandIconComponent` raw — so WhatsApp is green again, Telegram blue, Instagram pink, etc.
- **WhatsApp provider grid** (Cloud / Evolution API / Evolution Go / Notificame / Z-API / Twilio): each provider renders its own logo again instead of showing the generic WhatsApp glyph for all of them. `ChannelIcon` now prioritizes `iconSrc` (provider PNG/SVG) over the generic brand glyph.
- **ElevenLabs / Google Calendar / Google Sheets**: the "Coming soon" badge was being rendered on all non-connected integrations, including those that only need an API key (ElevenLabs) or per-agent OAuth (Google Calendar/Sheets). Now only appears for OAuth integrations with global credentials not configured.
- **"ACTIVATE" button** on always-available integrations was `disabled` (`opacity-50`, no `onClick`) — the action never fired. Now opens the corresponding `ConfigDialog`.

#### Chat media
- **Video was displayed as a "Download file" attachment instead of a player**: `MessageBubble` fell into the generic fallback for any attachment with `file_type: 'video'`. New `MessageVideo.tsx` component with `<video controls preload="metadata" playsInline>` and a fallback to a download tile when the browser cannot decode the codec — keeps parity with `MessageImage` / `MessageFile`. (commit `ffb51b3`)

#### Admin Settings — UX and clarity
- **"Social Login" renamed to "Authentication Providers"** (and its 6 translations), reflecting that the screen covers generic OAuth, not just social networks.
- **Twitter tab hidden** — provider deprecated by Meta, no active support. (`ChannelConfig.tsx`)
- **"Env-based configuration" warning banners** added to `SmtpConfig.tsx` and `StorageConfig.tsx` — when those configs are read exclusively from `.env` (PROD), the banner explains that UI changes do not persist and directs the operator to the environment file.

#### TypeScript / Build
- **3 pre-existing TypeScript errors unblocking the Docker build**: `MessageContentAttributes` type, unused `extractError` import, `useRef<T>()` without argument. No correlation with new features — these were errors that CI's `tsc --noEmit` had started flagging as blocking. (commit `61208d4`)

### Changed

- **CI**: also publishes `develop` images for staging. (#20)
- `pnpm-lock.yaml` synced and unused `toast` import removed. (#9417fe2)
- **WhatsApp Cloud — audio recording rewritten from FFmpeg WASM to `opus-recorder`**: the Meta Cloud API rejects `audio/webm` for voice messages and requires PTT-compatible OGG/Opus (mono, 48kHz, 16kbps, application=VOIP, no metadata). The previous solution recorded in webm and transcoded in the browser via FFmpeg WASM — an approach that tried 4 different versions and failed in production every time:
  - `@ffmpeg/ffmpeg@0.12 + @ffmpeg/core@0.12.6` self-hosted (commit `b4f5935`) — `core@0.12` requires `SharedArrayBuffer`, which in turn requires COOP+COEP headers. Adding those headers broke cross-origin fetches to the Rails backend.
  - `@ffmpeg/ffmpeg@0.11.6 + @ffmpeg/core-st@0.11.1` single-thread (commit `6c48431`) — `core-st@0.11.1` ships with a **0-byte** `ffmpeg-core.worker.js` on npm, causing `_locateFile` to call `atob('')` and throw `InvalidCharacterError`.
  - `@ffmpeg/core-st@0.11.0` (commit `2e46fc6`) — functional, but the `@ffmpeg/ffmpeg@0.11.6` wrapper makes an unconditional `fetch` of the worker, and `0.11.0` does not ship a worker → the atob is back.
  - **Pivot**: `opus-recorder@8.0.5` (commit `08b8571`) — dedicated library that captures raw PCM from the mic and encodes directly to OGG/Opus via `libopusenc` (compiled to WASM, ~280KB embedded as base64 in `encoderWorker.min.js`). No `SharedArrayBuffer`, no COOP+COEP, no re-encode, no server-side latency. Output of `recorder.stop()` is a `Blob({type: 'audio/ogg'})` ready for upload to Cloud, with correct `OggS` magic bytes.
  - PTT configuration pinned in `src/hooks/chat/recordPttOgg.ts` mirroring the FFmpeg flags: `encoderApplication: 2048` (=VOIP), `encoderSampleRate: 48000`, `encoderBitRate: 48000`, `numberOfChannels: 1`, `encoderComplexity: 10`, `streamPages: true`, `rawOpus: false`.
  - `vite.config.ts` self-hosts `encoderWorker.min.js` at `/opus-recorder/` (replaces the `ffmpegCorePlugin` plugin).
  - `useAudioRecorder.ts` simplified: WhatsApp Cloud recording uses the `Recorder` from opus-recorder; other recordings remain on `MediaRecorder` (webm) unchanged.
- **`yarn.lock` removed from the repository**: the Dockerfile uses `npm ci` and the workflow does not touch yarn — `yarn.lock` was a phantom file that drifted on its own when someone with a yarn-aware IDE opened the project, masking real sync issues between `package.json` and `package-lock.json`. Added to `.gitignore`. (commit `2c0faaf`)

### Added (continued)

- **Tests: e2e Playwright for Cloud audio recording** — `e2e/audio-recording.spec.ts` + `e2e-harness.html` + `playwright.config.ts`. Uses Chromium with `--use-fake-device-for-media-stream` to record 1.5s of synthetic audio via `recordPttOgg` and validate:
  - MIME type = `audio/ogg`
  - size > 2KB
  - **first 4 bytes = `OggS`** (magic header — ensures the Meta Cloud API will accept it)
  - duration ≈ 1500ms

  This test closes the feedback loop from ~10min (deploy + manual prod test) to ~5s locally, and would catch the 4 regressions from the FFmpeg saga listed above if they reappear. (commits `8aa0fac` + `8061331`)
- **Vitest spec `opusRecorder.spec.ts`** — pinning of the PTT contracts (config + paths + magic-byte enforcement in the source). Runs on plain `vitest run`, no browser. (commit `08b8571`)

## [v1.0.0-rc1] - 2026-04-24

### Added

- First public release candidate of `evo-ai-frontend-community`.
- React + Vite + TypeScript app with:
  - i18n across 6 locales (`en`, `pt-BR`, `pt`, `es`, `fr`, `it`)
  - Customer pages (Settings → Users, Teams, Pipelines, Channels, Inboxes, Integrations)
  - Chat / messages / media (`MessageImage`, attachments)
  - Conversation filters, pipeline kanban, dashboards
- Axios client with auth and refresh interceptors.
- Dark theme + shadcn/ui components.

---

[Unreleased]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc6...HEAD
[v1.0.0-rc6]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc5...v1.0.0-rc6
[v1.0.0-rc5]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc4...v1.0.0-rc5
[v1.0.0-rc4]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc3...v1.0.0-rc4
[v1.0.0-rc3]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc2...v1.0.0-rc3
[v1.0.0-rc2]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc1...v1.0.0-rc2
[v1.0.0-rc1]: https://github.com/evolution-foundation/evo-ai-frontend-community/releases/tag/v1.0.0-rc1
