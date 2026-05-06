<p align="center">
  <a href="https://evolutionfoundation.com.br">
    <img src="./public/hover-evolution.png" alt="Evolution Foundation" />
  </a>
</p>

<h1 align="center">Evo CRM Frontend</h1>

<p align="center">
  Modern web interface for the Evo CRM Community — built with React, TypeScript and Vite.
</p>

<p align="center">
  <a href="https://github.com/evolution-foundation/evo-ai-frontend-community/releases/latest"><img src="https://img.shields.io/github/v/release/evolution-foundation/evo-ai-frontend-community?include_prereleases&label=version&color=00ffa7" alt="Latest version" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache 2.0" /></a>
  <a href="https://docs.evolutionfoundation.com.br"><img src="https://img.shields.io/badge/Docs-evolutionfoundation.com.br-00ffa7" alt="Documentation" /></a>
  <a href="https://evolutionfoundation.com.br/community"><img src="https://img.shields.io/badge/Community-Join%20us-white" alt="Community" /></a>
</p>

<p align="center">
  <a href="https://evolutionfoundation.com.br">Website</a> &middot;
  <a href="https://docs.evolutionfoundation.com.br">Documentation</a> &middot;
  <a href="https://evolutionfoundation.com.br/community">Community</a> &middot;
  <a href="mailto:suporte@evofoundation.com.br">Support</a>
</p>

---

## About

**Evo CRM Frontend** is the web interface of the Evo CRM Community — a modern React application providing the full user experience for conversations, contacts, agents, channels, automations, reports, and settings.

Built with React 19, TypeScript, Vite, TailwindCSS 4 and an in-house design system, it delivers a fast, accessible, dark-mode-first experience aligned with the Evo CRM visual identity.

## Part of the Evo CRM Community

Evo CRM Frontend is part of the [Evo CRM Community](https://github.com/evolution-foundation/evo-crm-community) ecosystem maintained by Evolution Foundation. To use the full stack, clone the umbrella repository with submodules:

```bash
git clone --recurse-submodules git@github.com:evolution-foundation/evo-crm-community.git
```

The Community Edition is **single-tenant** by design — one account, no multi-tenancy overhead, no super-admin, no billing or plans. All limits are removed and features are unlocked by default.

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| Routing | React Router 7 |
| Styling | TailwindCSS 4 |
| Design system | `@evoapi/design-system` |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| WebSocket | ActionCable |
| State | Zustand |
| i18n | i18next |
| Dates | date-fns |

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** 8+
- **Evo CRM Backend** (`evo-ai-crm-community`) running

### Installation

```bash
git clone git@github.com:evolution-foundation/evo-ai-frontend-community.git
cd evo-ai-frontend-community

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings
```

Set the API URL in `.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

### Running

```bash
pnpm run dev          # Dev server with hot reload
pnpm run build        # Production build
pnpm run preview      # Preview the production build
```

The development server runs on `http://localhost:5173`.

---

## Available Scripts

| Script | Description |
|---|---|
| `pnpm run dev` | Development server with hot reload |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm run test` | Run tests with Vitest |
| `pnpm run test:watch` | Tests in watch mode |
| `pnpm run test:coverage` | Tests with coverage report |
| `pnpm run eslint` | Run ESLint |
| `pnpm run eslint:fix` | Auto-fix ESLint issues |

---

## Architecture

### Project structure

```
src/
├── assets/           # Static resources (images, icons)
├── components/       # Reusable components
│   ├── base/         # Custom components (badges, buttons)
│   ├── layout/       # Headers, sidebars, notifications
│   └── ui/           # Design system primitives
├── contexts/         # React contexts (auth, notifications, theme)
├── hooks/            # Custom hooks
├── pages/            # Page components organized by domain
│   ├── Auth/         # Login, registration, recovery
│   ├── Customer/     # Contacts, conversations
│   ├── Admin/        # Administrative area
│   └── Settings/     # System settings
├── routes/           # Route configuration
├── services/         # API services by feature
├── styles/           # Global styles
├── types/            # TypeScript types
├── utils/            # Utilities
└── constants/        # Constants and configuration
```

### Path aliases

Configured in TypeScript and Vite for clean imports:

```typescript
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
```

Aliases: `@/components`, `@/contexts`, `@/hooks`, `@/services`, `@/pages`, `@/types`, `@/utils`, `@/styles`, `@/assets`.

For full code conventions, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Features

- Bearer token authentication integrated with `evo-auth-service-community`
- Real-time WebSocket notifications via ActionCable
- Dark/light theme with full design system
- Internationalization (i18n) — EN, PT-BR
- Conversations and chat with WhatsApp, Email, Web Widget channels
- Contacts management with filters, search and infinite scroll
- Channels configuration (WhatsApp, Email, SMS, etc.)
- Reports and analytics dashboards
- Toast notifications and loading states
- Responsive layout with collapsible sidebar

---

## Documentation

| Resource | Link |
|---|---|
| Website | [evolutionfoundation.com.br](https://evolutionfoundation.com.br) |
| Documentation | [docs.evolutionfoundation.com.br](https://docs.evolutionfoundation.com.br) |
| Community | [evolutionfoundation.com.br/community](https://evolutionfoundation.com.br/community) |
| Changelog | [CHANGELOG.md](./CHANGELOG.md) |
| Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Security | [SECURITY.md](./SECURITY.md) |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to submit issues, propose features, and open pull requests.

Join our [community](https://evolutionfoundation.com.br/community) to discuss ideas and collaborate.

---

## Security

For security issues, **do not open a public issue**. Email **suporte@evofoundation.com.br** or use GitHub's private vulnerability reporting. See [SECURITY.md](./SECURITY.md) for details.

---

## License

Evo CRM Frontend is licensed under the Apache License 2.0, with additional brand-protection conditions. See [LICENSE](./LICENSE) for details.

## Trademarks

"Evolution Foundation", "Evolution" and "Evo CRM Frontend" are trademarks of Evolution Foundation. See [TRADEMARKS.md](./TRADEMARKS.md) for the brand assets policy.

Third-party attributions are documented in [NOTICE](./NOTICE).

---

<p align="center">
  Made by <a href="https://evolutionfoundation.com.br">Evolution Foundation</a> · © 2026
</p>
