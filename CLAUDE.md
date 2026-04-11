# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Intune Assignments Manager — a SvelteKit web app for bulk-managing Microsoft Intune app and configuration profile assignments via the Microsoft Graph API. Deployed to Cloudflare Pages (client-side only, no server backend). All auth and API calls happen in the browser.


## Quality Checks
Always run the full build and type-check (`pnpm build`) after completing any code changes. Do not consider a task done until the build passes cleanly with zero errors.

After editing files, check for duplicate imports and stale references from the previous code. Run `pnpm lint` to catch these before proceeding.

## Svelte 5 Conventions
When working in Svelte 5 files (.svelte, .svelte.ts): use `SvelteMap` and `SvelteSet` instead of native `Map`/`Set`, use `const` (not `let`) for `$derived` runes, avoid deprecated `svelte:component` syntax, and ensure all `{#each}` blocks have unique keys.

## Debugging Guidelines
Before changing code to fix a bug, first investigate the root cause thoroughly (check git history, trace data flow, examine API responses). Do not make speculative code fixes before understanding why the issue occurs.

## Architecture / API Notes
This project uses TypeScript (primary), SvelteKit, and targets the Microsoft Graph API (use /beta prefix for Intune endpoints). When interacting with Graph API, be aware that many endpoints are deprecated or behave unexpectedly — verify endpoint availability before building features around them.

## Workflow Preferences
When creating implementation plans from todos.txt, keep the planning phase brief and present the plan for approval before exploring the entire codebase. Do not spend excessive time on exploration before producing actionable output.


## Commands

- `pnpm install` — install dependencies (pnpm is enforced via `.npmrc`)
- `pnpm dev` — start Vite dev server
- `pnpm build` — production build (outputs to `.svelte-kit/cloudflare`)
- `pnpm check` — TypeScript type-checking with svelte-check
- `pnpm lint` — ESLint (flat config, strict TS rules)
- `pnpm format` — Prettier auto-format

No test framework is configured.

## Tech Stack

- **SvelteKit 2** with **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`)
- **TypeScript** — strict mode, `noUnusedLocals`/`noUnusedParameters` enforced
- **Tailwind CSS 4** — OKLCH color tokens defined in `src/app.css` via `@theme`
- **@azure/msal-browser** — OAuth2 PKCE auth against Microsoft Entra ID
- **Zod** — runtime validation of Graph API responses
- **lucide-svelte** — icon library
- **Cloudflare Pages** — no Node.js built-ins, Web APIs only

## Architecture

### Authentication

MSAL.js handles OAuth2 popup flow entirely client-side. Auth state lives in `src/lib/stores/auth.svelte.ts` using Svelte runes. MSAL is lazy-imported on first auth action (SSR-safe with `browser` guard). Single env var: `PUBLIC_ENTRA_CLIENT_ID`.

Incremental consent is managed via `src/lib/auth/permission-check.ts` and `src/lib/stores/permissions.svelte.ts` — features that need extra Graph scopes trigger a consent popup before proceeding.

### Graph API Client (`src/lib/graph/client.ts`)

Factory function `createGraphClient(getAccessToken)` provides three methods:

- `request<T>()` — single request with retry (max 3, exponential backoff on 429)
- `fetchAll<T>()` — paginated fetch following `@odata.nextLink`
- `batch()` — batch endpoint, auto-chunks at 20 requests per batch

Custom error hierarchy: `GraphApiError` → `RateLimitError` (429), `AuthenticationError` (401), `PermissionError` (403). Errors are converted to user-friendly messages via `toFriendlyMessage()` in `src/lib/graph/errors.ts`.

Additional domain-specific Graph modules: `compliance.ts`, `security.ts`, `devices.ts`, `status.ts`, `filters.ts`, `merge.ts`.

### Bulk Assignment Flow (`src/lib/graph/execute.ts`)

Three-phase execution:

1. **Fetch** — batch GET current assignments for all selected items
2. **Merge** — combine new assignments with existing, detect conflicts (same group/target with different settings)
3. **Apply** — batch POST merged assignment lists, retry 5xx errors

The Graph `assign` endpoint **replaces all assignments**, so existing assignments must always be fetched and merged first.

### State Management

Pure Svelte runes — no external state library. Stores in `src/lib/stores/` export reactive state with `$state`/`$derived`. Caches (dashboard, groups, filters) use localStorage for persistence.

### Routing

SvelteKit file-based routing:

- `/` — Dashboard
- `/apps`, `/apps/[id]` — Browse and detail for mobile apps
- `/profiles`, `/profiles/[id]` — Browse and detail for config profiles
- `/compliance`, `/compliance/[id]` — Compliance policies
- `/security`, `/security/[id]` — Endpoint security policies
- `/devices`, `/devices/[id]` — Managed devices
- `/assign` — 5-step bulk assignment wizard
- `/audit` — Intune audit log
- `/status` — App install status reports
- `/settings` — App settings

### Type System

Three-tier validation: TypeScript interfaces → Zod schemas → business logic types. Core files in `src/lib/types/`: `graph.ts`, `schemas.ts`, `wizard.ts`. Domain-specific pairs: `compliance.ts`/`compliance-schemas.ts`, `device.ts`/`device-schemas.ts`, `security.ts`, `status.ts`/`status-schemas.ts`.

## Code Style

- **Prettier**: tabs, single quotes, no trailing commas, 100 char width
- **Imports**: use `$lib/` and `$app/` path aliases
- **Components**: PascalCase filenames, props via `$props()` destructuring
- **Svelte 5 snippets**: used for flexible content slots (e.g., `{#snippet actions()}`)
- **Graph API base**: `https://graph.microsoft.com/beta`

## Validation

Use the Claude Code Chrome MCP server to validate significant changes in a browser. Run `pnpm dev`, navigate to the URL from its output, and check that the feature works with no console errors. Not required after every change — use for new features or major modifications.