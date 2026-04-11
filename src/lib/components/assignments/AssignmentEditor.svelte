<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { Monitor, Users, UsersRound } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { searchGroups } from '$lib/graph/groups';
	import { ensureFiltersLoaded } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type {
		AssignmentIntent,
		AssignmentTarget,
		AssignmentFilter,
		Group
	} from '$lib/types/graph';

	type TargetKind = 'allDevices' | 'allUsers' | 'group';

	interface Props {
		open: boolean;
		mode: 'add' | 'edit';
		itemKind: 'app' | 'profile' | 'compliance' | 'security' | 'script';
		existingTarget?: AssignmentTarget;
		existingIntent?: AssignmentIntent | null;
		existingTargetName?: string;
		onSave: (target: AssignmentTarget, intent: AssignmentIntent | null) => void;
		onCancel: () => void;
	}

	const {
		open,
		mode,
		itemKind,
		existingTarget,
		existingIntent,
		existingTargetName,
		onSave,
		onCancel
	}: Props = $props();

	// ─── Dialog ref ────────────────────────────────────────────────────

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			resetState();
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	// ─── Target state ──────────────────────────────────────────────────

	let targetKind = $state<TargetKind>('group');
	let selectedGroupId = $state('');
	let selectedGroupName = $state('');
	let isExclusion = $state(false);

	// ─── Intent state ──────────────────────────────────────────────────

	let intent = $state<AssignmentIntent>('required');

	// ─── Filter state ──────────────────────────────────────────────────

	let filterEnabled = $state(false);
	let filters = $state<AssignmentFilter[]>([]);
	let filtersLoading = $state(false);
	let selectedFilterId = $state('');
	let selectedFilterType = $state<'include' | 'exclude'>('include');

	// ─── Group search state ────────────────────────────────────────────

	let groupQuery = $state('');
	let groupResults = $state<Group[]>([]);
	let groupLoading = $state(false);
	let groupError = $state<string | null>(null);

	// ─── Intent options ────────────────────────────────────────────────

	const intentOptions: {
		value: AssignmentIntent;
		label: string;
		description: string;
		badgeVariant: 'required' | 'available' | 'uninstall';
	}[] = [
		{
			value: 'required',
			label: 'Required',
			description: 'Must be installed on targeted devices',
			badgeVariant: 'required'
		},
		{
			value: 'available',
			label: 'Available',
			description: 'Appears in Company Portal for users to install',
			badgeVariant: 'available'
		},
		{
			value: 'availableWithoutEnrollment',
			label: 'Available (No Enrollment)',
			description: 'Available without device enrollment',
			badgeVariant: 'available'
		},
		{
			value: 'uninstall',
			label: 'Uninstall',
			description: 'Will be removed from targeted devices',
			badgeVariant: 'uninstall'
		}
	];

	// ─── Derived ───────────────────────────────────────────────────────

	const canSave = $derived(targetKind !== 'group' || selectedGroupId !== '');
	const showIntentSelector = $derived(itemKind === 'app' && !isExclusion);

	// ─── Reset state for open ──────────────────────────────────────────

	function resetState(): void {
		if (mode === 'edit' && existingTarget) {
			// Populate from existing
			const t = existingTarget;
			if (t['@odata.type'] === '#microsoft.graph.allDevicesAssignmentTarget') {
				targetKind = 'allDevices';
				selectedGroupId = '';
				selectedGroupName = '';
				isExclusion = false;
			} else if (t['@odata.type'] === '#microsoft.graph.allLicensedUsersAssignmentTarget') {
				targetKind = 'allUsers';
				selectedGroupId = '';
				selectedGroupName = '';
				isExclusion = false;
			} else if (t['@odata.type'] === '#microsoft.graph.exclusionGroupAssignmentTarget') {
				targetKind = 'group';
				selectedGroupId = t.groupId;
				selectedGroupName = existingTargetName ?? t.groupId;
				isExclusion = true;
			} else {
				targetKind = 'group';
				selectedGroupId = (t as { groupId: string }).groupId;
				selectedGroupName = existingTargetName ?? (t as { groupId: string }).groupId;
				isExclusion = false;
			}
			intent = (existingIntent as AssignmentIntent) ?? 'required';

			// Restore filter state
			const filterId = t.deviceAndAppManagementAssignmentFilterId;
			if (filterId) {
				filterEnabled = true;
				selectedFilterId = filterId;
				selectedFilterType =
					t.deviceAndAppManagementAssignmentFilterType === 'exclude' ? 'exclude' : 'include';
				loadFilters();
			} else {
				filterEnabled = false;
				selectedFilterId = '';
				selectedFilterType = 'include';
			}
		} else {
			// Defaults for add mode
			targetKind = 'group';
			selectedGroupId = '';
			selectedGroupName = '';
			isExclusion = false;
			intent = 'required';
			filterEnabled = false;
			selectedFilterId = '';
			selectedFilterType = 'include';
		}
		groupQuery = '';
		groupResults = [];
		groupError = null;
	}

	// ─── Group search effect ───────────────────────────────────────────

	$effect(() => {
		const query = groupQuery.trim();
		if (query.length < 2) {
			groupResults = [];
			groupError = null;
			return;
		}

		let cancelled = false;
		groupLoading = true;
		groupError = null;

		searchGroups(getGraphClient(), query)
			.then((results) => {
				if (!cancelled) groupResults = results;
			})
			.catch((err) => {
				if (!cancelled) groupError = toFriendlyMessage(err);
			})
			.finally(() => {
				if (!cancelled) groupLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});

	// ─── Filter loading ────────────────────────────────────────────────

	async function loadFilters(): Promise<void> {
		filtersLoading = true;
		try {
			filters = await ensureFiltersLoaded(getGraphClient());
		} catch {
			// Silently fail — filter is optional
		} finally {
			filtersLoading = false;
		}
	}

	function handleFilterToggle(): void {
		filterEnabled = !filterEnabled;
		if (filterEnabled) {
			loadFilters();
		} else {
			selectedFilterId = '';
			selectedFilterType = 'include';
		}
	}

	// ─── Actions ───────────────────────────────────────────────────────

	function selectGroup(group: Group): void {
		selectedGroupId = group.id;
		selectedGroupName = group.displayName;
		groupQuery = '';
		groupResults = [];
	}

	function handleSave(): void {
		const filterFields =
			filterEnabled && selectedFilterId
				? {
						deviceAndAppManagementAssignmentFilterId: selectedFilterId,
						deviceAndAppManagementAssignmentFilterType: selectedFilterType as 'include' | 'exclude'
					}
				: {
						deviceAndAppManagementAssignmentFilterId: null as string | null,
						deviceAndAppManagementAssignmentFilterType: 'none' as const
					};

		let target: AssignmentTarget;

		if (targetKind === 'allDevices') {
			target = {
				'@odata.type': '#microsoft.graph.allDevicesAssignmentTarget',
				...filterFields
			};
		} else if (targetKind === 'allUsers') {
			target = {
				'@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget',
				...filterFields
			};
		} else if (isExclusion) {
			target = {
				'@odata.type': '#microsoft.graph.exclusionGroupAssignmentTarget',
				groupId: selectedGroupId,
				...filterFields
			};
		} else {
			target = {
				'@odata.type': '#microsoft.graph.groupAssignmentTarget',
				groupId: selectedGroupId,
				...filterFields
			};
		}

		const resolvedIntent =
			itemKind === 'profile' || itemKind === 'compliance' || itemKind === 'security' || itemKind === 'script' || isExclusion ? null : intent;
		onSave(target, resolvedIntent);
	}

	function handleClose(): void {
		onCancel();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleClose}
	class="border-border bg-surface animate-scale-in w-full max-w-lg rounded-xl border p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
	<div class="border-border border-b px-6 py-4">
		<h2 class="text-ink text-lg font-semibold">
			{mode === 'add' ? 'Add Assignment' : 'Edit Assignment'}
		</h2>
	</div>

	<div class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
		<!-- Target selection -->
		<div>
			<h3 class="text-ink mb-3 text-sm font-semibold">Target</h3>

			{#if mode === 'edit'}
				<!-- In edit mode, show the current target as read-only -->
				<div class="border-border bg-canvas flex items-center gap-3 rounded-lg border px-4 py-3">
					{#if targetKind === 'allDevices'}
						<div
							class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
						>
							<Monitor size={16} class="text-accent" />
						</div>
						<span class="text-ink text-sm font-medium">All Devices</span>
					{:else if targetKind === 'allUsers'}
						<div
							class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
						>
							<Users size={16} class="text-accent" />
						</div>
						<span class="text-ink text-sm font-medium">All Users</span>
					{:else}
						<div
							class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
						>
							<UsersRound size={16} class="text-muted" />
						</div>
						<span class="text-ink text-sm font-medium">
							{selectedGroupName}
							{#if isExclusion}
								<Badge variant="exclude">Excluded</Badge>
							{/if}
						</span>
					{/if}
				</div>
			{:else}
				<!-- Add mode: full target picker -->
				<!-- Special targets -->
				<div class="mb-3 flex gap-2">
					<button
						type="button"
						onclick={() => {
							targetKind = 'allDevices';
							selectedGroupId = '';
							selectedGroupName = '';
						}}
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {targetKind ===
						'allDevices'
							? 'border-accent bg-accent-light ring-accent ring-1'
							: 'border-border hover:border-accent'}"
					>
						<Monitor size={14} class="text-accent" />
						All Devices
					</button>
					<button
						type="button"
						onclick={() => {
							targetKind = 'allUsers';
							selectedGroupId = '';
							selectedGroupName = '';
						}}
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {targetKind ===
						'allUsers'
							? 'border-accent bg-accent-light ring-accent ring-1'
							: 'border-border hover:border-accent'}"
					>
						<Users size={14} class="text-accent" />
						All Users
					</button>
					<button
						type="button"
						onclick={() => (targetKind = 'group')}
						class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {targetKind ===
						'group'
							? 'border-accent bg-accent-light ring-accent ring-1'
							: 'border-border hover:border-accent'}"
					>
						<UsersRound size={14} class="text-muted" />
						Group
					</button>
				</div>

				{#if targetKind === 'group'}
					<!-- Selected group chip -->
					{#if selectedGroupId}
						<div
							class="bg-accent-light text-accent mb-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
						>
							{selectedGroupName}
							<button
								type="button"
								onclick={() => {
									selectedGroupId = '';
									selectedGroupName = '';
								}}
								class="hover:bg-canvas-deep ml-0.5 rounded-full p-0.5"
							>
								&times;
							</button>
						</div>
					{/if}

					<!-- Group search -->
					<SearchInput placeholder="Search groups..." bind:value={groupQuery} debounceMs={300} />

					{#if groupLoading}
						<div class="flex justify-center py-4">
							<Spinner size="sm" label="Searching..." />
						</div>
					{:else if groupError}
						<p class="text-ember mt-2 text-sm">{groupError}</p>
					{:else if groupQuery.trim().length >= 2 && groupResults.length === 0}
						<p class="text-muted mt-2 text-sm">No groups found</p>
					{:else if groupResults.length > 0}
						<div class="border-border mt-2 max-h-48 overflow-y-auto rounded-lg border">
							{#each groupResults as group (group.id)}
								<button
									type="button"
									onclick={() => selectGroup(group)}
									class="border-border hover:bg-canvas flex w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors last:border-b-0"
								>
									<div
										class="bg-canvas-deep flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
									>
										<UsersRound size={14} class="text-muted" />
									</div>
									<div class="min-w-0 flex-1">
										<span class="text-ink truncate text-sm font-medium">
											{group.displayName}
										</span>
										{#if group.description}
											<p class="text-muted truncate text-xs">{group.description}</p>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{/if}

					<!-- Exclusion toggle -->
					<div class="mt-3 flex items-center gap-3">
						<Toggle
							checked={isExclusion}
							onchange={(v) => (isExclusion = v)}
							label="Exclude this group"
						/>
						<span class="text-ink text-sm">Exclude this group</span>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Intent selector (apps only, not for exclusions) -->
		{#if showIntentSelector}
			<div>
				<h3 class="text-ink mb-3 text-sm font-semibold">Intent</h3>
				<div class="space-y-2">
					{#each intentOptions as option (option.value)}
						{@const isSelected = intent === option.value}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors {isSelected
								? 'border-accent bg-accent-light ring-accent ring-1'
								: 'border-border bg-surface hover:bg-canvas'}"
						>
							<input
								type="radio"
								name="editor-intent"
								value={option.value}
								checked={isSelected}
								onchange={() => (intent = option.value)}
								class="sr-only"
							/>
							<span
								class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 {isSelected
									? 'border-accent'
									: 'border-muted'}"
							>
								{#if isSelected}
									<span class="bg-accent h-2 w-2 rounded-full"></span>
								{/if}
							</span>
							<div class="min-w-0">
								<span class="text-ink text-sm font-medium">{option.label}</span>
								<p class="text-muted text-xs">{option.description}</p>
							</div>
						</label>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Filter section -->
		<div>
			<h3 class="text-ink mb-3 text-sm font-semibold">Assignment Filter</h3>
			<div class="flex items-center gap-3">
				<Toggle
					checked={filterEnabled}
					onchange={() => handleFilterToggle()}
					label="Apply an assignment filter"
				/>
				<span class="text-ink text-sm">Apply an assignment filter</span>
			</div>

			{#if filterEnabled}
				<div class="mt-3 space-y-3">
					{#if filtersLoading}
						<div class="flex justify-center py-4">
							<Spinner size="sm" label="Loading filters" />
						</div>
					{:else}
						<select
							value={selectedFilterId}
							onchange={(e) => (selectedFilterId = e.currentTarget.value)}
							class="border-border bg-surface text-ink w-full rounded-lg border px-3 py-2 text-sm"
						>
							<option value="" disabled>Select a filter...</option>
							{#each filters as filter (filter.id)}
								<option value={filter.id}>{filter.displayName}</option>
							{/each}
						</select>

						{#if selectedFilterId}
							<div class="flex items-center gap-4">
								<label class="flex cursor-pointer items-center gap-2">
									<input
										type="radio"
										name="editor-filterType"
										value="include"
										checked={selectedFilterType === 'include'}
										onchange={() => (selectedFilterType = 'include')}
										class="border-border text-accent accent-accent h-4 w-4"
									/>
									<span class="text-ink text-sm">Include</span>
								</label>
								<label class="flex cursor-pointer items-center gap-2">
									<input
										type="radio"
										name="editor-filterType"
										value="exclude"
										checked={selectedFilterType === 'exclude'}
										onchange={() => (selectedFilterType = 'exclude')}
										class="border-border text-accent accent-accent h-4 w-4"
									/>
									<span class="text-ink text-sm">Exclude</span>
								</label>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
		<Button variant="ghost" onclick={handleClose}>Cancel</Button>
		<Button variant="primary" onclick={handleSave} disabled={!canSave}>
			{mode === 'add' ? 'Add Assignment' : 'Save Changes'}
		</Button>
	</div>
</dialog>
