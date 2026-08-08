<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { Monitor, Users, UsersRound, X } from 'lucide-svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { searchGroups } from '$lib/graph/groups';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type { Group } from '$lib/types/graph';
	import type { GroupTarget } from '$lib/types/wizard';

	// ─── Props ──────────────────────────────────────────────────────

	interface Props {
		selectedGroups: GroupTarget[];
		exclusionGroups: GroupTarget[];
		onUpdateGroups: (groups: GroupTarget[]) => void;
		onUpdateExclusionGroups: (groups: GroupTarget[]) => void;
	}

	const { selectedGroups, exclusionGroups, onUpdateGroups, onUpdateExclusionGroups }: Props =
		$props();

	// ─── Inclusion Search State ─────────────────────────────────────

	let inclusionQuery = $state('');
	let inclusionResults = $state<Group[]>([]);
	let inclusionLoading = $state(false);
	let inclusionError = $state<string | null>(null);

	// ─── Exclusion Search State ─────────────────────────────────────

	let exclusionQuery = $state('');
	let exclusionResults = $state<Group[]>([]);
	let exclusionLoading = $state(false);
	let exclusionError = $state<string | null>(null);
	let showExclusions = $state(false);

	// ─── Special Targets ────────────────────────────────────────────

	const allDevicesTarget: GroupTarget = { type: 'allDevices', displayName: 'All Devices' };
	const allUsersTarget: GroupTarget = { type: 'allUsers', displayName: 'All Users' };

	const isAllDevicesSelected = $derived(selectedGroups.some((g) => g.type === 'allDevices'));
	const isAllUsersSelected = $derived(selectedGroups.some((g) => g.type === 'allUsers'));

	// ─── Derived: Selected group chips (non-special) ────────────────

	const selectedGroupChips = $derived(selectedGroups.filter((g) => g.type === 'group'));
	const selectedSpecialChips = $derived(selectedGroups.filter((g) => g.type !== 'group'));

	// ─── Inclusion Search Effect ────────────────────────────────────

	$effect(() => {
		const query = inclusionQuery.trim();

		if (query.length < 2) {
			inclusionResults = [];
			inclusionError = null;
			return;
		}

		let cancelled = false;
		inclusionLoading = true;
		inclusionError = null;

		searchGroups(getGraphClient(), query)
			.then((results) => {
				if (!cancelled) {
					inclusionResults = results;
				}
			})
			.catch((err) => {
				if (!cancelled) {
					inclusionError = toFriendlyMessage(err);
				}
			})
			.finally(() => {
				if (!cancelled) {
					inclusionLoading = false;
				}
			});

		return () => {
			cancelled = true;
		};
	});

	// ─── Exclusion Search Effect ────────────────────────────────────

	$effect(() => {
		const query = exclusionQuery.trim();

		if (query.length < 2) {
			exclusionResults = [];
			exclusionError = null;
			return;
		}

		let cancelled = false;
		exclusionLoading = true;
		exclusionError = null;

		searchGroups(getGraphClient(), query)
			.then((results) => {
				if (!cancelled) {
					exclusionResults = results;
				}
			})
			.catch((err) => {
				if (!cancelled) {
					exclusionError = toFriendlyMessage(err);
				}
			})
			.finally(() => {
				if (!cancelled) {
					exclusionLoading = false;
				}
			});

		return () => {
			cancelled = true;
		};
	});

	// ─── Toggle Helpers ─────────────────────────────────────────────

	function isGroupSelected(groupId: string): boolean {
		return selectedGroups.some((g) => g.groupId === groupId);
	}

	function isGroupExcluded(groupId: string): boolean {
		return exclusionGroups.some((g) => g.groupId === groupId);
	}

	function toggleSpecial(target: GroupTarget): void {
		const exists = selectedGroups.some((g) => g.type === target.type);
		if (exists) {
			onUpdateGroups(selectedGroups.filter((g) => g.type !== target.type));
		} else {
			onUpdateGroups([...selectedGroups, target]);
		}
	}

	function toggleGroup(group: Group): void {
		if (isGroupSelected(group.id)) {
			onUpdateGroups(selectedGroups.filter((g) => g.groupId !== group.id));
		} else {
			// Prevent overlap: remove from exclusions if present
			if (isGroupExcluded(group.id)) {
				onUpdateExclusionGroups(exclusionGroups.filter((g) => g.groupId !== group.id));
			}
			onUpdateGroups([
				...selectedGroups,
				{ type: 'group', groupId: group.id, displayName: group.displayName }
			]);
		}
	}

	function toggleExclusionGroup(group: Group): void {
		if (isGroupExcluded(group.id)) {
			onUpdateExclusionGroups(exclusionGroups.filter((g) => g.groupId !== group.id));
		} else {
			// Prevent overlap: remove from inclusions if present
			if (isGroupSelected(group.id)) {
				onUpdateGroups(selectedGroups.filter((g) => g.groupId !== group.id));
			}
			onUpdateExclusionGroups([
				...exclusionGroups,
				{ type: 'group', groupId: group.id, displayName: group.displayName }
			]);
		}
	}

	function removeGroup(target: GroupTarget): void {
		if (target.type === 'group') {
			onUpdateGroups(selectedGroups.filter((g) => g.groupId !== target.groupId));
		} else {
			onUpdateGroups(selectedGroups.filter((g) => g.type !== target.type));
		}
	}

	function removeExclusionGroup(target: GroupTarget): void {
		onUpdateExclusionGroups(exclusionGroups.filter((g) => g.groupId !== target.groupId));
	}
