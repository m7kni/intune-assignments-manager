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
	import CompliancePolicyRow from '$lib/components/ui/CompliancePolicyRow.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import { Search, ShieldAlert, ArrowDownAZ, ArrowUpZA, SlidersHorizontal } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import type { GraphPagedResponse } from '$lib/types/graph';
	import type { DeviceCompliancePolicy } from '$lib/types/compliance';
	import { deviceCompliancePolicySchema } from '$lib/types/compliance-schemas';
	import { getCompliancePlatformInfo } from '$lib/utils/compliance-types';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import {
		COMPLIANCE_PLATFORM_OPTIONS,
		filterCompliancePolicies,
		hasActiveComplianceFilters,
		type AssignmentStatus
	} from '$lib/utils/filters';

	const PAGE_SIZE = 100;

	let policies = $state<DeviceCompliancePolicy[]>([]);
	let nextLink = $state<string | null>(null);
	let search = $state('');
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let platformFilter = $state<string[]>([]);
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

	const filteredPolicies = $derived.by(() => {
		let result = filterCompliancePolicies(policies, {
			search,
			platforms: platformFilter,
			assignmentStatus
		});

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.displayName.localeCompare(a.displayName));
		} else if (sortBy === 'platform') {
			result = [...result].sort((a, b) => {
				const pa = getCompliancePlatformInfo(a['@odata.type']).platform;
				const pb = getCompliancePlatformInfo(b['@odata.type']).platform;
				return pa.localeCompare(pb);
			});
		}

		return result;
	});

	const filtersActive = $derived(hasActiveComplianceFilters(platformFilter, assignmentStatus));

	async function fetchPolicies(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			const response = await client.request<GraphPagedResponse<DeviceCompliancePolicy>>(
				'/deviceManagement/deviceCompliancePolicies',
				{
					params: {
						$top: String(PAGE_SIZE),
						$orderby: 'displayName'
					}
				}
			);
			policies = response.value.map(
				(item) => deviceCompliancePolicySchema.parse(item) as DeviceCompliancePolicy
			);
			nextLink = response['@odata.nextLink'] ?? null;
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
			const response = await client.request<GraphPagedResponse<DeviceCompliancePolicy>>(nextLink);
			const newPolicies = response.value.map(
				(item) => deviceCompliancePolicySchema.parse(item) as DeviceCompliancePolicy
			);
			policies = [...policies, ...newPolicies];
			nextLink = response['@odata.nextLink'] ?? null;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loadingMore = false;
		}
	}

	$effect(() => {
		fetchPolicies();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Compliance Policies"
			icon={ShieldAlert}
			description="Browse and manage your Intune compliance policies"
		/>

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchInput placeholder="Filter policies by name..." bind:value={search} />
			</div>
			<MultiSelectFilter
				label="Platform"
				options={COMPLIANCE_PLATFORM_OPTIONS}
				bind:selected={platformFilter}
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
				<ErrorState message={error} onretry={fetchPolicies} />
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
		{:else if filteredPolicies.length === 0 && (search.trim() !== '' || filtersActive)}
			<EmptyState
				icon={Search}
				title="No policies match your filters"
				description="Try adjusting your filters or search term."
			/>
		{:else if policies.length === 0}
			<EmptyState
				icon={ShieldAlert}
				title="No compliance policies found"
				description="Your Intune tenant doesn't have any compliance policies configured."
			/>
		{:else}
			<div class="panel overflow-clip p-0">
				<div
					class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
				>
					<p class="text-muted text-xs font-medium tracking-wide uppercase">
						{filteredPolicies.length}{filtersActive || search.trim() !== ''
							? ` of ${policies.length}`
							: ''} polic{filteredPolicies.length !== 1 ? 'ies' : 'y'}
						{#if search.trim() !== ''}
							matching "{search.trim()}"
						{/if}
					</p>
				</div>

				{#each filteredPolicies as policy, i (policy.id)}
					<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
						<CompliancePolicyRow {policy} />
					</div>
				{/each}
			</div>

			{#if nextLink}
				<div class="mt-4 text-center">
					<Button variant="secondary" onclick={loadMore} loading={loadingMore}>
						{loadingMore ? 'Loading more...' : 'Load more policies'}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</AuthGuard>
