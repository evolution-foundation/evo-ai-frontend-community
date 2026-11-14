# Ensaio sintético de automações

Somente loopback, banco sintético vazio e Redis local. Não copiar dados reais. O fixture substitui autenticação e diretório do serviço Auth; CRUD, seletores do CRM, dry-run, token, ingresso público e worker são reais. Não valida login nem publicação do site.

1. Prepare um banco vazio `evo_l_ui_test` no Postgres local (porta 55439), seguindo o bootstrap L1 em `entregas/L-ajustes.md` do projeto operacional. Não recrie nem limpe bancos existentes.
2. No worktree CRM, execute `bundle exec rails db:prepare` e depois `bundle exec rails runner <frontend>/e2e/lead-automations-local/server.rb` com `RAILS_ENV=test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55439 POSTGRES_DATABASE=evo_l_ui_test POSTGRES_USERNAME=postgres REDIS_URL=redis://127.0.0.1:56389 SECRET_KEY_BASE=synthetic-l1-local-only CORS_ORIGINS=http://127.0.0.1:5176`.
3. No frontend: `VITE_API_URL=http://127.0.0.1:3016 VITE_AUTH_API_URL=http://127.0.0.1:3016 npm run dev -- --host 127.0.0.1 --port 5176`.
4. Execute `L6_CRM_DIR=<worktree-CRM> L6_CAPTURE_DIR=<pasta-de-capturas> POSTGRES_DATABASE=evo_l_ui_test node e2e/lead-automations-local/journey.mjs`.

O roteiro cria e ativa a regra pela tela, simula CTWA, gera token em memória, envia um formulário fictício pelo endpoint público, executa o worker, verifica um negócio/nenhuma conversa e repete a entrada. Produz capturas de lista/edição/teste/log nos dois temas e larguras 1440/390. Os registros sintéticos permanecem para inspeção; o roteiro exige lista de regras inicialmente vazia. Não executa limpeza destrutiva. Encerre apenas os dois servidores que iniciar e preserve Docker preexistente. Tokens não vão para screenshots nem arquivos.

Para refazer somente as capturas da amostra já existente, acrescente `L6_CAPTURE_ONLY=1` ao comando da etapa 4. Não cria outra regra ou contato.
