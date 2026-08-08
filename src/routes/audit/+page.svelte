<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import { Search, ClipboardList, ChevronDown, ChevronRight, RefreshCw } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { listAuditEvents, fetchAuditNextPage, buildAuditFilter } from '$lib/graph/audit';
	import type { AuditEvent } from '$lib/types/graph';
	import { AUDIT_CATEGORY_OPTIONS, AUDIT_RESULT_OPTIONS } from '$lib/utils/filters';

	let events = $state<AuditEvent[]>([]);
	let nextLink = $state<string | null>(null);
	let totalCount = $state<number | undefined>(undefined);
	let search = $state('');
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let expandedId = $state<string | null>(null);

	// Server-side filters (sent as OData $filter, trigger re-fetch)
	let dateFrom = $state('');
	let dateTo = $state('');
	let categoryFilter = $state<string[]>([]);
	let assignmentOnly = $state(false);

	// Client-side filters
	let resultFilter = $state<string[]>([]);

	// Date presets
	function setPreset(days: number | null) {
		if (days === null) {
			dateFrom = '';
			dateTo = '';
		} else if (days === 0) {
			const today = new Date().toISOString().split('T')[0];
			dateFrom = today;
			dateTo = today;
		} else {
			const now = new Date();
			const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
			dateFrom = from.toISOString().split('T')[0];
			dateTo = now.toISOString().split('T')[0];
		}
		applyFilters();
	}

	const filteredEvents = $derived.by(() => {
		let result = events;

		// Result filter (client-side)
		if (resultFilter.length > 0) {
			const results = new Set(resultFilter);
			result = result.filter((evt) => results.has(evt.activityResult));
		}

		// Text search (client-side)
		const q = search.trim().toLowerCase();
		if (q) {
			result = result.filter((evt) => {
				const activity = evt.activity ?? '';
				const displayName = evt.displayName ?? '';
				const componentName = evt.componentName ?? '';
				return (
					activity.toLowerCase().includes(q) ||
					displayName.toLowerCase().includes(q) ||
					(evt.actor.userPrincipalName?.toLowerCase().includes(q) ?? false) ||
					componentName.toLowerCase().includes(q) ||
					evt.category.toLowerCase().includes(q) ||
					evt.resources.some((r) => (r.displayName ?? '').toLowerCase().includes(q))
				);
			});
		}

		return result;
	});

	function resultVariant(result: string): 'required' | 'uninstall' | 'neutral' {
		const lower = result.toLowerCase();
		if (lower === 'success') return 'required';
		if (lower === 'failure') return 'uninstall';
		return 'neutral';
	}

	function formatDateTime(iso: string): string {
		try {
			return new Date(iso).toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return iso;
		}
	}

	function primaryResource(evt: AuditEvent): string {
		if (evt.resources.length === 0) return '-';
		return evt.resources[0].displayName ?? evt.resources[0].type ?? '-';
	}

	async function fetchEvents(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			const filter = buildAuditFilter({
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
				categories: categoryFilter.length > 0 ? categoryFilter : undefined,
				assignmentOnly
			});
			const result = await listAuditEvents(client, { filter, top: 50 });
			events = result.events;
			nextLink = result.nextLink;
			totalCount = result.totalCount;
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
			const result = await fetchAuditNextPage(client, nextLink);
			events = [...events, ...result.events];
			nextLink = result.nextLink;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loadingMore = false;
		}
	}

	function applyFilters(): void {
		fetchEvents();
	}

	function toggleExpand(id: string): void {
		expandedId = expandedId === id ? null : id;
	}

	function isPresetActive(days: number | null): boolean {
		if (days === null) return !dateFrom && !dateTo;
		if (days === 0) return dateFrom === new Date().toISOString().split('T')[0];
		return false;
	}

	$effect(() => {
		fetchEvents();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Audit Log"
			icon={ClipboardList}
			description="Browse and review all Intune audit events across your tenant"
		/>

		<!-- Date presets -->
		<div class="mb-4 flex flex-wrap gap-2">
			{#each [{ label: 'Today', days: 0 }, { label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: 'All time', days: null }] as preset (preset.label)}
				<button
					onclick={() => setPreset(preset.days)}
					class="border-border hover:border-accent hover:text-accent rounded-full border px-3 py-1 text-xs font-medium transition-colors {isPresetActive(
						preset.days
					)
						? 'bg-accent border-accent text-white'
						: 'text-ink-faint'}"
				>
					{preset.label}
				</button>
			{/each}
		</div>

		<!-- Filter bar -->
		<div class="panel mb-4 flex flex-wrap items-end gap-3 p-4">
			<div class="flex flex-col gap-1">
				<label for="audit-date-from" class="text-muted text-xs font-medium">From</label>
				<input
					id="audit-date-from"
					type="date"
					bind:value={dateFrom}
					class="border-border bg-surface text-ink focus:border-accent focus:ring-accent rounded-lg border px-3 py-1.5 text-sm focus:ring-1"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="audit-date-to" class="text-muted text-xs font-medium">To</label>
				<input
					id="audit-date-to"
					type="date"
					bind:value={dateTo}
					class="border-border bg-surface text-ink focus:border-accent focus:ring-accent rounded-lg border px-3 py-1.5 text-sm focus:ring-1"
				/>
			</div>

			<MultiSelectFilter
				label="Category"
				options={AUDIT_CATEGORY_OPTIONS}
				bind:selected={categoryFilter}
				onchange={() => applyFilters()}
			/>

			<MultiSelectFilter
				label="Result"
				options={AUDIT_RESULT_OPTIONS}
				bind:selected={resultFilter}
			/>

			<button
				onclick={() => {
					assignmentOnly = !assignmentOnly;
					applyFilters();
				}}
				class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {assignmentOnly
					? 'bg-accent border-accent text-white'
					: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
			>
				Assignments only
			</button>

			<Button variant="primary" size="sm" icon={RefreshCw} onclick={applyFilters}>Refresh</Button>
		</div>

		<!-- Search -->
		<div class="mb-4">
			<SearchInput
				placeholder="Filter events by activity, user, or resource..."
				bind:value={search}
			/>
		</div>

		{#if error}
			<div class="mb-4">
				<ErrorState message={error} onretry={fetchEvents} />
			</div>
		{/if}

		{#if loading}
			<div class="panel overflow-hidden p-0">
				<div class="border-border border-b px-4 py-2.5">
					<Skeleton width="10rem" height="0.75rem" />
				</div>
				{#each Array(6) as _, i (i)}
					<div class="border-border flex items-center gap-3 border-b px-4 py-3">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.75rem" />
						</div>
						<Skeleton width="3.5rem" height="1.25rem" rounded="full" />
					</div>
				{/each}
			</div>
		{:else if filteredEvents.length === 0 && search.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No events match your search"
				description="Try a different search term or clear your filter."
			/>
		{:else if events.length === 0}
			<EmptyState
				icon={ClipboardList}
				title="No audit events found"
				description="No audit events match the current filters. Try widening your date range or clearing filters."
			/>
		{:else}
			<div class="panel overflow-hidden p-0">
				<div class="border-border border-b px-4 py-2.5">
					<p class="text-muted text-xs font-medium tracking-wide uppercase">
						{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
						{#if totalCount !== undefined}
							of {totalCount} total
						{/if}
						{#if search.trim() !== ''}
							matching "{search.trim()}"
						{/if}
					</p>
				</div>

				{#each filteredEvents as evt (evt.id)}
					<!-- Event row -->
					<button
						onclick={() => toggleExpand(evt.id)}
						class="border-border hover:bg-canvas flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors"
					>
						<span class="text-muted shrink-0">
							{#if expandedId === evt.id}
								<ChevronDown size={16} />
							{:else}
								<ChevronRight size={16} />
							{/if}
						</span>

						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{evt.activity ?? evt.displayName ?? 'Unknown activity'}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{evt.actor.userPrincipalName ?? evt.actor.applicationDisplayName ?? 'System'}
								<span class="text-muted mx-1">&middot;</span>
								{evt.category}
							</p>
						</div>

						<span class="text-ink-faint hidden truncate text-xs sm:block sm:max-w-48">
							{primaryResource(evt)}
						</span>

						<Badge variant={resultVariant(evt.activityResult)} dot>
							{evt.activityResult}
						</Badge>

						<span class="text-muted hidden text-xs whitespace-nowrap md:block">
							{formatDateTime(evt.activityDateTime)}
						</span>
					</button>

					<!-- Expanded detail with slide transition -->
					{#if expandedId === evt.id}
						<div
							transition:slide={{ duration: 200 }}
							class="border-border bg-canvas border-b px-4 py-4 pl-11"
						>
							<div class="grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Activity</span
									>
									<p class="text-ink">{evt.activity ?? '-'}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Timestamp</span
									>
									<p class="text-ink">{formatDateTime(evt.activityDateTime)}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Component</span
									>
									<p class="text-ink">{evt.componentName ?? '-'}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase">User</span>
									<p class="text-ink">{evt.actor.userPrincipalName ?? '-'}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Category</span
									>
									<p class="text-ink">{evt.category}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Operation</span
									>
									<p class="text-ink">{evt.activityOperationType}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Correlation ID</span
									>
									<p class="text-ink font-mono text-xs">{evt.correlationId}</p>
								</div>
								<div>
									<span class="text-muted text-xs font-medium tracking-wide uppercase">Result</span>
									<p class="text-ink">{evt.activityResult}</p>
								</div>
							</div>

							<!-- Resources -->
							{#if evt.resources.length > 0}
								<div class="mt-4">
									<span class="text-muted text-xs font-medium tracking-wide uppercase"
										>Resources</span
									>
									{#each evt.resources as resource, i (resource.resourceId ?? i)}
										<div class="panel-inset mt-2">
											<p class="text-ink text-sm font-medium">
												{resource.displayName ?? resource.type ?? 'Unknown'}
											</p>
											<p class="text-ink-faint text-xs">{resource.auditResourceType ?? '-'}</p>

											{#if resource.modifiedProperties.length > 0}
												<div class="mt-2 space-y-2">
													{#each resource.modifiedProperties as prop (prop.displayName)}
														<div class="border-border bg-surface rounded-lg border p-2">
															<p class="text-ink text-xs font-medium">{prop.displayName}</p>
															<div class="mt-1 grid gap-1 text-xs sm:grid-cols-2">
																{#if prop.oldValue}
																	<div>
																		<span class="text-ember font-medium">Old:</span>
																		<span class="text-muted ml-1 font-mono break-all"
																			>{prop.oldValue}</span
																		>
																	</div>
																{/if}
																{#if prop.newValue}
																	<div>
																		<span class="text-success font-medium">New:</span>
																		<span class="text-muted ml-1 font-mono break-all"
																			>{prop.newValue}</span
																		>
																	</div>
																{/if}
															</div>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>

			{#if nextLink && search.trim() === ''}
				<div class="mt-4 text-center">
					<Button variant="secondary" onclick={loadMore} loading={loadingMore}>
						{loadingMore ? 'Loading more...' : 'Load more events'}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</AuthGuard>
