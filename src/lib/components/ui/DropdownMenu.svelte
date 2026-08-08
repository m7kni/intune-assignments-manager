<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { IconComponent } from '$lib/types/ui';
	import type { Snippet } from 'svelte';
	import { ChevronDown } from 'lucide-svelte';

	interface MenuItem {
		id: string;
		label: string;
		icon?: IconComponent;
	}

	interface Props {
		items: MenuItem[];
		selected?: string;
		label?: string;
		onselect: (id: string) => void;
		trigger?: Snippet;
	}

	const { items, selected, label = 'Options', onselect, trigger }: Props = $props();

	let open = $state(false);
	let menuEl: HTMLDivElement;

	function handleSelect(id: string) {
		onselect(id);
		open = false;
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
	{#if trigger}
		<button type="button" onclick={() => (open = !open)}>
			{@render trigger()}
		</button>
	{:else}
		<button
			type="button"
			onclick={() => (open = !open)}
			class="border-border bg-surface text-ink hover:bg-canvas hover:border-border-hover inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors"
			aria-haspopup="menu"
			aria-expanded={open}
		>
			{label}
			<ChevronDown size={14} class="text-muted transition-transform {open ? 'rotate-180' : ''}" />
		</button>
	{/if}

	{#if open}
		<div
			role="menu"
			class="border-border bg-surface animate-slide-down absolute right-0 z-50 mt-1 min-w-44 overflow-hidden rounded-xl border p-1 shadow-lg"
		>
			{#each items as item (item.id)}
				{@const Icon = item.icon}
				<button
					role="menuitem"
					onclick={() => handleSelect(item.id)}
					class="hover:bg-canvas flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {selected ===
					item.id
						? 'text-accent font-medium'
						: 'text-ink'}"
				>
					{#if Icon}
						<Icon size={16} class="text-muted" />
					{/if}
					{item.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
