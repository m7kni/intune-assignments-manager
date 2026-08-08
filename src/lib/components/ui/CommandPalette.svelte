<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		LayoutDashboard,
		Grid3x3,
		Settings,
		ClipboardList,
		Layers,
		Sun,
		Moon,
		LogOut,
		Search
	} from 'lucide-svelte';
	import { commandPalette } from '$lib/stores/command-palette.svelte';
	import { setTheme } from '$lib/stores/theme.svelte';
	import { logout } from '$lib/stores/auth.svelte';
	import Kbd from './Kbd.svelte';

	let inputEl = $state<HTMLInputElement>();
	let query = $state('');
	let selectedIndex = $state(0);

	interface CommandItem {
		id: string;
		label: string;
		group: string;
		icon: any;
		action: () => void;
		keywords?: string;
	}

	const navigationItems: CommandItem[] = [
		{
			id: 'nav-dashboard',
			label: 'Dashboard',
			group: 'Navigation',
			icon: LayoutDashboard,
			action: () => goto('/'),
			keywords: 'home'
		},
		{
			id: 'nav-apps',
			label: 'Applications',
			group: 'Navigation',
			icon: Grid3x3,
			action: () => goto('/apps'),
			keywords: 'apps mobile'
		},
		{
			id: 'nav-profiles',
			label: 'Configuration Profiles',
			group: 'Navigation',
			icon: Settings,
			action: () => goto('/profiles'),
			keywords: 'config policies'
		},
		{
			id: 'nav-audit',
			label: 'Audit Log',
			group: 'Navigation',
			icon: ClipboardList,
			action: () => goto('/audit'),
			keywords: 'events history'
		},
		{
			id: 'nav-assign',
			label: 'Bulk Assign',
			group: 'Navigation',
			icon: Layers,
			action: () => goto('/assign'),
			keywords: 'wizard'
		}
	];

	const actionItems: CommandItem[] = [
		{
			id: 'action-light',
			label: 'Switch to Light Mode',
			group: 'Actions',
			icon: Sun,
			action: () => setTheme('light'),
			keywords: 'theme'
		},
		{
			id: 'action-dark',
			label: 'Switch to Dark Mode',
			group: 'Actions',
			icon: Moon,
			action: () => setTheme('dark'),
			keywords: 'theme'
		},
		{
			id: 'action-signout',
			label: 'Sign Out',
			group: 'Actions',
			icon: LogOut,
			action: () => logout(),
			keywords: 'logout disconnect'
		}
	];

	const allItems = $derived([...navigationItems, ...actionItems, ...commandPalette.dynamicItems]);

	const filteredItems = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return allItems;
		return allItems.filter(
			(item) =>
				item.label.toLowerCase().includes(q) ||
				item.group.toLowerCase().includes(q) ||
				(item.keywords?.toLowerCase().includes(q) ?? false)
		);
	});

	const groupedItems = $derived.by(() => {
		const groups: Record<string, CommandItem[]> = {};
		for (const item of filteredItems) {
			if (!groups[item.group]) groups[item.group] = [];
			groups[item.group].push(item);
		}
		return groups;
	});

	function executeItem(item: CommandItem) {
		commandPalette.close();
		query = '';
		selectedIndex = 0;
		item.action();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredItems[selectedIndex]) {
				executeItem(filteredItems[selectedIndex]);
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			commandPalette.close();
			query = '';
			selectedIndex = 0;
		}
	}

	$effect(() => {
		if (commandPalette.isOpen && inputEl) {
			query = '';
			selectedIndex = 0;
			// Small delay to ensure dialog is rendered
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	// Reset selection when query changes
	$effect(() => {
		void query;
		selectedIndex = 0;
	});
</script>

{#if commandPalette.isOpen}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
		onclick={() => {
			commandPalette.close();
			query = '';
		}}
		aria-label="Close command palette"
		tabindex="-1"
	></button>

	<!-- Palette -->
	<div
		class="animate-scale-in fixed top-[20%] left-1/2 z-[201] w-full max-w-lg -translate-x-1/2"
		role="dialog"
		aria-label="Command palette"
	>
		<div class="border-border bg-surface overflow-hidden rounded-xl border shadow-lg">
			<!-- Search input -->
			<div class="border-border flex items-center gap-3 border-b px-4">
				<Search size={18} class="text-muted shrink-0" />
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={handleKeydown}
					placeholder="Type a command or search..."
					class="text-ink placeholder:text-muted w-full bg-transparent py-3.5 text-sm focus:outline-none"
				/>
				<Kbd keys="Esc" />
			</div>

			<!-- Results -->
			<div class="max-h-80 overflow-y-auto p-2">
				{#if filteredItems.length === 0}
					<p class="text-muted px-3 py-6 text-center text-sm">No results found</p>
				{:else}
					{@const flatIndex = { current: 0 }}
					{#each Object.entries(groupedItems) as [group, items] (group)}
						<div class="mb-1">
							<p class="text-muted px-3 py-1.5 text-xs font-medium">{group}</p>
							{#each items as item (item.id)}
								{@const idx = flatIndex.current++}
								{@const Icon = item.icon}
								<button
									onclick={() => executeItem(item)}
									class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors {idx ===
									selectedIndex
										? 'bg-accent text-white'
										: 'text-ink hover:bg-canvas'}"
								>
									<Icon size={16} class={idx === selectedIndex ? 'text-white/80' : 'text-muted'} />
									{item.label}
								</button>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
