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

## [v1.0.0-rc3] - 2026-05-17

Release de estabilização — concentra correções em upload de arquivos grandes, polling de configuração, reconexão de WebSocket, i18n, scroll de paginação, banners de configuração global, fluxo de password e download de mídia. Também consolida a fundação do open-core via Plugin Host Runtime e `EXTENSION_POINTS.md` (4 categorias declaradas), introduz UI completa de Roles & Permissions, products catalog, template bundles export/import e diversas melhorias de automation rules e pipelines.

### Added

- **Plugin Host Runtime (EVO-1379)** (#79) — runtime no frontend que carrega plugins externos em runtime, com isolamento de bundle. Base para a Enterprise edition injetar features sem fork.
- **EVO-1387 — `EXTENSION_POINTS.md` v2.1.0** (#81) — categoria "Plugin host runtime" adicionada, formalizando o contrato de plugins.
- **EVO-1378 — Extension points neutros para open-core** (#78) — pontos de extensão declarados sem referência à Enterprise, mantendo o documento utilizável fora do contexto fechado.
- **EVO-1284 — `EXTENSION_POINTS.md` inicial** (#76) — primeira versão do documento com 4 categorias declaradas.
- **EVO-1061 — Roles & Permissions admin UI** (#55) — tela completa de administração de papéis e permissões: criar, editar, deletar roles customizadas, atribuir permissões granularmente.
- **EVO-1189 — Delete contact** (#70) — action funcional de exclusão de contato a partir do detalhe.
- **EVO-990 — Pipeline actions no menu 3 pontos + context menu** (#51) — ações de pipeline acessíveis tanto via menu `⋮` quanto via clique direito no card.
- **EVO-1058 — Operador `attribute_changed` com pickers From/To** (#56) — automation rules ganham operador "atributo mudou" com seletores explícitos de valor antes e valor depois.
- **EVO-1011 — Bulk resolve de conversas via checkbox** — seleção múltipla na lista de conversas + ação de resolve em lote.
- **EVO-988 — Telefone do contato na lista de conversas e header** (#48) — número de telefone visível no card de conversa e no cabeçalho do chat.
- **Templates UI (EVO-1116)** — tela Configurações → Templates com export/import de bundles, wizard de export mais óbvio, locales pt/es/fr/it.
- **Knowledge Nexus retrieval tool no Agent Builder** — seletor de spaces do Nexus integrado ao builder de agentes (via backend proxy do core-service).
- **Roles UI — agents** — toggle "Permitir gerenciar labels" com persistência de `allow_manage_labels`.
- **Automation rules — logs panel** — painel de logs de execução de automation rules, com filtros e detalhe por execução.
- **Automation rules — canned responses + message templates** — suporte a estes tipos no action registry, com handling dinâmico de parâmetros.
- **Products catalog UI** — telas de listagem, edição, variantes, attach a agentes, panel de vendas no pipeline.
- **EVO-1051 — Botão "Clear Configuration" no Admin Settings** — operador da instalação pode limpar configurações específicas direto da UI.
- **Pipelines — `apply_label` action** — em vez de campo de texto livre, agora abre o picker de labels.

### Changed

- **EVO-1107 — Configuration tab — error states, cancel flags, a11y** — review feedback aplicado: estados de erro tratados, flags de cancelamento de requests, melhorias de acessibilidade.
- **EVO-1085 — Reconexão de WebSocket** — reconexão ativa com toast de sucesso + backoff em background. Antes a conexão caída ficava silenciosa, agora o usuário vê confirmação ao voltar online.
- **EVO-1131 — Upload de arquivos** (#65) — skip de fetch+blob para arquivos grandes; limite de upload elevado para 100MB.
- **EVO-1146 — i18n** — adicionadas 9+ chaves missing em 6 locales.
- **EVO-1147 — Polling de provider config** — `provider_config` removido das deps do polling + Page Visibility API integrada (não faz polling com aba em background).
- **EVO-1044 — Per-field GlobalConfig fallback detection** (#71) — banner de configuração global no Connection Settings agora detecta fallback campo a campo, não apenas no documento inteiro.
- **EVO-1106 / EVO-1132** — scroll preservado na paginação + testes de download em `MessageFile`.
- **EVO-1059** — `AutomationCondition.values` expandido para array misto (sem cast).
- **EVO-1063 — Password validation** — checklist inline + erros estruturados na criação de usuário (consome a resposta 422 estruturada do auth-service).
- **EVO-1053** — error gating, stale closure, helper extraction e cobertura de testes (round 4 de review).
- **Integrations** — configs normalizados e melhor error handling.
- **Docs** padronizados para Evolution Foundation 2026 (README, LICENSE, NOTICE, TRADEMARKS).
- **Docs (org)** — URLs do GitHub atualizadas de `EvolutionAPI` para `evolution-foundation`.

### Fixed

#### Chat / Mensagens
- **EVO-1145 — Conversation match em `selection` e `lifecycle` reducers** — agora casa por `id || uuid`, evitando state desincronizado entre identificadores.
- **Mensagens duplicadas no chat + cor do botão de delete** — corrigido o handler que adicionava entrada duplicada na lista local.
- **EVO-1078 / EVO-1054 / EVO-1062 / EVO-1056** — bugs múltiplos de chat e auth resolvidos em batch.

#### Configuração / Connection Settings
- **EVO-1107 — Configuration tab blank/slow load** — skeleton adicionado + polling corrigido.
- **EVO-1044 — Banner global config no Evolution Go/API Connection Settings** — banner não aparecia em determinadas combinações.
- **EVO-1046 — `setupRequired=false` default quando `/setup/status` erra** (#59) — antes um erro 5xx no setup status bloqueava o app inteiro; agora cai no comportamento "setup já feito" e deixa o usuário tentar login.
- **EVO-1049 — Remove banner do email config screen** (#64) — banner de workaround retirado após o fix de runtime no auth-service.
- **EVO-1048 — Sidebar colapsada** (#54) — submenu flyout e tooltip de links agora aparecem quando sidebar está collapsed.

#### Automation rules
- **Build break** — `MessageTemplateVariable` definido localmente.
- **Menu** — adicionado item de automation e removida entrada duplicada.
- **i18n** — campos de linguagem não usados removidos da localização de automation.
- **`labels` condition** — restrita a `has`/`has-not` (drop `is_present`).
- **`apply_label` action** — abre label picker, não input de texto.

#### Templates / Products
- **i18n templates** — locales pt/es/fr/it adicionados (EVO-1116).
- **Products** — cálculo de total count corrigido na paginação.
- **Export wizard** — removida import não usada de `DialogDescription`.

#### Mídia / Download (EVO-999)
- **HIGH review findings** aplicadas para o fix de force-download.
- **Toast feedback nos fallbacks de download** no `MessageFile`.

#### Notificame / Contacts
- **EVO-986 — Parsing do verify response** — shape correto da resposta sendo lido.
- **EVO-1018 — Group contacts** — review feedback aplicado.
- **Removido trigger de contact events** que causava 404s.

#### Outros
- **EVO-995 — Agent creation UX wizard** — correções de review aplicadas.
- **EVO-1083 — `ContactHeader` presence** (#66) — wired para `availability_status` e `channel`.
- **i18n pt-BR** (#31) — chaves missing em chat/channels/aiAgents/integrations/sms/whatsapp.
- **Lock file sync** — `package-lock.json` sincronizado com novas dependências.

## [v1.0.0-rc2] - 2026-05-05

Release de estabilização — corrige fluxos de criação de usuário, gestão de membros de team, sessão axios e diversos refinamentos de UI.

### Added

- **EVO-989 UI** — **Aba "Automation" no Edit Stage Modal** do kanban: configuração de regras `trigger → action` por estágio (label_added / status_changed / custom_attribute_updated → move_to_stage / assign_agent / apply_label). Componente `StageAutomationRules` novo, com keys estáveis (`useState + generateKey()`), conditional rendering por trigger, i18n nas 6 locales. (#41)
- **EVO-1007** — clicar em card do pipeline kanban navega para `/conversations/<uuid>`; cards sem conversation (lead / orphan) caem no modal de edit. Drag-suppression preservado. Edit continua disponível via menu `⋮`. (#40)
- **EVO-987** — criação inline de label a partir do modal "Assign Label". (#33)
- **EVO-1006** — busca e filtros adicionados ao kanban de pipeline. (#30)
- **Brand icons**: substituídas imagens estáticas de brand por `@icons-pack/react-simple-icons`. (#25)
- **Tour**: novo componente de onboarding tour. (#23)

### Fixed

- **Role select no formulário de criação de usuário (issue #16)**: o dropdown ficava aberto mas selecionar uma opção não atualizava o estado do form. Corrigido como Select controlado desde o mount com `placeholder`, deduplicação de roles via `useMemo`, fallback para `agent` / `account_owner` quando system roles não chegam, validação de role obrigatória, estados de loading / error e mensagem inline para o campo. (#28)
- **EVO-1000 — sessão sendo morta em 401 de business**: o axios interceptor invalidava a sessão em qualquer 401 (exceto `/unread_count`). Endpoints que mistakenly retornavam 401 para erro de validação (ex.: criação de team-member antes do fix backend) deslogavam o admin. Agora só termina a sessão quando `error.response.data.error.code` está em `{UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED, MISSING_TOKEN, INVALID_CREDENTIALS, SESSION_EXPIRED}`. (#26)
- **EVO-1010 — gestão de team members só permitia adicionar**: já-membros tinham checkbox `disabled` e a página nunca chamava endpoint de remoção. Reescrito como visão unificada de manage members (state único `selectedIds` com snapshot inicial; diff calculado no save → `POST` adds + `DELETE` removes em paralelo). Adicionado badge `addUsers.alreadyMemberBadge` e i18n nas 6 locales (`en`, `pt-BR`, `pt`, `es`, `fr`, `it`). (#27)
- **EVO-996** — preview de reply: HTML é stripado e placeholder é renderizado para conteúdos não textuais. (#36)
- **EVO-997** — opção não-funcional de "delete contact" removida do menu de ações do contato. (#37)
- **EVO-977** — push desktop, estado vazio do sino, audio unlock e auto-request de permission corrigidos (3 rounds de review). Trata stale closures, flag de audio unlock, navegação SPA e estado de permission negada.
- **EVO-1012** — regression spec para prioridade de campos do avatar de contato. (#32)
- **WhatsApp groups**: nome do remetente e labels de mídia exibidos corretamente em todo o chat UI. (#34)
- **EVO-974** — wire do operador `OR`, fixes em rewrites de `priority` / `assignee`, filtro de `Contact` adicionado; toast quando filtro `assignee=me` é dropado em sessão expirada.
- **EVO-1002** — não esconde mais templates não-aprovados; tabela de gestão exibe status real do Meta.
- **EVO-1001** — labels de conta carregadas como opções do filtro de conversa. (#24)
- **EVO-971** — fallback para o setup wizard quando `/setup/status` está inacessível. (#22)

#### UX & ícones (regressão da migração para `@icons-pack/react-simple-icons`)
A PR #25 migrou de PNGs estáticos para SVGs monocromáticos da `@icons-pack/react-simple-icons`, mas perdeu a cor de marca e introduziu vários problemas visuais. Corrigido em sequência:
- **Cores oficiais das marcas restauradas**: `BrandIcon.tsx` agora aplica a cor oficial via novo helper `getBrandColor()` (mapa com hex de cada brand). `ChannelIcon`, `MCPCard`, `IntegrationCard` e `IntegrationsSection` foram atualizados para usar o `<BrandIcon />` default em vez de invocar `BrandIconComponent` cru — assim WhatsApp volta verde, Telegram azul, Instagram pink, etc.
- **Provider grid do WhatsApp** (Cloud / Evolution API / Evolution Go / Notificame / Z-API / Twilio): cada provider voltou a renderizar seu logo próprio em vez de mostrar o glyph genérico do WhatsApp para todos. `ChannelIcon` agora prioriza `iconSrc` (PNG/SVG do provider) sobre o brand glyph genérico.
- **ElevenLabs / Google Calendar / Google Sheets**: o badge "Em breve / Coming soon" estava sendo renderizado em todas as integrações não conectadas, incluindo as que só precisam de API key (ElevenLabs) ou OAuth per-agent (Google Calendar/Sheets). Agora só aparece para integrações OAuth com credenciais globais não configuradas.
- **Botão "ATIVAR"** das integrações always-available estava `disabled` (`opacity-50`, sem `onClick`) — a ação nunca disparava. Agora abre o `ConfigDialog` correspondente.

#### Mídia no chat
- **Vídeo era exibido como anexo "Baixar arquivo" no lugar do player**: `MessageBubble` caía no fallback genérico para qualquer attachment com `file_type: 'video'`. Novo componente `MessageVideo.tsx` com `<video controls preload="metadata" playsInline>` e fallback para tile de download quando o navegador não consegue decodificar o codec — mantém paridade com `MessageImage` / `MessageFile`. (commit `ffb51b3`)

#### Admin Settings — UX e clareza
- **"Social Login" renomeado para "Authentication Providers"** (e suas 6 traduções), refletindo que a tela cobre OAuth genérico, não só redes sociais.
- **Aba Twitter escondida** — provider deprecado pela Meta, sem suporte ativo. (`ChannelConfig.tsx`)
- **Banners de aviso "configuração via env"** adicionados em `SmtpConfig.tsx` e `StorageConfig.tsx` — quando essas configs são lidas exclusivamente do `.env` (PROD), o banner explica que mudanças na UI não persistem e direciona o operador para o arquivo de ambiente.

#### TypeScript / Build
- **3 erros pré-existentes de TypeScript desbloqueando o Docker build**: `MessageContentAttributes` type, `extractError` import não usado, `useRef<T>()` sem argumento. Sem correlação com features novas — eram erros que o `tsc --noEmit` do CI havia começado a sinalizar como bloqueante. (commit `61208d4`)

### Changed

- **CI**: publica também imagens `develop` para staging. (#20)
- `pnpm-lock.yaml` sincronizado e import de `toast` não usado removido. (#9417fe2)
- **WhatsApp Cloud — gravação de áudio reescrita de FFmpeg WASM para `opus-recorder`**: a Meta Cloud API rejeita `audio/webm` para mensagens de voz e exige OGG/Opus PTT-compatível (mono, 48kHz, 16kbps, application=VOIP, sem metadata). A solução anterior gravava em webm e convertia no browser via FFmpeg WASM — abordagem que tentou 4 versões diferentes e falhou em produção em todas:
  - `@ffmpeg/ffmpeg@0.12 + @ffmpeg/core@0.12.6` self-hosted (commit `b4f5935`) — `core@0.12` exige `SharedArrayBuffer`, que por sua vez exige headers COOP+COEP. Adicionar esses headers quebrava cross-origin fetches do backend Rails.
  - `@ffmpeg/ffmpeg@0.11.6 + @ffmpeg/core-st@0.11.1` single-thread (commit `6c48431`) — `core-st@0.11.1` ship com `ffmpeg-core.worker.js` de **0 bytes** no npm, fazendo `_locateFile` chamar `atob('')` e estourar `InvalidCharacterError`.
  - `@ffmpeg/core-st@0.11.0` (commit `2e46fc6`) — funcional, mas o wrapper `@ffmpeg/ffmpeg@0.11.6` faz `fetch` incondicional do worker, e `0.11.0` não ship worker → o atob volta.
  - **Pivô**: `opus-recorder@8.0.5` (commit `08b8571`) — biblioteca dedicada que captura PCM cru do mic e codifica direto em OGG/Opus via `libopusenc` (compilado em WASM, ~280KB embutido como base64 no `encoderWorker.min.js`). Sem `SharedArrayBuffer`, sem COOP+COEP, sem reencode, sem latência server-side. Saída do `recorder.stop()` é um `Blob({type: 'audio/ogg'})` pronto para upload ao Cloud, com magic bytes `OggS` corretos.
  - Configuração PTT pinada em `src/hooks/chat/recordPttOgg.ts` mirroring os flags FFmpeg: `encoderApplication: 2048` (=VOIP), `encoderSampleRate: 48000`, `encoderBitRate: 48000`, `numberOfChannels: 1`, `encoderComplexity: 10`, `streamPages: true`, `rawOpus: false`.
  - `vite.config.ts` self-hosta o `encoderWorker.min.js` em `/opus-recorder/` (substitui o plugin `ffmpegCorePlugin`).
  - `useAudioRecorder.ts` simplificado: gravação WhatsApp Cloud usa `Recorder` do opus-recorder; outras gravações continuam com `MediaRecorder` (webm) sem mudança.
- **`yarn.lock` removido do repositório**: o Dockerfile usa `npm ci` e o workflow não toca yarn — `yarn.lock` era um arquivo fantasma que driftava sozinho quando alguém com IDE yarn-aware abria o projeto, mascarando problemas reais de sincronização entre `package.json` e `package-lock.json`. Adicionado a `.gitignore`. (commit `2c0faaf`)

### Added (continued)

- **Tests: e2e Playwright para gravação de áudio Cloud** — `e2e/audio-recording.spec.ts` + `e2e-harness.html` + `playwright.config.ts`. Usa Chromium com `--use-fake-device-for-media-stream` para gravar 1.5s de áudio sintético via `recordPttOgg` e validar:
  - tipo MIME = `audio/ogg`
  - tamanho > 2KB
  - **primeiros 4 bytes = `OggS`** (magic header — garante que a Meta Cloud API vai aceitar)
  - duração ≈ 1500ms

  Esse teste fecha o ciclo de feedback de ~10min (deploy + teste manual em prod) para ~5s local, e cobriria as 4 regressões da saga FFmpeg listadas acima caso surjam de novo. (commits `8aa0fac` + `8061331`)
- **Spec Vitest `opusRecorder.spec.ts`** — pinning dos contratos PTT (config + paths + magic-byte enforcement no source). Roda em `vitest run` puro, sem browser. (commit `08b8571`)

## [v1.0.0-rc1] - 2026-04-24

### Added

- Primeiro release candidate público do `evo-ai-frontend-community`.
- App React + Vite + TypeScript com:
  - i18n em 6 locales (`en`, `pt-BR`, `pt`, `es`, `fr`, `it`)
  - Páginas de Customer (Settings → Users, Teams, Pipelines, Channels, Inboxes, Integrations)
  - Chat / mensagens / mídia (`MessageImage`, attachments)
  - Filtros de conversa, kanban de pipeline, dashboards
- Cliente axios com interceptors de auth e refresh.
- Tema dark + componentes shadcn/ui.

---

[Unreleased]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc3...HEAD
[v1.0.0-rc3]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc2...v1.0.0-rc3
[v1.0.0-rc2]: https://github.com/evolution-foundation/evo-ai-frontend-community/compare/v1.0.0-rc1...v1.0.0-rc2
[v1.0.0-rc1]: https://github.com/evolution-foundation/evo-ai-frontend-community/releases/tag/v1.0.0-rc1
