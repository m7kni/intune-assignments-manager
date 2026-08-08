<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { page } from '$app/state';
	import { ChevronRight, Search } from 'lucide-svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import Kbd from './Kbd.svelte';
	import Tooltip from './Tooltip.svelte';
	import { commandPalette } from '$lib/stores/command-palette.svelte';

	const routeLabels: Record<string, string> = {
		'/': 'Dashboard',
		'/apps': 'Applications',
		'/profiles': 'Configuration Profiles',
		'/audit': 'Audit Log',
		'/assign': 'Bulk Assign'
	};

	const breadcrumbs = $derived.by(() => {
		const pathname = page.url.pathname;
		const parts: { label: string; href: string }[] = [];

		if (pathname === '/') {
			parts.push({ label: 'Dashboard', href: '/' });
			return parts;
		}

		const segments = pathname.split('/').filter(Boolean);
		let currentPath = '';

		for (let i = 0; i < segments.length; i++) {
			currentPath += '/' + segments[i];
			const label = routeLabels[currentPath];

			if (label) {
				parts.push({ label, href: currentPath });
			} else if (i > 0) {
				// Detail page — use the ID segment as a breadcrumb
				parts.push({ label: segments[i], href: currentPath });
			}
		}

		return parts;
	});
</script>

<div
	class="border-border bg-surface/80 sticky top-0 z-30 hidden border-b backdrop-blur-sm md:block"
>
	<div class="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<!-- Breadcrumbs -->
		<nav aria-label="Breadcrumb" class="flex items-center gap-1 text-sm">
			{#each breadcrumbs as crumb, i (crumb.href)}
				{#if i > 0}
					<ChevronRight size={14} class="text-muted" />
				{/if}
				{#if i === breadcrumbs.length - 1}
					<span class="text-ink font-medium">{crumb.label}</span>
				{:else}
					<a href={crumb.href} class="text-muted hover:text-ink transition-colors">
						{crumb.label}
					</a>
				{/if}
			{/each}
		</nav>

		<!-- Right side actions -->
		<div class="flex items-center gap-2">
			<Tooltip text="Theme">
				<ThemeToggle />
			</Tooltip>

			<button
				onclick={() => commandPalette.open()}
				class="border-border bg-canvas text-muted hover:border-border-hover hover:text-ink inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors"
				aria-label="Open command palette"
			>
				<Search size={14} />
				<span class="hidden lg:inline">Search...</span>
				<Kbd keys="\u2318K" />
			</button>
		</div>
	</div>
</div>
