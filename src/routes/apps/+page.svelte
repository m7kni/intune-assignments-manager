<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import AppRow from '$lib/components/ui/AppRow.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import { Search, AppWindow, ArrowDownAZ, ArrowUpZA, SlidersHorizontal } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { dashboardCache } from '$lib/stores/dashboard-cache.svelte';
	import type { MobileApp } from '$lib/types/graph';
	import { listApps } from '$lib/graph/apps';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import {
		APP_PLATFORM_OPTIONS,
		deriveAppTypeOptions,
		filterApps,
		hasActiveAppFilters,
		type AssignmentStatus
	} from '$lib/utils/filters';

	let apps = $state<MobileApp[]>([]);
	let search = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let platformFilter = $state<string[]>([]);
	let appTypeFilter = $state<string[]>([]);
	let assignmentStatus = $state<AssignmentStatus>('all');

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA },
		{ id: 'type', label: 'By Type', icon: SlidersHorizontal }
	];

	const statusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const appTypeOptions = $derived(deriveAppTypeOptions(apps));

	const filteredApps = $derived.by(() => {
		let result = filterApps(apps, {
			search,
			platforms: platformFilter,
			appTypes: appTypeFilter,
			assignmentStatus
		});

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.displayName.localeCompare(a.displayName));
		} else if (sortBy === 'type') {
			result = [...result].sort((a, b) =>
				(a['@odata.type'] ?? '').localeCompare(b['@odata.type'] ?? '')
			);
		}

		return result;
	});

	const filtersActive = $derived(
		hasActiveAppFilters(platformFilter, appTypeFilter, assignmentStatus)
	);

	async function fetchApps(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			apps = await listApps(client, { orderBy: 'displayName' });
			dashboardCache.updateAppCount(apps.length);
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchApps();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Applications"
			icon={AppWindow}
			description="Browse and manage your Intune mobile applications"
		/>

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchInput placeholder="Filter apps by name..." bind:value={search} />
			</div>
			<MultiSelectFilter
				label="Platform"
				options={APP_PLATFORM_OPTIONS}
				bind:selected={platformFilter}
			/>
			<MultiSelectFilter label="App Type" options={appTypeOptions} bind:selected={appTypeFilter} />
			<div class="flex gap-1" role="radiogroup" aria-label="Assignment status">
				{#each statusOptions as option (option.id)}
					<button
						type="button"
						role="radio"
						aria-checked={assignmentStatus === option.id}
						onclick={() => (assignmentStatus = option.id)}
						class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {assignmentStatus ===
						option.id
							? 'border-accent bg-accent text-white'
							: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
			<DropdownMenu
				items={sortOptions}
				selected={sortBy}
				label="Sort"
				onselect={(id) => (sortBy = id)}
			/>
		</div>

		{#if error}
			<div class="mb-4">
				<ErrorState message={error} onretry={fetchApps} />
			</div>
		{/if}

		{#if loading}
			<div class="panel overflow-clip p-0">
				<div class="border-border border-b px-4 py-2.5">
					<Skeleton width="10rem" height="0.75rem" />
				</div>
				{#each Array(8) as _, i}
					<div class="border-border flex items-center gap-4 border-b px-4 py-3">
						<Skeleton width="2.5rem" height="2.5rem" rounded="lg" />
						<div class="flex-1 space-y-1">
							<Skeleton width="{60 - i * 3}%" height="0.875rem" />
							<Skeleton width="30%" height="0.75rem" />
						</div>
						<Skeleton width="4rem" height="1.25rem" rounded="full" />
					</div>
				{/each}
			</div>
		{:else if filteredApps.length === 0 && (search.trim() !== '' || filtersActive)}
			<EmptyState
				icon={Search}
				title="No apps match your filters"
				description="Try adjusting your filters or search term."
			/>
		{:else if apps.length === 0}
			<EmptyState
				icon={AppWindow}
				title="No applications found"
				description="Your Intune tenant doesn't have any mobile apps configured."
			/>
		{:else}
			<div class="panel overflow-clip p-0">
				<!-- Sticky list header -->
				<div
					class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
				>
					<p class="text-muted text-xs font-medium tracking-wide uppercase">
						{filteredApps.length}{filtersActive || search.trim() !== '' ? ` of ${apps.length}` : ''} application{filteredApps.length !==
						1
							? 's'
							: ''}
						{#if search.trim() !== ''}
							matching "{search.trim()}"
						{/if}
					</p>
				</div>

				{#each filteredApps as app, i (app.id)}
					<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
						<AppRow {app} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</AuthGuard>
