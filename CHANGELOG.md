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

[Unreleased]: https://github.com/EvolutionAPI/evo-ai-frontend-community/compare/v1.0.0-rc2...HEAD
[v1.0.0-rc2]: https://github.com/EvolutionAPI/evo-ai-frontend-community/compare/v1.0.0-rc1...v1.0.0-rc2
[v1.0.0-rc1]: https://github.com/EvolutionAPI/evo-ai-frontend-community/releases/tag/v1.0.0-rc1
