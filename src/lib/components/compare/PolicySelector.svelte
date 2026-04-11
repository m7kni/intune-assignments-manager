<script lang="ts">
	import { Search, ChevronDown, Check } from 'lucide-svelte';

	interface PolicyItem {
		id: string;
		displayName: string;
	}

	interface Props {
		policies: PolicyItem[];
		selected: string | null;
		label: string;
		onselect: (id: string) => void;
	}

	const { policies, selected, label, onselect }: Props = $props();

	let open = $state(false);
	let search = $state('');
	let containerEl: HTMLDivElement;

	const filteredPolicies = $derived(
		search.trim() === ''
			? policies
			: policies.filter((p) =>
					p.displayName.toLowerCase().includes(search.trim().toLowerCase())
				)
	);

	const selectedPolicy = $derived(policies.find((p) => p.id === selected));

	function handleSelect(id: string) {
		onselect(id);
		open = false;
		search = '';
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			open = false;
			search = '';
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div class="relative" bind:this={containerEl}>
	<span class="text-ink-faint mb-1 block text-xs font-medium uppercase tracking-wide">
		{label}
	</span>
	<button
		type="button"
		aria-label="{label}: {selectedPolicy?.displayName ?? 'Select a policy'}"
		onclick={() => (open = !open)}
		class="border-border bg-surface hover:border-border-hover flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors"
	>
		<span class={selectedPolicy ? 'text-ink' : 'text-muted'}>
			{selectedPolicy?.displayName ?? 'Select a policy...'}
		</span>
		<ChevronDown
			size={16}
			class="text-muted shrink-0 transition-transform {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		<div
			class="border-border bg-surface absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
		>
			<div class="border-border border-b p-2">
				<div class="relative">
					<Search
						size={14}
						class="text-muted pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
					/>
					<input
						type="text"
						placeholder="Search policies..."
						bind:value={search}
						class="border-border bg-canvas text-ink placeholder:text-muted w-full rounded-lg border py-1.5 pr-3 pl-8 text-sm focus:outline-none"
					/>
				</div>
			</div>
			<div class="max-h-60 overflow-y-auto p-1">
				{#if filteredPolicies.length === 0}
					<p class="text-muted px-3 py-4 text-center text-sm">No policies found</p>
				{:else}
					{#each filteredPolicies as policy (policy.id)}
						<button
							type="button"
							onclick={() => handleSelect(policy.id)}
							class="hover:bg-canvas-deep flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors {policy.id ===
							selected
								? 'bg-accent-light text-accent'
								: 'text-ink'}"
						>
							{#if policy.id === selected}
								<Check size={14} class="text-accent shrink-0" />
							{:else}
								<span class="w-3.5 shrink-0"></span>
							{/if}
							<span class="truncate">{policy.displayName}</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