</script>

<!-- ─── Pinned Special Targets ─────────────────────────────────────── -->

<div class="mb-4 space-y-2">
	<button
		type="button"
		onclick={() => toggleSpecial(allDevicesTarget)}
		class="border-border bg-surface hover:bg-canvas flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
	>
		<input
			type="checkbox"
			checked={isAllDevicesSelected}
			class="accent-accent h-4 w-4 rounded"
			tabindex={-1}
			onclick={(e: MouseEvent) => e.stopPropagation()}
			onchange={() => toggleSpecial(allDevicesTarget)}
		/>
		<div class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
			<Monitor size={16} class="text-accent" />
		</div>
		<span class="text-ink text-sm font-medium">All Devices</span>
	</button>

	<button
		type="button"
		onclick={() => toggleSpecial(allUsersTarget)}
		class="border-border bg-surface hover:bg-canvas flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
	>
		<input
			type="checkbox"
			checked={isAllUsersSelected}
			class="accent-accent h-4 w-4 rounded"
			tabindex={-1}
			onclick={(e: MouseEvent) => e.stopPropagation()}
			onchange={() => toggleSpecial(allUsersTarget)}
		/>
		<div class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
			<Users size={16} class="text-accent" />
		</div>
		<span class="text-ink text-sm font-medium">All Users</span>
	</button>
</div>

<div class="divider mb-4"></div>

<!-- ─── Selected Group Chips ───────────────────────────────────────── -->

