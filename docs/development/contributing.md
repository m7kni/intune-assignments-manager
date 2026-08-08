---
title: Contributing
description: Code style, conventions, and guidelines for contributing to the Intune Assignments Manager.
tags:
  - development
  - contributing
---

# Contributing

## Code Style

### Prettier

The project uses Prettier for formatting. Run it before committing:

```bash
pnpm format
```

Configuration (from `.prettierrc`):

| Setting         | Value          |
| --------------- | -------------- |
| Indentation     | Tabs           |
| Quotes          | Single quotes  |
| Trailing commas | None           |
| Print width     | 100 characters |

### TypeScript

TypeScript is configured in strict mode with additional constraints:

- `noUnusedLocals: true` — no unused local variables
- `noUnusedParameters: true` — no unused function parameters
- Always type function return values for public APIs
- Avoid `any` — use `unknown` and narrow with type guards

Run the type checker:

```bash
pnpm check
```

### ESLint

ESLint uses a flat config (`eslint.config.js`) with strict TypeScript rules:

```bash
pnpm lint
```

!!! note "Pre-existing warnings"
There are approximately 31 pre-existing ESLint warnings in the codebase (unused `_` variables in `{#each}` blocks, some `any` types). These are known and should not block your changes. Avoid introducing new warnings.

## Svelte 5 Runes

This project uses **Svelte 5** exclusively. Do **not** use Svelte 4 patterns:

| Use (Svelte 5)           | Do NOT use (Svelte 4)                      |
| ------------------------ | ------------------------------------------ |
| `$state(initialValue)`   | `writable(initialValue)`                   |
| `$derived(expression)`   | `$:` reactive declarations                 |
| `$effect(() => { ... })` | `$:` reactive statements with side effects |
| `$props()`               | `export let prop`                          |
| `{#snippet name()}`      | `<slot name="...">`                        |

### Reactive state in `.svelte.ts` files

Store files use the `.svelte.ts` extension to enable runes outside of components:

```typescript
// src/lib/stores/example.svelte.ts
let count = $state(0);
const doubled = $derived(count * 2);

export const counter = {
	get count() {
		return count;
	},
	get doubled() {
		return doubled;
	},
	increment() {
		count++;
	}
};
```

Export reactive state via getter functions so consumers get live reactivity.

## Component Conventions

### File naming

Components use **PascalCase** filenames: `Button.svelte`, `AssignmentRow.svelte`, `CsvImportDialog.svelte`.

### Props

Always destructure props using `$props()`:

```svelte
<script lang="ts">
	interface Props {
		label: string;
		variant?: 'primary' | 'secondary';
		onclick?: () => void;
	}

	let { label, variant = 'primary', onclick }: Props = $props();
</script>
```

### Snippets for flexible content

Use Svelte 5 snippets instead of slots for composable content areas:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		actions?: Snippet;
		children: Snippet;
	}

	let { title, actions, children }: Props = $props();
</script>

<div class="card">
	<div class="card-header">
		<h2>{title}</h2>
		{#if actions}
			{@render actions()}
		{/if}
	</div>
	{@render children()}
</div>
```

## Import Aliases

Always use SvelteKit path aliases. Never use relative imports that cross directory boundaries:

```typescript
// Correct
import { auth } from '$lib/stores/auth.svelte';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

// Incorrect
import { auth } from '../../stores/auth.svelte';
import { auth } from '../lib/stores/auth.svelte';
```

The available aliases:

| Alias   | Resolves to                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `$lib/` | `src/lib/`                                                                  |
| `$app/` | SvelteKit runtime modules (`environment`, `navigation`, `stores`)           |
| `$env/` | Environment variables (`static/public`, `static/private`, `dynamic/public`) |

## Graph API Modules

New features that interact with Microsoft Graph should follow the existing pattern:

1. Create a module in `src/lib/graph/` — one file per domain (e.g., `apps.ts`, `configurations.ts`, `groups.ts`)
2. Accept a `GraphClient` as the first parameter
3. Use Zod schemas to validate responses
4. Throw typed errors from `$lib/graph/errors`

Example:

```typescript
// src/lib/graph/widgets.ts
import type { GraphClient } from '$lib/graph/client';
import type { Widget } from '$lib/types/graph';
import { widgetSchema } from '$lib/types/schemas';

export async function listWidgets(client: GraphClient): Promise<Widget[]> {
	return client.fetchAll<Widget>('/deviceManagement/widgets');
}

export async function getWidget(client: GraphClient, id: string): Promise<Widget> {
	const result = await client.request<Widget>(`/deviceManagement/widgets/${id}`);
	return widgetSchema.parse(result);
}
```

## Adding a New Route

1. Create a page component at `src/routes/name/+page.svelte`
2. Wrap the page content in `<AuthGuard>` to require authentication
3. Use `<PermissionGuard>` if the page needs scopes beyond Tier 1

```svelte
<!-- src/routes/devices/+page.svelte -->
<script lang="ts">
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<AuthGuard>
	<PermissionGuard feature="/devices">
		<PageHeader title="Devices" description="Managed device inventory" />
		<!-- Page content -->
	</PermissionGuard>
</AuthGuard>
```

The `feature` prop on `PermissionGuard` maps to the route prefix in the permission system (see [Authentication - Permission Tiers](auth.md#permission-tiers)).

## Cloudflare Pages Constraint

The app is deployed to Cloudflare Pages, which does **not** support Node.js built-in modules. All code must use Web APIs only:

| Instead of...    | Use...                                       |
| ---------------- | -------------------------------------------- |
| `fs`             | Not applicable (client-side only)            |
| `path`           | String manipulation or `URL`                 |
| `crypto`         | `crypto.subtle` (Web Crypto API)             |
| `http` / `https` | `fetch`                                      |
| `url.parse()`    | `new URL()`                                  |
| `Buffer`         | `Uint8Array` / `TextEncoder` / `TextDecoder` |

## Testing

The project currently has **no automated test framework** configured. Quality assurance relies on:

- TypeScript strict mode (`pnpm check`)
- ESLint (`pnpm lint`)
- Manual testing against a real Intune tenant

When making changes, verify:

1. `pnpm check` passes with no new errors
2. `pnpm lint` shows no new warnings
3. `pnpm build` succeeds
4. The feature works correctly when tested against an Intune tenant (if applicable)
