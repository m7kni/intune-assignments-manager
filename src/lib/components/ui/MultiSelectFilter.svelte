<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { ChevronDown, X } from 'lucide-svelte';
	import type { FilterOption } from '$lib/utils/filters';

	interface Props {
		label: string;
		options: FilterOption[];
		selected?: string[];
		onchange?: (selected: string[]) => void;
	}

	let { label, options, selected = $bindable([]), onchange }: Props = $props();

	let open = $state(false);
	let menuEl: HTMLDivElement;

	const activeCount = $derived(selected.length);

	function toggle(id: string) {
		if (selected.includes(id)) {
			selected = selected.filter((s) => s !== id);
		} else {
			selected = [...selected, id];
		}
		onchange?.(selected);
	}

	function clear() {
		selected = [];
		onchange?.(selected);
	}

	function handleClickOutside(event: MouseEvent) {
		if (menuEl && !menuEl.contains(event.target as Node)) {
			open = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative" bind:this={menuEl}>
	<button
		type="button"
		onclick={() => (open = !open)}
		class="bg-surface hover:bg-canvas inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors {activeCount >
		0
			? 'border-accent/30 text-accent hover:border-accent/50'
			: 'border-border text-ink hover:border-border-hover'}"
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		{label}
		{#if activeCount > 0}
			<span
				class="bg-accent flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
			>
				{activeCount}
			</span>
		{:else}
			<ChevronDown size={14} class="text-muted transition-transform {open ? 'rotate-180' : ''}" />
		{/if}
	</button>

	{#if open}
		<div
			role="listbox"
			aria-multiselectable="true"
			class="border-border bg-surface animate-slide-down absolute left-0 z-50 mt-1 min-w-48 overflow-hidden rounded-xl border p-1 shadow-lg"
		>
			{#each options as option (option.id)}
				{@const Icon = option.icon}
				<label
					class="hover:bg-canvas flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
				>
					<input
						type="checkbox"
						class="accent-accent h-3.5 w-3.5 rounded"
						checked={selected.includes(option.id)}
						onchange={() => toggle(option.id)}
					/>
					{#if Icon}
						<Icon size={15} class="text-muted" />
					{/if}
					<span class={selected.includes(option.id) ? 'text-accent font-medium' : 'text-ink'}>
						{option.label}
					</span>
				</label>
			{/each}

			{#if activeCount > 0}
				<div class="border-border mt-1 border-t pt-1">
					<button
						type="button"
						onclick={clear}
						class="text-muted hover:text-ink flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors"
					>
						<X size={12} />
						Clear filters
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
