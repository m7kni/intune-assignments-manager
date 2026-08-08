<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		title: string;
		description?: string;
		action?: Snippet;
	}

	const { icon: Icon, title, description, action }: Props = $props();
</script>

<div class="animate-fade-in-up flex flex-col items-center justify-center py-16 text-center">
	<div class="bg-canvas-deep flex h-16 w-16 items-center justify-center rounded-2xl">
		<Icon size={28} class="text-muted" />
	</div>
	<h3 class="text-ink mt-4 text-base font-semibold">{title}</h3>
	{#if description}
		<p class="text-ink-faint mt-1 max-w-sm text-sm">{description}</p>
	{/if}
	{#if action}
		<div class="mt-4">
			{@render action()}
		</div>
	{/if}
</div>
