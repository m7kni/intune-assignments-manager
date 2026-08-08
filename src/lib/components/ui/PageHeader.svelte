<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		icon?: any;
		actions?: Snippet;
	}

	const { title, description, icon: Icon, actions }: Props = $props();
</script>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class="flex items-center gap-3">
		{#if Icon}
			<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
				<Icon size={20} class="text-accent" />
			</div>
		{/if}
		<div>
			<h1 class="text-ink text-2xl font-bold tracking-tight">{title}</h1>
			{#if description}
				<p class="text-ink-faint mt-0.5 text-sm">{description}</p>
			{/if}
		</div>
	</div>
	{#if actions}
		<div class="flex shrink-0 gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
