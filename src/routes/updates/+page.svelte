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
		RefreshCw,
		ArrowDownAZ,
		ArrowUpZA,
		ChevronRight
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import {
		listUpdateRings,
		listFeatureUpdateProfiles,
		listQualityUpdateProfiles,
		listDriverUpdateProfiles
	} from '$lib/graph/updates';
	import { getUpdateCategoryInfo, formatDeferralPeriod } from '$lib/utils/update-types';
	import type { UpdateItem } from '$lib/types/updates';

	const categoryTabs = [
		{ id: 'all', label: 'All' },
		{ id: 'updateRing', label: 'Update Rings' },
		{ id: 'featureUpdate', label: 'Feature Updates' },
		{ id: 'qualityUpdate', label: 'Quality Updates' },
		{ id: 'driverUpdate', label: 'Driver Updates' }
	];

	let items = $state<UpdateItem[]>([]);
	let search = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let activeCategory = $state('all');

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA }
	];

	function getItemName(item: UpdateItem): string {
		return item.data.displayName;
	}

	function getItemHref(item: UpdateItem): string {
		switch (item.category) {
			case 'updateRing':
				return `/updates/rings/${item.data.id}`;
			case 'featureUpdate':
				return `/updates/feature/${item.data.id}`;
			case 'qualityUpdate':
				return `/updates/quality/${item.data.id}`;
			case 'driverUpdate':
				return `/updates/drivers/${item.data.id}`;
		}
	}

	const filteredItems = $derived.by(() => {
		let result = items;

		if (activeCategory !== 'all') {
			result = result.filter((i) => i.category === activeCategory);
		}

		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter(
				(i) =>
					getItemName(i).toLowerCase().includes(q) ||
					(i.data.description ?? '').toLowerCase().includes(q)
			);
		}

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) =>
				getItemName(b).localeCompare(getItemName(a))
			);
		} else {
			result = [...result].sort((a, b) =>
				getItemName(a).localeCompare(getItemName(b))
			);
		}

		return result;
	});

	const filtersActive = $derived(activeCategory !== 'all');

	async function fetchAll(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			const [rings, features, quality, drivers] = await Promise.all([
				listUpdateRings(client),
				listFeatureUpdateProfiles(client),
				listQualityUpdateProfiles(client),
				listDriverUpdateProfiles(client)
			]);

			const allItems: UpdateItem[] = [
				...rings.map(
					(data) =>
						({ category: 'updateRing' as const, data })
				),
				...features.map(
					(data) =>
						({ category: 'featureUpdate' as const, data })
				),
				...quality.map(
					(data) =>
						({ category: 'qualityUpdate' as const, data })
				),
				...drivers.map(
					(data) =>
						({ category: 'driverUpdate' as const, data })
				)
			];

			items = allItems;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	function getUpdateRingSummary(item: UpdateItem): string {
		if (item.category !== 'updateRing') return '';
		const d = item.data;
		const parts: string[] = [];
		parts.push(`Quality: ${formatDeferralPeriod(d.qualityUpdatesDeferralPeriodInDays)}`);
		parts.push(`Feature: ${formatDeferralPeriod(d.featureUpdatesDeferralPeriodInDays)}`);
		return parts.join(' \u00b7 ');
	}

	function isUpdateRingPaused(item: UpdateItem): boolean {
		if (item.category !== 'updateRing') return false;
		return item.data.qualityUpdatesPaused || item.data.featureUpdatesPaused;
	}

	function getFeatureUpdateSummary(item: UpdateItem): string {
		if (item.category !== 'featureUpdate') return '';
		const d = item.data;
		const parts: string[] = [];
		if (d.featureUpdateVersion) parts.push(`Target: ${d.featureUpdateVersion}`);
		if (d.rolloutSettings?.offerStartDateTimeInUTC) {
			parts.push(
				`Start: ${new Date(d.rolloutSettings.offerStartDateTimeInUTC).toLocaleDateString()}`
			);
		}
		return parts.join(' \u00b7 ') || 'No version configured';
	}

	function getQualityUpdateSummary(item: UpdateItem): string {
		if (item.category !== 'qualityUpdate') return '';
		const d = item.data;
		return d.releaseDateDisplayName ?? 'Quality update profile';
	}

	function isExpedited(item: UpdateItem): boolean {
		if (item.category !== 'qualityUpdate') return false;
		return item.data.expeditedUpdateSettings !== null;
	}

	function getDriverUpdateSummary(item: UpdateItem): string {
		if (item.category !== 'driverUpdate') return '';
		const d = item.data;
		return `Approval: ${d.approvalType === 'automatic' ? 'Automatic' : 'Manual'}`;
	}

	function getItemSummary(item: UpdateItem): string {
		switch (item.category) {
			case 'updateRing':
				return getUpdateRingSummary(item);
			case 'featureUpdate':
				return getFeatureUpdateSummary(item);
			case 'qualityUpdate':
				return getQualityUpdateSummary(item);
			case 'driverUpdate':
				return getDriverUpdateSummary(item);
		}
	}

	$effect(() => {
		fetchAll();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Windows Updates"
			icon={RefreshCw}
			description="Browse and manage your Windows update rings and profiles"
		/>

		<!-- Category tabs -->
		<div class="mb-4">
			<Tabs
				tabs={categoryTabs}
				active={activeCategory}
				onchange={(id) => (activeCategory = id)}
			/>
		</div>

		<!-- Filter bar -->
		<div class="mb-4 flex flex-wrap items-center gap-3">
			<div class="min-w-0 flex-1">
				<SearchInput placeholder="Filter updates by name..." bind:value={search} />
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
				<ErrorState message={error} onretry={fetchAll} />
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
		{:else if filteredItems.length === 0 && (search.trim() !== '' || filtersActive)}
			<EmptyState
				icon={Search}
				title="No updates match your filters"
				description="Try adjusting your filters or search term."
			/>
		{:else if items.length === 0}
			<EmptyState
				icon={RefreshCw}
				title="No Windows update policies found"
				description="Your Intune tenant doesn't have any Windows update policies configured."
			/>
		{:else}
			<div class="panel overflow-clip p-0">
				<div
					class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
				>
					<p class="text-muted text-xs font-medium tracking-wide uppercase">
						{filteredItems.length}{filtersActive || search.trim() !== ''
							? ` of ${items.length}`
							: ''} polic{filteredItems.length !== 1 ? 'ies' : 'y'}
						{#if search.trim() !== ''}
							matching "{search.trim()}"
						{/if}
					</p>
				</div>

				{#each filteredItems as item, i (item.data.id)}
					{@const catInfo = getUpdateCategoryInfo(item.category)}
					{@const CatIcon = catInfo.icon}
					<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
						<a
							href={getItemHref(item)}
							class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
						>
							<!-- Category icon -->
							<div
								class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
							>
								<CatIcon size={20} class="text-accent" />
							</div>

							<!-- Name and summary -->
							<div class="min-w-0 flex-1">
								<p
									class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors"
								>
									{getItemName(item)}
								</p>
								<p class="text-ink-faint truncate text-xs">
									{getItemSummary(item)}
								</p>
							</div>

							<!-- Category label (hidden on mobile) -->
							<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
								{catInfo.label}
							</span>

							<!-- Status badges -->
							{#if item.category === 'updateRing' && isUpdateRingPaused(item)}
								<Badge variant="available">Paused</Badge>
							{/if}
							{#if item.category === 'qualityUpdate' && isExpedited(item)}
								<Badge variant="info">Expedited</Badge>
							{/if}
							{#if item.category === 'driverUpdate'}
								<Badge
									variant={item.data.approvalType === 'automatic'
										? 'required'
										: 'neutral'}
								>
									{item.data.approvalType === 'automatic' ? 'Auto' : 'Manual'}
								</Badge>
							{/if}

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
