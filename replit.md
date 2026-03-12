# Workspace

## Overview

Full-stack messaging application with email/password authentication, iMessage-style chat UI, and real-time polling. Designed to be deployable to Render or run locally (no Replit-specific auth).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite + TailwindCSS v4 + Framer Motion
- **Auth**: Custom email/password with bcrypt + express-session + connect-pg-simple
- **Build**: esbuild (CJS bundle for server), Vite (frontend)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port from $PORT)
│   └── messaging-app/      # React frontend (port from $PORT)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Features

- **Email/password auth**: Signup, login, logout with bcrypt password hashing
- **Session management**: PostgreSQL-backed sessions via connect-pg-simple
- **Conversations**: Create 1:1 conversations, list with last message preview
- **Messages**: iMessage-style chat view, 3-second polling for new messages
- **User search**: Search by name to start new conversations
- **Responsive UI**: Mobile-friendly sidebar with dark mode design

## Database Schema

Tables: `users`, `conversations`, `conversation_participants`, `messages`, `session` (auto-created by connect-pg-simple)

- `users`: id (UUID), email, passwordHash, firstName, lastName, createdAt
- `conversations`: id (serial), name (nullable), createdAt, updatedAt
- `conversation_participants`: conversationId, userId
- `messages`: id (serial), conversationId, senderId, content, createdAt

## API Endpoints

- `POST /api/auth/signup` — Create account (email, password, firstName, lastName)
- `POST /api/auth/login` — Login (email, password)
- `POST /api/auth/logout` — Logout
- `GET /api/auth/user` — Get current user (returns `{ user: null }` if not logged in)
- `GET /api/conversations` — List user's conversations with last message preview
- `POST /api/conversations` — Create conversation (`{ participantIds, name? }`)
- `GET /api/conversations/:id` — Get conversation details
- `GET /api/conversations/:id/messages` — List messages (oldest first)
- `POST /api/conversations/:id/messages` — Send message (`{ content }`)
- `GET /api/users/search?q=` — Search users by name

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provided by Replit)
- `SESSION_SECRET` — Secret for express-session (defaults to dev string if not set)
- `NODE_ENV` — `development` or `production` (affects cookie security)
- `PORT` — Port for each service (auto-set by Replit per artifact)
- `BASE_PATH` — URL base path for frontend (auto-set by Replit per artifact)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — cross-package imports resolve via project refs

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with session-based auth.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, session middleware, auth middleware, routes at `/api`
- Routes: `src/routes/` — auth.ts, conversations.ts, users.ts, health.ts
- Middleware: `src/middlewares/authMiddleware.ts` — loads user from session
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

### `artifacts/messaging-app` (`@workspace/messaging-app`)

React frontend with iMessage-style chat UI.

- Auth pages: `src/pages/AuthPage.tsx` — login/signup with animated form
- Main page: `src/pages/Home.tsx` — sidebar + chat area with 3s message polling
- Components: `src/components/Avatar.tsx`, `src/components/NewChatDialog.tsx`
- Auth hook: `src/hooks/use-auth.ts` — wraps API client auth hooks
- Dark theme, purple/violet primary color, Plus Jakarta Sans display font

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)
- Push schema: `pnpm --filter @workspace/db run push`
- Force push: `pnpm --filter @workspace/db run push-force`

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval config for codegen.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Run via `pnpm --filter @workspace/scripts run <script>`.

## Deployment (Render)

Required env vars: `DATABASE_URL`, `SESSION_SECRET` (random string), `NODE_ENV=production`
- API server: `pnpm --filter @workspace/api-server run build && node artifacts/api-server/dist/index.cjs`
- Frontend: `pnpm --filter @workspace/messaging-app run build`, serve `artifacts/messaging-app/dist/public`
