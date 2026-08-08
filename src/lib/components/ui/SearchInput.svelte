<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { Search, X } from 'lucide-svelte';

	interface Props {
		placeholder?: string;
		value?: string;
		debounceMs?: number;
	}

	let { placeholder = 'Search...', value = $bindable(''), debounceMs = 300 }: Props = $props();

	let internal = $state(value);

	$effect(() => {
		if (internal !== value) internal = value;
	});

	$effect(() => {
		const current = internal;
		const timeout = setTimeout(() => {
			value = current;
		}, debounceMs);
		return () => clearTimeout(timeout);
	});

	function clear() {
		internal = '';
		value = '';
	}
</script>

<div class="relative">
	<Search
		size={16}
		class="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
	/>
	<input
		type="text"
		{placeholder}
		bind:value={internal}
		data-search-input
		class="border-border bg-surface text-ink placeholder:text-muted focus:border-accent focus:ring-accent w-full rounded-xl border py-2.5 pr-9 pl-10 text-sm transition-colors focus:ring-1"
	/>
	{#if internal}
		<button
			type="button"
			onclick={clear}
			class="text-muted hover:text-ink absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 transition-colors"
			aria-label="Clear search"
		>
			<X size={14} />
		</button>
	{/if}
</div>
