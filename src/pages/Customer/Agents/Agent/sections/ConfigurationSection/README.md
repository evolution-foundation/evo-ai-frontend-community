# ConfigurationSection

Aba **Configuração** do detalhe do agente (`/agents/:id/edit`). Não tem estado
próprio de dados: recebe tudo do `AgentEditPage` e devolve por callback.

## Estrutura

O `index.tsx` é só a composição. Os painéis vivem em
`src/components/agents/configuration/` (exportados pelo `index.ts` de lá):

```
ConfigurationSection/
├── index.tsx                     # 3 CollapsibleCards + modais
└── ConfigurationSection.spec.tsx

src/components/agents/configuration/
├── ModelApiPanel.tsx             # Chave de API, modelo, agent card (a2a), provider (external)
├── BehaviorPanel.tsx             # Transferência, lembretes, pipelines, labels, vendas, timezone
├── MessageHandlingPanel.tsx      # Espera, assinatura, segmentação, emojis, resposta
├── messageHandlingSupport.ts     # `hasMessageHandlingContent` — gate do 3º card
├── InactivityActionsTab.tsx      # Aba secundária "Ações de inatividade"
├── AgentToggle.tsx               # Toggle 42×24 do detalhe do agente
├── TransferRulesModal.tsx
├── PipelineRulesModal.tsx
├── ContactEditModal.tsx
└── types.ts                      # AdvancedMessageConfig, ExternalConfigData, BehaviorSettings
```

## Os 3 cards

Recolhíveis (`CollapsibleCard`), **todos fechados por padrão**, sempre nesta ordem:

| Card | Gate |
| --- | --- |
| Modelo e API | `supportsModelConfig` + `llmConfigData`, ou `isA2AAgent` + `a2aConfigData`, ou `isExternalAgent` + `externalConfigData` |
| Comportamento na Conversa | `supportsBehaviorSettings` (só `llm`) |
| Tratamento de Mensagens | `hasMessageHandlingContent(agent, llmConfigData, externalConfigData)` |

Quando `supportsInactivityActions(agent.type)` (só `llm`), os cards ficam dentro
de um controle segmentado **Geral · Ações de inatividade**; nos outros tipos os
cards são renderizados direto.

Tipos sem nenhum card (`sequential`, `parallel`, `loop`, `workflow`) **não veem a
aba** — o gate é `supportsConfiguration` em
`pages/Customer/Agents/Agent/components/agentTabs.ts`, que precisa acompanhar a
tabela acima.

## Validação de tipos

Os helpers moram em `src/utils/agents/agentTypeValidation.ts` (`isLLMAgent`,
`isA2AAgent`, `isTaskAgent`, `isExternalAgent`, `isOrchestratorAgent`,
`supportsModelConfig`, `supportsBehaviorSettings`, `supportsMessageHandling`,
`supportsCapabilities`, `supportsOutputFormat`, `supportsInactivityActions`,
`supportsTransferRules`, `supportsPipelineRules`).

⚠️ `getAvailableTabs(type)` só devolve `['general']`/`['general','inactivity']` —
não serve para gate das abas de topo nem dos cards.

## Fora daqui

- **Tarefa** (`TaskSection`) fica na aba **Perfil**, não em Configuração.
- **Conhecimento** não tem UI: os campos `knowledge_*` são carregados e
  serializados pelo `AgentEditPage`, sem tela.
- `PipelineAutomationModal` existe no diretório mas **nenhum componente o
  renderiza** — ligá-lo é feature nova.
