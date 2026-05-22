# Flow Builder Node Inventory Audit (EVO-1259)

**Linear:** [EVO-1259](https://linear.app/evoai/issue/EVO-1259) — `[10.3] Auditoria do inventário real de nodes do Flow Builder`
**Author:** Nickolas Oliveira
**Date:** 2026-05-22
**Scope:** Frontend (`evo-ai-frontend-community`) palette/registry vs. backend (`evo-ai-crm-community`) runtime. Read-only audit; no code changes.

## Why this exists

EVO-1259 was scoped to disambiguate EVO-1268 (`[10.2]` palette redesign): does the palette just need a UX reshuffle, or are nodes hidden / unwired / broken that need to be reactivated as part of the redesign? This document is the formal answer.

It also surfaces backend↔frontend node-type mismatches that are NOT EVO-1268's concern — they belong to EVO-1262 (`[10.B] UMBRELLA NODES`).

## TL;DR — Binary recommendation for EVO-1268

**Reorganise the palette AND wire (or delete) one hidden node (`assign-bot`).** Everything else the palette currently exposes is wired through to `nodeTypes`, panels, and the miniMap. The four other gaps below are runtime-level (frontend↔backend mismatches) and belong to EVO-1262.

---

## §1 — Node inventory

22 component folders exist under `src/components/journey/nodes/actions/` plus 1 under `nodes/trigger/`. The "source of truth" for what the user sees in the palette is `nodePanelNodeTypes` inside `JourneyFlowEditor.tsx`.

Column meanings:

- **Folder** — directory under `src/components/journey/nodes/`
- **node_type** — string ID used by React Flow + backend
- **Component** — the `*Node.tsx` file
- **Panel** — the `*Panel.tsx` config dialog (or `—` if the node has no config)
- **Barrel** — exported by `src/components/journey/nodes/actions/action-nodes.ts`? (✓/✗)
- **Editor import** — imported in `JourneyFlowEditor.tsx`? (✓/✗)
- **nodeTypes** — registered as a React Flow `nodeType` at `JourneyFlowEditor.tsx:151-177`? (✓/✗)
- **Palette** — appears as a draggable card in `nodePanelNodeTypes` at `JourneyFlowEditor.tsx:234-412`? (category or ✗)
- **miniMap** — coloured in `miniMapNodeColors` at `JourneyFlowEditor.tsx:417-440`? (✓/✗)
- **renderConfigPanel** — handled in the switch at `JourneyFlowEditor.tsx:464+`? (✓/✗)
- **Backend action_node?** — listed in `FlowExecutionService#action_node?` at `flow_execution_service.rb:78-95`? (✓/—/✗) where `—` means "not an action (control / terminal / trigger)" and ✗ means "missing handler"

### Triggers

| Folder | node_type | Component | Panel | Barrel | Editor import | nodeTypes | Palette | miniMap | renderConfigPanel | Backend |
|---|---|---|---|---|---|---|---|---|---|---|
| `trigger/` | `journey-trigger-node` | `JourneyTriggerNode.tsx` | `JourneyTriggerPanel.tsx` | n/a (separate import) | ✓ | ✓ | n/a (seeded as initial node) | ✓ | ✓ | n/a (trigger, not action) |

The trigger is a single React component that internally handles 8 trigger sub-types (`manual`, `event`, `segment`, `webhook`, `contactCreated`, `contactUpdated`, `label`, `customAttribute`). Documented at `src/pages/Customer/Journey/journey-nodes.md:40-167`.

### Control flow & terminal

| Folder | node_type | Component | Panel | Barrel | Editor import | nodeTypes | Palette | miniMap | renderConfigPanel | Backend |
|---|---|---|---|---|---|---|---|---|---|---|
| `actions/wait/` | `wait-node` | `WaitNode.tsx` | `WaitPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `actions/conditional/` | `conditional-node` | `ConditionalNode.tsx` | `ConditionalPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `actions/split/` | `split-node` | `SplitNode.tsx` | `SplitPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | — (graph-traversal) |
| `actions/exit-journey/` | `exit-journey-node` | `ExitJourneyNode.tsx` | — | ✓ | ✓ | ✓ | `actions` | ✓ | — | — (terminal) |
| `actions/transfer-journey/` | `transfer-journey-node` | `TransferJourneyNode.tsx` | `TransferJourneyPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |

### Actions

| Folder | node_type | Component | Panel | Barrel | Editor import | nodeTypes | Palette | miniMap | renderConfigPanel | Backend |
|---|---|---|---|---|---|---|---|---|---|---|
| `actions/scheduled-action/` | `scheduled-action-node` | `ScheduledActionNode.tsx` | `ScheduledActionPanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |
| `actions/set-variable/` | `set-variable-node` | `SetVariableNode.tsx` | `SetVariablePanel.tsx` | ✓ | ✓ | ✓ | `actions` | ✓ | ✓ | ✗ (G3) |
| `actions/send-message/` | `send-message-node` | `SendMessageNode.tsx` | `SendMessagePanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `actions/send-webhook/` | `send-webhook-node` | `SendWebhookNode.tsx` | `SendWebhookPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `actions/send-email-team/` | `send-email-team-node` | `SendEmailTeamNode.tsx` | `SendEmailTeamPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `actions/send-transcript/` | `send-transcript-node` | `SendTranscriptNode.tsx` | `SendTranscriptPanel.tsx` | ✓ | ✓ | ✓ | `communication` | ✓ | ✓ | ✓ |
| `actions/add-label/` | `add-label-node` | `AddLabelNode.tsx` | `AddLabelPanel.tsx` | ✓ | ✓ | ✓ | `labels` | ✓ | ✓ | ✓ |
| `actions/remove-label/` | `remove-label-node` | `RemoveLabelNode.tsx` | `RemoveLabelPanel.tsx` | ✓ | ✓ | ✓ | `labels` | ✓ | ✓ | ✓ |
| `actions/update-contact/` | `update-contact-node` | `UpdateContactNode.tsx` | `UpdateContactPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✗ (G3) |
| `actions/update-custom-attribute/` | `update-custom-attribute-node` | `UpdateCustomAttributeNode.tsx` | `UpdateCustomAttributePanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✗ (G3) |
| `actions/assign-agent/` | `assign-agent-node` | `AssignAgentNode.tsx` | `AssignAgentPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✓ |
| `actions/assign-team/` | `assign-team-node` | `AssignTeamNode.tsx` | `AssignTeamPanel.tsx` | ✓ | ✓ | ✓ | `contact` | ✓ | ✓ | ✓ |
| `actions/assign-bot/` | `assign-bot-node` (intended) | `AssignBotNode.tsx` | `AssignBotPanel.tsx` | **✗** (G1) | **✗** | **✗** | **✗** | **✗** | **✗** | **✗** |
| `actions/mute-conversation/` | `mute-conversation-node` | `MuteConversationNode.tsx` | `MuteConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |
| `actions/defer-conversation/` | `defer-conversation-node` | `DeferConversationNode.tsx` | `DeferConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | **✗** (G2 — backend has `snooze-conversation-node`) |
| `actions/resolve-conversation/` | `resolve-conversation-node` | `ResolveConversationNode.tsx` | `ResolveConversationPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |
| `actions/change-priority/` | `change-priority-node` | `ChangePriorityNode.tsx` | `ChangePriorityPanel.tsx` | ✓ | ✓ | ✓ | `conversation` | ✓ | ✓ | ✓ |

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

Rationale: of the 22 implemented frontend components, 21 are already wired through every layer (`nodeTypes`, palette, panel switch, miniMap). The 22nd (`assign-bot`) is the only "hidden" item in the EVO-1268 sense. The other four gaps (G2, G3, G4) are backend-vs-frontend mismatches: they would not be fixed by a palette reshuffle and need EVO-1262 [10.B].

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

## §5 — Notes

- The card description claimed "5 nodes visible in palette when `All` is selected vs. 22 implemented". The palette code (`JourneyFlowEditor.tsx:234-412`) actually exposes 21 across 5 categories, and the palette UI does not have an "All" filter — the user sees them grouped by category in `BaseFlowEditor`. The "only 5 visible" observation in the discovery may have been a per-category scroll issue rather than a missing-nodes issue. EVO-1268 should verify the palette UI rendering separately from this inventory.
- This audit is point-in-time against `feat/EVO-1259` branched from `origin/develop` at SHA `512844e` (2026-05-22).
