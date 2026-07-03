---
title: Developer Documentation
description: Setup, architecture, and contribution guides for the Intune Assignments Manager codebase.
tags:
  - development
  - contributing
---

# Developer Documentation

The Intune Assignments Manager is a client-side SvelteKit SPA that authenticates with Microsoft Entra ID and communicates directly with the Microsoft Graph API from the browser. This section covers local development setup, codebase architecture, and contributing changes.

<div class="grid cards" markdown>

-   :material-rocket-launch: **[Setup](setup.md)**

    ---

    Clone the repo, install dependencies, configure Azure credentials, and run the dev server.

-   :material-sitemap: **[Architecture](architecture.md)**

    ---

    System flow, routing, state management, type system, caching strategy, and bulk assignment execution.

-   :material-api: **[Graph API Client](graph-client.md)**

    ---

    Deep dive into the Graph client factory: request, fetchAll, batch methods, error hierarchy, and known API limitations.

-   :material-shield-key: **[Authentication](auth.md)**

    ---

    MSAL lazy-loading, login flow, token acquisition, incremental consent, and permission tiers.

-   :material-source-branch: **[Contributing](contributing.md)**

    ---

    Code style, component conventions, import rules, and guidelines for adding features.

</div>

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [SvelteKit](https://kit.svelte.dev/) | 2.x | Application framework and routing |
| [Svelte](https://svelte.dev/) | 5.x | UI components with runes reactivity (`$state`, `$derived`, `$effect`, `$props`) |
| [TypeScript](https://www.typescriptlang.org/) | Strict mode | Type safety with `noUnusedLocals` and `noUnusedParameters` |
| [Tailwind CSS](https://tailwindcss.com/) | 4.x | Utility-first styling with OKLCH color tokens |
| [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js) | @azure/msal-browser | OAuth2 PKCE authentication against Microsoft Entra ID |
| [Zod](https://zod.dev/) | 3.x | Runtime validation of Graph API responses |
| [Lucide](https://lucide.dev/) | lucide-svelte | Icon library |
| [pnpm](https://pnpm.io/) | Enforced via .npmrc | Package manager |
| [Cloudflare Pages](https://pages.cloudflare.com/) | adapter-cloudflare | Deployment target (no Node.js built-ins) |