{#if selectedGroups.length > 0}
	<div class="mb-4 flex flex-wrap gap-2">
		{#each selectedSpecialChips as target (target.type)}
			<span
				class="bg-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white"
			>
				{target.displayName}
				<button
					type="button"
					onclick={() => removeGroup(target)}
					class="hover:bg-accent-hover ml-0.5 rounded-full p-0.5 transition-colors"
					aria-label="Remove {target.displayName}"
				>
					<X size={14} />
				</button>
			</span>
		{/each}
		{#each selectedGroupChips as target (target.groupId)}
			<span
				class="bg-accent-light text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
			>
				{target.displayName}
				<button
					type="button"
					onclick={() => removeGroup(target)}
					class="hover:bg-canvas-deep ml-0.5 rounded-full p-0.5 transition-colors"
					aria-label="Remove {target.displayName}"
				>
					<X size={14} />
				</button>
			</span>
		{/each}
	</div>
{/if}

<!-- ─── Inclusion Group Search ─────────────────────────────────────── -->

<div class="mb-4">
	<SearchInput placeholder="Search groups..." bind:value={inclusionQuery} debounceMs={300} />
</div>

{#if inclusionLoading}
	<div class="flex justify-center py-6">
		<Spinner label="Searching groups..." size="sm" />
	</div>
{:else if inclusionError}
	<p class="text-ember px-4 py-3 text-sm">{inclusionError}</p>
{:else if inclusionQuery.trim().length < 2}
	<p class="text-muted px-4 py-3 text-sm">Type at least 2 characters to search groups</p>
{:else if inclusionResults.length === 0}
	<p class="text-muted px-4 py-3 text-sm">No groups found matching "{inclusionQuery.trim()}"</p>
{:else}
	<div class="border-border mb-4 max-h-72 overflow-y-auto rounded-lg border">
		{#each inclusionResults as group (group.id)}
			{@const selected = isGroupSelected(group.id)}
			{@const isDynamic = group.groupTypes.includes('DynamicMembership')}
			<button
				type="button"
				onclick={() => toggleGroup(group)}
				class="border-border hover:bg-canvas flex w-full cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-b-0"
			>
				<input
					type="checkbox"
					checked={selected}
					class="accent-accent h-4 w-4 shrink-0 rounded"
					tabindex={-1}
					onclick={(e: MouseEvent) => e.stopPropagation()}
					onchange={() => toggleGroup(group)}
				/>
				<div class="bg-canvas-deep flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
					<UsersRound size={14} class="text-muted" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="text-ink truncate text-sm font-medium">{group.displayName}</span>
						{#if isDynamic}
							<span class="text-muted shrink-0 text-xs">(Dynamic)</span>
						{/if}
					</div>
					{#if group.description}
						<p class="text-muted truncate text-xs">{group.description}</p>
					{/if}
				</div>
			</button>
		{/each}
	</div>
{/if}

<!-- ─── Exclusion Groups Section ───────────────────────────────────── -->

<div class="divider mb-4"></div>

<div>
	<div class="flex items-center gap-3 rounded-lg px-2 py-2">
		<Toggle
			checked={showExclusions}
			onchange={(v) => (showExclusions = v)}
			label="Toggle exclusion groups"
		/>
		<span class="text-ink text-sm font-medium">Add exclusion groups</span>
		{#if exclusionGroups.length > 0}
			<span class="bg-ember-light text-ember rounded-full px-2 py-0.5 text-xs font-medium">
				{exclusionGroups.length}
			</span>
		{/if}
	</div>

	{#if showExclusions}
		<div class="mt-3 space-y-4 pl-1">
			<!-- Exclusion Chips -->
			{#if exclusionGroups.length > 0}
				<div class="flex flex-wrap gap-2">
					{#each exclusionGroups as target (target.groupId)}
						<span
							class="bg-ember-light text-ember inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
						>
							{target.displayName}
							<button
								type="button"
								onclick={() => removeExclusionGroup(target)}
								class="hover:bg-ember/10 ml-0.5 rounded-full p-0.5 transition-colors"
								aria-label="Remove exclusion {target.displayName}"
							>
								<X size={14} />
							</button>
						</span>
					{/each}
				</div>
			{/if}

			<!-- Exclusion Search -->
			<SearchInput
				placeholder="Search groups to exclude..."
				bind:value={exclusionQuery}
				debounceMs={300}
			/>

			{#if exclusionLoading}
				<div class="flex justify-center py-6">
					<Spinner label="Searching groups..." size="sm" />
				</div>
			{:else if exclusionError}
				<p class="text-ember px-4 py-3 text-sm">{exclusionError}</p>
			{:else if exclusionQuery.trim().length < 2}
				<p class="text-muted px-4 py-3 text-sm">Type at least 2 characters to search groups</p>
			{:else if exclusionResults.length === 0}
				<p class="text-muted px-4 py-3 text-sm">
					No groups found matching "{exclusionQuery.trim()}"
				</p>
			{:else}
				<div class="border-border max-h-72 overflow-y-auto rounded-lg border">
					{#each exclusionResults as group (group.id)}
						{@const excluded = isGroupExcluded(group.id)}
						{@const isDynamic = group.groupTypes.includes('DynamicMembership')}
						<button
							type="button"
							onclick={() => toggleExclusionGroup(group)}
							class="border-border hover:bg-canvas flex w-full cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-left transition-colors last:border-b-0"
						>
							<input
								type="checkbox"
								checked={excluded}
								class="accent-ember h-4 w-4 shrink-0 rounded"
								tabindex={-1}
								onclick={(e: MouseEvent) => e.stopPropagation()}
								onchange={() => toggleExclusionGroup(group)}
							/>
							<div
								class="bg-canvas-deep flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
							>
								<UsersRound size={14} class="text-muted" />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-ink truncate text-sm font-medium">
										{group.displayName}
									</span>
									{#if isDynamic}
										<span class="text-muted shrink-0 text-xs">(Dynamic)</span>
									{/if}
								</div>
								{#if group.description}
									<p class="text-muted truncate text-xs">{group.description}</p>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
