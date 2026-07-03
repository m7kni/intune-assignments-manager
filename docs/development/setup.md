---
title: Local Development Setup
description: How to clone, install, configure, and run the Intune Assignments Manager locally.
tags:
  - development
  - setup
---

# Local Development Setup

## Prerequisites

- **Node.js** >= 20
- **pnpm** (enforced via `.npmrc` — npm and yarn will not work)

Install pnpm if you don't have it:

```bash
# Option A: corepack (built into Node.js >= 16.13)
corepack enable
corepack prepare pnpm@latest --activate

# Option B: npm global install
npm install -g pnpm
```

## Clone and Install

```bash
git clone https://github.com/your-org/intune-assignments-manager.git
cd intune-assignments-manager
pnpm install
```

## Environment Configuration

Create a `.env` file in the project root with your Azure app registration client ID:

```bash
PUBLIC_ENTRA_CLIENT_ID=your-client-id-here
```

See `.env.example` for the template. This is the only environment variable required.

### Azure App Registration

You need a Microsoft Entra ID (Azure AD) app registration to authenticate:

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com) > **App registrations**
2. Create or select your app registration
3. Copy the **Application (client) ID** into your `.env` file
4. Under **Authentication**, add a **Single-page application** platform with the redirect URI:
    ```text
    http://localhost:5173
    ```
5. Ensure the following **delegated** API permissions are granted (Tier 1 scopes):
    - `User.Read`
    - `DeviceManagementApps.ReadWrite.All`
    - `DeviceManagementConfiguration.ReadWrite.All`
    - `Group.Read.All`

!!! note
    The redirect URI must match your dev server URL exactly. SvelteKit defaults to `http://localhost:5173`.

## Dev Server

```bash
pnpm dev
```

Opens the app at [http://localhost:5173](http://localhost:5173). Vite provides hot module replacement for instant feedback during development.

## Type Checking

```bash
pnpm check
```

Runs `svelte-check` with TypeScript in strict mode. This catches type errors across both `.ts` and `.svelte` files.

## Linting

```bash
pnpm lint
```

Runs ESLint with a flat config and strict TypeScript rules.

!!! note
    There are approximately 31 pre-existing lint warnings in the codebase (unused `_` variables in `{#each}` blocks, some `any` types). These are known and should not be treated as blockers.

## Formatting

```bash
pnpm format
```

Runs Prettier with the project's configuration: tabs, single quotes, no trailing commas, 100-character line width.

## Production Build

```bash
pnpm build
```

Builds the app using the Cloudflare Pages adapter. Output goes to `.svelte-kit/cloudflare/`.

!!! warning "Cloudflare Pages Constraint"
    The production build runs on Cloudflare's edge runtime, which does **not** support Node.js built-in modules. You must use only Web APIs:

    - `fetch` instead of `http`/`https`
    - `URL` instead of `url.parse`
    - `crypto.subtle` instead of `crypto`
    - No `fs`, `path`, `os`, `child_process`, etc.

    Since this is a client-side-only app (no server routes), this primarily affects build-time code and any shared utilities.

## Commands Reference

| Command | Description |
|---|---|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Production build for Cloudflare Pages |
| `pnpm check` | TypeScript type-checking via svelte-check |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Auto-format with Prettier |
