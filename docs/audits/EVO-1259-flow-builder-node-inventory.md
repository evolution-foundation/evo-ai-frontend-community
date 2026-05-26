# Flow Builder Node Inventory Audit (EVO-1259)

**Linear:** [EVO-1259](https://linear.app/evoai/issue/EVO-1259) — `[10.3] Auditoria do inventário real de nodes do Flow Builder`
**Author:** Nickolas Oliveira
**Date:** 2026-05-22
**Scope:** Frontend (`evo-ai-frontend-community`) palette/registry vs. backend (`evo-ai-crm-community`) runtime. Read-only audit; no code changes.

## Why this exists

EVO-1259 was scoped to disambiguate EVO-1268 (`[10.2]` palette redesign): does the palette just need a UX reshuffle, or are nodes hidden / unwired / broken that need to be reactivated as part of the redesign? This document is the formal answer.

It also surfaces backend↔frontend node-type mismatches that are NOT EVO-1268's concern — they belong to EVO-1262 (`[10.B] UMBRELLA NODES`).

## TL;DR — Binary recommendation for EVO-1268

**Reorganise the palette AND wire (or delete) one hidden node (`assign-bot`).** Everything else the palette currently exposes is wired through to `nodeTypes`, panels, and the miniMap. The five other gaps below are runtime-level (frontend↔backend mismatches, including a critical trigger-discovery one that breaks the entire executor) and belong to EVO-1262.

---

## §1 — Node inventory

22 component folders exist under `src/components/journey/nodes/actions/` plus 1 under `nodes/trigger/`. The "source of truth" for what the user sees in the palette is `nodePanelNodeTypes` inside `JourneyFlowEditor.tsx`.

Column meanings (the five columns explicitly required by the card's AC#1 use the literal names from the acceptance criteria; the rest are extra evidence columns for the wiring chain):

- **node_type** — string ID used by React Flow + backend
- **componente_path** — directory under `src/components/journey/nodes/` plus the `*Node.tsx` filename
- **Panel** — the `*Panel.tsx` config dialog (or `—` if the node has no config)
- **exportado_em_barrel** — exported by `src/components/journey/nodes/actions/action-nodes.ts`? (✓/✗)
- **Editor import** — imported in `JourneyFlowEditor.tsx`? (✓/✗)
- **nodeTypes** — registered as a React Flow `nodeType` at `JourneyFlowEditor.tsx:151-177`? (✓/✗)
- **aparece_na_palette** — appears as a draggable card in `nodePanelNodeTypes` at `JourneyFlowEditor.tsx:234-412`? (category or ✗)
- **miniMap** — coloured in `miniMapNodeColors` at `JourneyFlowEditor.tsx:417-440`? (✓/✗)
- **renderConfigPanel** — handled in the switch at `JourneyFlowEditor.tsx:464+`? (✓/✗)
- **runtime_reconhece** — listed in `FlowExecutionService#action_node?` at `flow_execution_service.rb:78-95`? (✓/—/✗) where `—` means "not an action (control / terminal / trigger)" and ✗ means "missing handler"

### Triggers

| node_type | componente_path | Panel | exportado_em_barrel | Editor import | nodeTypes | aparece_na_palette | miniMap | renderConfigPanel | runtime_reconhece |
|---|---|---|---|---|---|---|---|---|---|
| `journey-trigger-node` | `trigger/JourneyTriggerNode.tsx` | `JourneyTriggerPanel.tsx` | n/a (separate import) | ✓ | ✓ | n/a (seeded as initial node) | ✓ | ✓ | **✗ (G6 — backend looks for `trigger-node`)** |

The trigger is a single React component that internally handles 8 trigger sub-types (`manual`, `event`, `segment`, `webhook`, `contactCreated`, `contactUpdated`, `label`, `customAttribute`). Documented at `src/pages/Customer/Journey/journey-nodes.md:40-167`.

### Control flow & terminal

| node_type | componente_path | Panel | exportado_em_barrel | Editor import | nodeTypes | aparece_na_palette | miniMap | renderConfigPanel | runtime_reconhece |
|---|---|---|---|---|---|---|---|---|---|
| `wait-node` | `actions/wait/WaitNode.tsx` | `WaitPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `conditional-node` | `actions/conditional/ConditionalNode.tsx` | `ConditionalPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `split-node` | `actions/split/SplitNode.tsx` | `SplitPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `exit-journey-node` | `actions/exit-journey/ExitJourneyNode.tsx` | — | ✓ | ✓ | ✓ | `actions` | ✓ | — | — (terminal) |
| `transfer-journey-node` | `actions/transfer-journey/TransferJourneyNode.tsx` | `TransferJourneyPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |

### Actions

| node_type | componente_path | Panel | exportado_em_barrel | Editor import | nodeTypes | aparece_na_palette | miniMap | renderConfigPanel | runtime_reconhece |
|---|---|---|---|---|---|---|---|---|---|
| `scheduled-action-node` | `actions/scheduled-action/ScheduledActionNode.tsx` | `ScheduledActionPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |
| `set-variable-node` | `actions/set-variable/SetVariableNode.tsx` | `SetVariablePanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |
| `send-message-node` | `actions/send-message/SendMessageNode.tsx` | `SendMessagePanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `send-webhook-node` | `actions/send-webhook/SendWebhookNode.tsx` | `SendWebhookPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `send-email-team-node` | `actions/send-email-team/SendEmailTeamNode.tsx` | `SendEmailTeamPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `send-transcript-node` | `actions/send-transcript/SendTranscriptNode.tsx` | `SendTranscriptPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `add-label-node` | `actions/add-label/AddLabelNode.tsx` | `AddLabelPanel.tsx` | ✓ | ✓ | ✓ | `labels` | ✓ | ✓ | ✓ |
| `remove-label-node` | `actions/remove-label/RemoveLabelNode.tsx` | `RemoveLabelPanel.tsx` | ✓ | ✓ | ✓ | `labels` | ✓ | ✓ | ✓ |
| `update-contact-node` | `actions/update-contact/UpdateContactNode.tsx` | `UpdateContactPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✗ (G3) |
| `update-custom-attribute-node` | `actions/update-custom-attribute/UpdateCustomAttributeNode.tsx` | `UpdateCustomAttributePanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✗ (G3) |
| `assign-agent-node` | `actions/assign-agent/AssignAgentNode.tsx` | `AssignAgentPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✓ |
| `assign-team-node` | `actions/assign-team/AssignTeamNode.tsx` | `AssignTeamPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✓ |
| `assign-bot-node` | `actions/assign-bot/AssignBotNode.tsx` | `AssignBotPanel.tsx` | **✗** (G1) | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** |
| `mute-conversation-node` | `actions/mute-conversation/MuteConversationNode.tsx` | `MuteConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |
| `defer-conversation-node` | `actions/defer-conversation/DeferConversationNode.tsx` | `DeferConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | **✗** (G2 — backend has `snooze-conversation-node`) |
| `resolve-conversation-node` | `actions/resolve-conversation/ResolveConversationNode.tsx` | `ResolveConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |
| `change-priority-node` | `actions/change-priority/ChangePriorityNode.tsx` | `ChangePriorityPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |

### Palette totals (what the user actually sees)

| Category | Count | Items |
|---|---|---|
| `actions` | 7 | wait, scheduled-action, conditional, split, exit-journey, transfer-journey, set-variable |
| `communication` | 4 | send-message, send-webhook, send-email-team, send-transcript |
| `labels` | 2 | add-label, remove-label |
| `contact` | 4 | update-contact, update-custom-attribute, assign-agent, assign-team |
| `conversation` | 4 | mute-conversation, defer-conversation, resolve-conversation, change-priority |
| **Total** | **21** | (22nd component `assign-bot` is implemented but not wired — see §2 G1) |

The trigger is NOT in the palette: it is seeded as the initial node when a journey is created (`JourneyFlowEditor.tsx:180-195`) and cannot be added or removed by the user.

### Backend action handlers

`FlowExecutionService#action_node?` at `flow_execution_service.rb:78-95` recognises **13** action types:

```
assign-agent-node, assign-team-node, add-label-node, remove-label-node,
send-message-node, send-attachment-node, send-email-team-node,
send-transcript-node, send-webhook-node, mute-conversation-node,
snooze-conversation-node, resolve-conversation-node, change-priority-node
```

The matching switch in `execute_node_action` at `flow_execution_service.rb:105-175` handles each one; any other `node_type` falls into the `else` branch at line 173 and is logged as `"Unknown node type: <type>"` then dropped silently.

---

## §2 — Gaps

### G1 — `assign-bot` is a ghost component (HIGH)

`src/components/journey/nodes/actions/assign-bot/` exists with three files (`AssignBotNode.tsx`, `AssignBotPanel.tsx`, `index.ts:1-2`) and a complete pt-BR translation set under `panels.assignBot.*` in `src/i18n/locales/pt-BR/journey.json`, but it is unreferenced everywhere:

- `src/components/journey/nodes/actions/action-nodes.ts` (barrel): no `export * from './assign-bot';`
- `src/pages/Customer/Journey/JourneyFlowEditor.tsx:37-59` (node imports): not listed
- `JourneyFlowEditor.tsx:63-84` (panel imports): not listed
- `JourneyFlowEditor.tsx:151-177` (`nodeTypes`): no entry
- `JourneyFlowEditor.tsx:234-412` (`nodePanelNodeTypes`): no entry in any category
- `JourneyFlowEditor.tsx:417-440` (`miniMapNodeColors`): no entry
- `JourneyFlowEditor.tsx:464+` (`renderConfigPanel` switch): no case
- `flow_execution_service.rb:78-95` (`action_node?`): no entry

This is a finished feature that was never connected. EVO-1260 (i18n sweep) translated the panel strings, which suggests it was meant to ship and was left as TODO.

**Action for EVO-1268:** decide with PM/design whether to wire `assign-bot` into the palette (`contact` category is the natural home) or delete the folder + clean up the pt-BR keys. Backend handler (`assign_bot_node`) needs to be added by EVO-1262 if the decision is "wire". Evidence: `actions/assign-bot/index.ts:1-2`, `panels.assignBot.*` in `pt-BR/journey.json`.

### G2 — `defer-conversation-node` ↔ `snooze-conversation-node` name mismatch (HIGH)

Frontend palette uses `defer-conversation-node` (`JourneyFlowEditor.tsx:389-395`). Backend lists `snooze-conversation-node` in `action_node?` (`flow_execution_service.rb:90`) and dispatches it in `execute_node_action` (`flow_execution_service.rb:148-149`).

End user impact: building a journey with a "defer conversation" step looks fine in the editor and saves successfully, but at runtime the backend logs `"Unknown node type: defer-conversation-node"` (`flow_execution_service.rb:173-174`) and the action never runs. **The feature is silently broken in production.**

Likely cause: frontend renamed `snooze` → `defer` (consistent with pt-BR `panels.deferConversation.*` translations and the `defer-conversation/` folder name) without updating the backend.

**Action:** not EVO-1268's responsibility. Belongs to **EVO-1262 [10.B]** — backend rename `snooze-conversation-node` → `defer-conversation-node` in `action_node?` and the `execute_node_action` switch, with a backfill migration for any saved flow that already references either name.

### G3 — Five palette nodes have no backend handler (HIGH)

Five `node_type`s appear in the palette (and have full config panels), but `flow_execution_service.rb` does not recognise them as actions:

| node_type | Frontend palette category | Backend handler |
|---|---|---|
| `scheduled-action-node` | `actions` (`:245-251`) | ✗ |
| `transfer-journey-node` | `actions` (`:277-283`) | ✗ |
| `set-variable-node` | `actions` (`:285-291`) | ✗ |
| `update-contact-node` | `contact` (`:347-353`) | ✗ |
| `update-custom-attribute-node` | `contact` (`:355-361`) | ✗ |

Same user impact as G2: a journey that uses any of these passes save validation and runs in the executor, but the specific step silently no-ops (`flow_execution_service.rb:173-174`). User sees no error, just nothing happens.

**Action:** EVO-1262 [10.B] (UMBRELLA NODES). Each of the five needs a backend handler. Three are conceptually richer than current handlers:

- `set-variable-node` → write to a journey-scoped variable store the executor does not currently have (Q for 10.B).
- `scheduled-action-node` → delayed execution; needs a job + queue, not just a synchronous call.
- `transfer-journey-node` → enqueue contact in a different journey; coordinate with `AutomationRules` ownership.

The other two (`update-contact-node`, `update-custom-attribute-node`) are simple ActiveRecord updates and should be quick.

### G6 — Frontend trigger type does not match the backend trigger-discovery selector (HIGH, possibly CRITICAL)

`FlowExecutionService#execute_flow` discovers the trigger node by selecting against the literal string `'trigger-node'` for both `type` and `id` (`flow_execution_service.rb:38-39`):

```ruby
trigger_node = nodes.find { |node| node['type'] == 'trigger-node' || node['id'] == 'trigger-node' }
```

The frontend, however, persists the trigger node with `type: 'journey-trigger-node'` AND `id: 'journey-trigger-node'` (`JourneyFlowEditor.tsx:153, 183-184`). Neither alternative in the `find` matches. As a result, every flow created with the current editor falls into the `unless trigger_node` branch at `flow_execution_service.rb:41-43`, which logs `"No trigger node found in flow_data"` and returns early. **No action node downstream of the trigger is ever executed via this service.**

This is not dead code: `AutomationRules::FlowExecutionService` is invoked from `automation_rule_listener.rb:100, 113, 166, 179, 289` for five Wisper events on contact/conversation lifecycle. If those listeners are firing in production and the flow's trigger lookup is failing, **all flow-mode automation rules are silently no-op'ing in production**.

Two follow-ups are needed to confirm severity:

- Verify in staging/production logs whether the warn `"No trigger node found in flow_data"` is present at scale — confirms the impact is live.
- Inspect for any flow_data normalisation layer between the frontend persistence and `flow_data['nodes']` (e.g. in `AutomationRule` model, a serializer, or a migration). If something rewrites `journey-trigger-node` → `trigger-node` on write, the bug would be invisible at runtime.

**Action:** EVO-1262 [10.B]. The clean fix is to update the backend selector to `'journey-trigger-node'` (matching frontend). A safer fix is to accept both literals to cover any legacy flow data already on disk:

```ruby
trigger_node = nodes.find { |node| %w[trigger-node journey-trigger-node].include?(node['type']) }
```

This gap is arguably the most severe of the audit because it short-circuits every flow before any other node runs. Surfaced via adversarial review of the first draft of this audit (commit `51b1b9a`); not in the initial discovery.

### G4 — Orphan backend handler `send-attachment-node` (LOW)

`flow_execution_service.rb:79-93` lists `send-attachment-node` in `action_node?` and the switch handles it at `:131-138`, but no frontend folder, palette entry, or component for `send-attachment-node` exists. The handler also requires `@rule.files.attached?` and `node_data['attachment_ids']` — both populated only by something that never publishes the type.

**Action:** EVO-1262 [10.B] decision — either delete the handler (dead code) or design a frontend `send-attachment-node` to feed it. Not EVO-1268's concern.

### G5 — `journey-nodes.md` documentation is incomplete (INFO)

`src/pages/Customer/Journey/journey-nodes.md` documents 13 nodes in depth. The component-level reality is 22+1, so 10 nodes have no user-facing docs:

- `scheduled-action`, `send-email-team`, `send-transcript`, `assign-agent`, `assign-team`, `assign-bot` (also G1), `mute-conversation`, `defer-conversation` (also G2), `resolve-conversation`, `change-priority`.

**Action:** out of scope for this audit (and for EVO-1268). Worth filing a separate doc-update card after EVO-1262 lands, since some of the missing nodes will likely change behaviour as part of that umbrella.

---

## §3 — Binary recommendation for EVO-1268

**(B) — Reorganise palette + wire (or delete) one hidden node (`assign-bot`).**

Rationale: of the 22 implemented frontend components, 21 are already wired through every layer (`nodeTypes`, palette, panel switch, miniMap). The 22nd (`assign-bot`) is the only "hidden" item in the EVO-1268 sense. The other five gaps (G2, G3, G4, G6) are backend-vs-frontend mismatches: they would not be fixed by a palette reshuffle and need EVO-1262 [10.B]. **G6 in particular short-circuits the entire executor and should be treated as P0 by EVO-1262 even though it is outside EVO-1268's surface.**

If product decides `assign-bot` is not shipping, EVO-1268 can lean (A) instead and EVO-1268 just deletes `actions/assign-bot/` + the `panels.assignBot.*` keys.

---

## §4 — Evidence (file:line)

Frontend (`evo-ai-frontend-community`):

- Barrel: `src/components/journey/nodes/actions/action-nodes.ts:1-44` — 21 `export * from` (no `assign-bot`).
- Editor node imports: `src/pages/Customer/Journey/JourneyFlowEditor.tsx:37-59` — 21 action node bindings.
- Editor panel imports: `JourneyFlowEditor.tsx:63-84` — 20 action panels (`ExitJourney` has no panel).
- Trigger imports: `JourneyFlowEditor.tsx:36, 62`.
- React Flow nodeTypes registry: `JourneyFlowEditor.tsx:151-177` — 22 entries (21 actions + trigger).
- Initial seeded trigger: `JourneyFlowEditor.tsx:180-195`.
- Palette categories: `JourneyFlowEditor.tsx:200-231` — 5 categories.
- Palette node entries: `JourneyFlowEditor.tsx:234-412` — 21 entries across 5 categories.
- MiniMap colours: `JourneyFlowEditor.tsx:417-440` — 22 entries.
- `renderConfigPanel` switch: `JourneyFlowEditor.tsx:464+` — 21 cases.
- Ghost component: `src/components/journey/nodes/actions/assign-bot/{AssignBotNode.tsx,AssignBotPanel.tsx,index.ts}`.
- pt-BR keys for ghost: `src/i18n/locales/pt-BR/journey.json` — `panels.assignBot.*` (28 keys).
- Existing user-facing docs (incomplete): `src/pages/Customer/Journey/journey-nodes.md`.

Backend (`evo-ai-crm-community`):

- Action recognition: `app/services/automation_rules/flow_execution_service.rb:78-95` — 13 entries.
- Action dispatch switch: `flow_execution_service.rb:105-175`.
- Silent drop on unknown type: `flow_execution_service.rb:173-174`.
- `snooze-conversation-node` dispatch: `flow_execution_service.rb:148-149`.
- `send-attachment-node` orphan handler: `flow_execution_service.rb:131-138`.
- Trigger discovery selector that misses the frontend trigger id/type: `flow_execution_service.rb:38-39`.
- Trigger-not-found early exit: `flow_execution_service.rb:41-43`.
- `FlowExecutionService` call sites confirming the service is live: `app/listeners/automation_rule_listener.rb:100, 113, 166, 179, 289`.
- Frontend trigger id/type: `JourneyFlowEditor.tsx:153, 183-184` (`'journey-trigger-node'` for both `id` and `type`).
- Confirmation of `assign-bot-node` node_type declaration (no longer "intended"): `src/components/journey/nodes/actions/assign-bot/AssignBotNode.tsx:21` — `type: 'assign-bot-node';`.

## §5 — Notes

- The card description claimed "5 nodes visible in palette when `All` is selected vs. 22 implemented". The palette code (`JourneyFlowEditor.tsx:234-412`) actually exposes 21 across 5 categories, and the palette UI does not have an "All" filter — the user sees them grouped by category in `BaseFlowEditor`. The "only 5 visible" observation in the discovery may have been a per-category scroll issue rather than a missing-nodes issue. EVO-1268 should verify the palette UI rendering separately from this inventory.
- This audit is point-in-time against `feat/EVO-1259` branched from `origin/develop` at SHA `512844e` (2026-05-22).
