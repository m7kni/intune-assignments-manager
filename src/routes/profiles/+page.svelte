<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import ProfileRow from '$lib/components/ui/ProfileRow.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import { Search, Settings, ArrowDownAZ, ArrowUpZA, SlidersHorizontal } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { dashboardCache } from '$lib/stores/dashboard-cache.svelte';
	import type { ConfigurationPolicy, GraphPagedResponse } from '$lib/types/graph';
	import { configurationPolicySchema } from '$lib/types/schemas';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import {
		PROFILE_PLATFORM_OPTIONS,
		PROFILE_TECHNOLOGY_OPTIONS,
		filterProfiles,
		hasActiveProfileFilters,
		type AssignmentStatus
	} from '$lib/utils/filters';

	const PAGE_SIZE = 100;

	let profiles = $state<ConfigurationPolicy[]>([]);
	let nextLink = $state<string | null>(null);
	let search = $state('');
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let platformFilter = $state<string[]>([]);
	let technologyFilter = $state<string[]>([]);
	let assignmentStatus = $state<AssignmentStatus>('all');

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA },
		{ id: 'platform', label: 'By Platform', icon: SlidersHorizontal }
	];

	const statusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const filteredProfiles = $derived.by(() => {
		let result = filterProfiles(profiles, {
			search,
			platforms: platformFilter,
			technologies: technologyFilter,
			assignmentStatus
		});

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.name.localeCompare(a.name));
		} else if (sortBy === 'platform') {
			result = [...result].sort((a, b) => (a.platforms ?? '').localeCompare(b.platforms ?? ''));
		}

		return result;
	});

	const filtersActive = $derived(
		hasActiveProfileFilters(platformFilter, technologyFilter, assignmentStatus)
	);

	async function fetchProfiles(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			const response = await client.request<GraphPagedResponse<ConfigurationPolicy>>(
				'/deviceManagement/configurationPolicies',
				{
					params: {
						$top: String(PAGE_SIZE),
						$orderby: 'name',
						$select:
							'id,name,description,platforms,technologies,roleScopeTagIds,settingCount,isAssigned'
					}
				}
			);
			profiles = response.value.map(
				(item) => configurationPolicySchema.parse(item) as ConfigurationPolicy
			);
			nextLink = response['@odata.nextLink'] ?? null;

			// Side-effect: update dashboard cache
			dashboardCache.updateProfileCount(profiles.length + (nextLink ? 100 : 0));
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	async function loadMore(): Promise<void> {
		if (!nextLink || loadingMore) return;
		loadingMore = true;
		try {
			const client = getGraphClient();
			const response = await client.request<GraphPagedResponse<ConfigurationPolicy>>(nextLink);
			const newProfiles = response.value.map(
				(item) => configurationPolicySchema.parse(item) as ConfigurationPolicy
			);
			profiles = [...profiles, ...newProfiles];
			nextLink = response['@odata.nextLink'] ?? null;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loadingMore = false;
		}
	}

	$effect(() => {
		fetchProfiles();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Configuration Profiles"
			icon={Settings}
			description="Browse and manage your Intune configuration policies"
		/>

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchInput placeholder="Filter profiles by name..." bind:value={search} />
			</div>
			<MultiSelectFilter
				label="Platform"
				options={PROFILE_PLATFORM_OPTIONS}
				bind:selected={platformFilter}
			/>
			<MultiSelectFilter
				label="Technology"
				options={PROFILE_TECHNOLOGY_OPTIONS}
				bind:selected={technologyFilter}
			/>
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
				<ErrorState message={error} onretry={fetchProfiles} />
			</div>
		{/if}

		{#if loading}
			<div class="panel overflow-clip p-0">
				<div class="border-border border-b px-4 py-2.5">
					<Skeleton width="10rem" height="0.75rem" />
				</div>
				{#each Array(8) as _, i (i)}
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
		{:else if filteredProfiles.length === 0 && (search.trim() !== '' || filtersActive)}
			<EmptyState
				icon={Search}
				title="No profiles match your filters"
				description="Try adjusting your filters or search term."
			/>
		{:else if profiles.length === 0}
			<EmptyState
				icon={Settings}
				title="No configuration profiles found"
				description="Your Intune tenant doesn't have any configuration policies configured."
			/>
		{:else}
			<div class="panel overflow-clip p-0">
				<div
					class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
				>
					<p class="text-muted text-xs font-medium tracking-wide uppercase">
						{filteredProfiles.length}{filtersActive || search.trim() !== ''
							? ` of ${profiles.length}`
							: ''} profile{filteredProfiles.length !== 1 ? 's' : ''}
						{#if search.trim() !== ''}
							matching "{search.trim()}"
						{/if}
					</p>
				</div>

				{#each filteredProfiles as profile, i (profile.id)}
					<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
						<ProfileRow {profile} />
					</div>
				{/each}
			</div>

			{#if nextLink}
				<div class="mt-4 text-center">
					<Button variant="secondary" onclick={loadMore} loading={loadingMore}>
						{loadingMore ? 'Loading more...' : 'Load more profiles'}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</AuthGuard>
