# Customizações da Paralax IA

Este repositório é um fork do `evo-ai-frontend-community` (versão 1.1.0+). Abaixo está o registro das funcionalidades e melhorias customizadas que mantemos ativamente em relação à versão *upstream* da comunidade.

## 1. Resiliência no Cloud Whatsapp Form (JSON.parse Guard)
O *upstream* adotou oficialmente a integração de Embedded Signup do Facebook e construiu o componente `CloudWhatsappForm`.
No entanto, o listener de eventos do iframe implementado na versão oficial é frágil e processa `event.data` usando `JSON.parse` diretamente.

**Nossa customização:**
- Adicionamos uma guarda de segurança no arquivo `src/components/channels/forms/whatsapp/CloudWhatsappForm.tsx`:
  `if (typeof event.data !== 'string' || !event.data.startsWith('{')) return;`
- Esse tratamento previne crashes catastróficos no frontend, pois bloqueia silenciosamente eventos de terceiros (ex: extensões de navegador ou scripts de tracking) que comumente disparam strings que não são JSONs válidos dentro da janela de navegação.
