# Convites de usuários

N5 · Theo/Codex · 16/11/2026. Implementação frontend; implantação posterior.
Contrato backend: https://github.com/ricardoisus/evo-auth-service-community/pull/1
(`docs/user-invitations.md`, commit cc33f6739873372f88fab950818d62964bd62ba6).
Especificação canônica: atividades Vetorial, Evo CRM Agentes, entregas N2 + N3.

- Ler capability autenticada `/users/invitation_capabilities`; ausência, erro ou
  flag off esconde reenvio/lote e exige senha explícita no cadastro.
- Reenvio exige `users.manage` + `users.update`, alvo pending e elegibilidade
  retornada pelo servidor. O cliente não calcula elegibilidade pelo relógio.
- POST `/users/:id/resend_invite`, sem e-mail/token no corpo, confirma apenas
  solicitação. GET lista acompanha queued/sending a cada 5s por até 2min, somente
  com tela visível; foco/retomada atualiza sem trocar página/filtro ou rolagem.
  Sem chamadas sobrepostas nem toasts repetidos para a mesma entrega observada.
- `confirmed` continua separado de invitation_status; legado sem novos campos
  não ganha selo/ação. `invitation_sent_at` representa aceite SMTP, não leitura.
- Create extrai `data.user`. Senha vazia omite password/confirmPassword; senha
  explícita exige 8–128 caracteres com maiúscula/minúscula/número/símbolo.
- Bulk mostra resultados reais como solicitações; máximo 50 endereços, normalizados
  e deduplicados; sucesso parcial mantém relatório aberto e atualiza lista.
- Reset direto usa árvore isolada, sem App/Auth/GlobalConfig/plugins/GA4/Clarity.
  Query capturada em estado volátil e removida por replaceState; propósito convite
  altera somente copy. Token somente no POST de reset. Navegação ao login recarrega
  a aplicação normal. GA4/Clarity também têm guarda da rota. Logo/fontes locais.
- Nginx desliga access_log no prefixo reset e define Referrer-Policy no-referrer;
  meta referrer protege navegação em host alternativo. **N7 deve conferir também
  logs do proxy externo/ingress/APM antes de ativar SMTP**; esta branch não muda
  a configuração de Traefik/Portainer. Preservar headers CSP herdados.

## Validação reproduzível

`npm ci --no-audit --no-fund`

`npx vitest run src/services/users/usersService.spec.ts src/hooks/useInvitationPolling.spec.tsx src/components/users/UserFormModal.spec.tsx src/i18n/locales/i18n-parity.spec.ts src/utils/clarityUtils.spec.ts src/contexts/GlobalConfigContext.spec.tsx`

`npm run build`

`npx playwright test e2e/user-invitations.spec.ts`

`npx playwright test --config playwright.invitations.config.ts --grep 'reset invitation'`

Browser automatizado usa exclusivamente fixtures sintéticas e interceptação de API;
nenhum envio SMTP/WhatsApp. Não equivale a integração Rails/SMTP nem entrega real.
Capturas por padrão em test-results/n5; definir N5_CAPTURES para destino de entrega.
Revisão independente N6 e merge/deploy N7/N8 permanecem necessários.
