<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import {
		Search,
		Swords,
		ArrowDownAZ,
		ArrowUpZA,
		SlidersHorizontal,
		ChevronRight
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import type { ConfigurationPolicy } from '$lib/types/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { listSecurityPolicies } from '$lib/graph/security';
	import { getSecurityCategoryInfo, getSecurityCategoryLabel } from '$lib/utils/security-types';
	import { getPlatformLabel } from '$lib/utils/profile-types';
	import {
		filterSecurityPolicies,
		hasActiveSecurityFilters,
		type AssignmentStatus
	} from '$lib/utils/filters';

	const categoryTabs = [
		{ id: 'all', label: 'All' },
		{ id: 'antivirus', label: 'Antivirus' },
		{ id: 'firewall', label: 'Firewall' },
		{ id: 'diskEncryption', label: 'Disk Encryption' },
		{ id: 'endpointDetectionAndResponse', label: 'EDR' },
		{ id: 'attackSurfaceReduction', label: 'ASR' },
		{ id: 'accountProtection', label: 'Account Protection' }
	];

	let policies = $state<ConfigurationPolicy[]>([]);
	let search = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let activeCategory = $state('all');
	let assignmentStatus = $state<AssignmentStatus>('all');

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA },
		{ id: 'category', label: 'By Category', icon: SlidersHorizontal }
	];

	const statusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const filteredPolicies = $derived.by(() => {
		let result = filterSecurityPolicies(policies, {
			search,
			categories: activeCategory !== 'all' ? [activeCategory] : [],
			assignmentStatus
		});

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.name.localeCompare(a.name));
		} else if (sortBy === 'category') {
			result = [...result].sort((a, b) => {
				const ca = a.templateReference?.templateFamily ?? '';
				const cb = b.templateReference?.templateFamily ?? '';
				return ca.localeCompare(cb);
			});
		}

		return result;
	});

	const filtersActive = $derived(
		hasActiveSecurityFilters(activeCategory !== 'all' ? [activeCategory] : [], assignmentStatus)
	);

	async function fetchPolicies(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			policies = await listSecurityPolicies(client);
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchPolicies();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Endpoint Security"
			icon={Swords}
			description="Browse and manage your Intune endpoint security policies"
		/>

		<!-- Category tabs -->
		<div class="mb-4">
			<Tabs tabs={categoryTabs} active={activeCategory} onchange={(id) => (activeCategory = id)} />
		</div>

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchInput placeholder="Filter policies by name..." bind:value={search} />
			</div>
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
				icon={Swords}
				title="No endpoint security policies found"
				description="Your Intune tenant doesn't have any endpoint security policies configured."
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
					{@const catInfo = getSecurityCategoryInfo(policy.templateReference?.templateFamily ?? '')}
					{@const CatIcon = catInfo?.icon ?? Swords}
					<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
						<a
							href="/security/{policy.id}"
							class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
						>
							<!-- Category icon -->
							<div
								class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
							>
								<CatIcon size={20} class="text-accent" />
							</div>

							<!-- Name and category -->
							<div class="min-w-0 flex-1">
								<p
									class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors"
								>
									{policy.name}
								</p>
								<p class="text-ink-faint truncate text-xs">
									{getSecurityCategoryLabel(policy.templateReference?.templateFamily ?? '')}
								</p>
							</div>

							<!-- Platform label (hidden on mobile) -->
							<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
								{getPlatformLabel(policy.platforms)}
							</span>

							<!-- Assignment status -->
							<Badge variant={policy.isAssigned ? 'required' : 'neutral'} dot>
								{policy.isAssigned ? 'Assigned' : 'Unassigned'}
							</Badge>

							<!-- Chevron -->
							<ChevronRight
								size={16}
								class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
							/>
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</AuthGuard>
