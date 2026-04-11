<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import AssignmentDiff from '$lib/components/assignments/AssignmentDiff.svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded } from '$lib/stores/filter-cache';
	import { getTargetKey, buildAssignmentTarget, buildExclusionTarget } from '$lib/graph/merge';
	import { computeFullDiff } from '$lib/utils/diff';
	import { AlertTriangle, ArrowRight } from 'lucide-svelte';
	import type {
		MobileAppAssignment,
		ConfigurationPolicyAssignment,
		AssignmentIntent,
		AssignmentTarget,
		BatchRequestItem,
		GraphPagedResponse
	} from '$lib/types/graph';
	import type { WizardState, AssignmentConflict, GroupTarget } from '$lib/types/wizard';
	import type { AssignmentDiffResult } from '$lib/types/diff';
	import type { DiffItemParams } from '$lib/utils/diff';

	interface Props {
		wizard: WizardState;
		conflicts: AssignmentConflict[];
		onUpdateConflicts: (conflicts: AssignmentConflict[]) => void;
	}

	const { wizard, conflicts, onUpdateConflicts }: Props = $props();

	let loading = $state(true);
	let loadError: string | null = $state(null);
	let hasLoaded = $state(false);
	let viewMode = $state<'list' | 'diff'>('list');
	let diffResult = $state<AssignmentDiffResult | null>(null);

	// ─── Derived Counts ────────────────────────────────────────────
	const allItems = $derived([
		...wizard.selectedApps.map((a) => ({ id: a.id, name: a.displayName, type: 'app' as const })),
		...wizard.selectedProfiles.map((p) => ({
			id: p.id,
			name: p.name,
			type: 'profile' as const
		})),
		...wizard.selectedCompliancePolicies.map((p) => ({
			id: p.id,
			name: p.displayName,
			type: 'compliance' as const
		})),
		...wizard.selectedSecurityPolicies.map((p) => ({
			id: p.id,
			name: p.name,
			type: 'security' as const
		}))
	]);

	const totalAssignments = $derived(
		allItems.length * (wizard.selectedGroups.length + wizard.exclusionGroups.length)
	);

	const updateCount = $derived(conflicts.filter((c) => c.resolution === 'update').length);
	const skipCount = $derived(conflicts.filter((c) => c.resolution === 'skip').length);
	const newCount = $derived(totalAssignments - conflicts.length);

	// ─── Replace mode removal tracking ─────────────────────────────
	const removalCount = $derived.by(() => {
		if (!diffResult || !wizard.replaceMode) return 0;
		return diffResult.summary.removed;
	});

	const itemsWithRemovals = $derived.by(() => {
		if (!diffResult || !wizard.replaceMode) return 0;
		return diffResult.items.filter((item) => item.entries.some((e) => e.status === 'removed'))
			.length;
	});

	// ─── Conflict Detection ────────────────────────────────────────
	async function detectConflicts(): Promise<void> {
		if (hasLoaded) {
			loading = false;
			return;
		}

		loading = true;
		loadError = null;

		try {
			const client = getGraphClient();
			const loadedFilters = await ensureFiltersLoaded(client);

			// Build batch GET requests for all items
			const batchRequests: BatchRequestItem[] = allItems.map((item) => ({
				id: item.id,
				method: 'GET' as const,
				url:
					item.type === 'app'
						? `/deviceAppManagement/mobileApps/${item.id}/assignments`
						: item.type === 'compliance'
							? `/deviceManagement/deviceCompliancePolicies/${item.id}/assignments`
							: `/deviceManagement/configurationPolicies/${item.id}/assignments`
			})); // 'profile' and 'security' both use configurationPolicies

			const responses = await client.batch(batchRequests);

			// Resolve group names for display
			const groupIds: string[] = [];
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const currentAssignmentsMap = new Map<
				string,
				(MobileAppAssignment | ConfigurationPolicyAssignment)[]
			>();

			for (const response of responses) {
				if (response.status >= 200 && response.status < 300 && response.body) {
					const body = response.body as GraphPagedResponse<
						MobileAppAssignment | ConfigurationPolicyAssignment
					>;
					const assignments = body.value ?? [];
					currentAssignmentsMap.set(response.id, assignments);
					for (const assignment of assignments) {
						const target = assignment.target;
						if ('groupId' in target) {
							groupIds.push(target.groupId);
						}
					}
				}
			}
			const uniqueGroupIds = [...new Set(groupIds)];
			const groupNames =
				uniqueGroupIds.length > 0
					? await resolveGroupNames(client, uniqueGroupIds)
					: new Map<string, string>();

			// Build target keys for the wizard's selected groups
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const wizardTargetKeys = new Map<string, { group: GroupTarget; isExclusion: boolean }>();
			for (const group of wizard.selectedGroups) {
				const target = buildAssignmentTarget(group, wizard.filterConfig);
				wizardTargetKeys.set(getTargetKey(target), { group, isExclusion: false });
			}
			for (const group of wizard.exclusionGroups) {
				const target = buildExclusionTarget(group, wizard.filterConfig);
				wizardTargetKeys.set(getTargetKey(target), { group, isExclusion: true });
			}

			// Detect conflicts
			const detected: AssignmentConflict[] = [];

			for (const response of responses) {
				if (response.status < 200 || response.status >= 300) continue;

				const item = allItems.find((i) => i.id === response.id);
				if (!item) continue;

				const body = response.body as GraphPagedResponse<
					MobileAppAssignment | ConfigurationPolicyAssignment
				>;
				for (const assignment of body.value ?? []) {
					const key = getTargetKey(assignment.target);
					const wizardTarget = wizardTargetKeys.get(key);

					if (wizardTarget) {
						// In replace mode, targets in replaced categories aren't conflicts — they're replacements
						if (wizard.replaceMode) {
							const existingIntent = assignment.intent ?? null;
							const isExclusion =
								assignment.target['@odata.type'] ===
								'#microsoft.graph.exclusionGroupAssignmentTarget';

							if (item.type === 'app' && wizard.replaceConfig.appIntents.includes(existingIntent as AssignmentIntent)) {
								continue;
							}
							if (item.type !== 'app') {
								if (!isExclusion && wizard.replaceConfig.policyInclusions) continue;
								if (isExclusion && wizard.replaceConfig.policyExclusions) continue;
							}
						}

						// Conflict: existing assignment targets the same group
						detected.push({
							itemId: item.id,
							itemName: item.name,
							itemType: item.type,
							targetDisplayName: resolveTargetDisplayName(assignment.target, groupNames),
							targetKey: key,
							existingIntent: assignment.intent ?? null,
							existingFilterId: assignment.target.deviceAndAppManagementAssignmentFilterId,
							newIntent: wizard.intent,
							newFilterConfig: wizard.filterConfig,
							resolution: 'update'
						});
					}
				}
			}

			onUpdateConflicts(detected);

			// Build filter names map for diff
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const filterNames = new Map<string, string>();
			for (const f of loadedFilters) {
				filterNames.set(f.id, f.displayName);
			}

			// Compute diff
			const diffItems: DiffItemParams[] = allItems.map((item) => ({
				itemId: item.id,
				itemName: item.name,
				itemType: item.type,
				currentAssignments: currentAssignmentsMap.get(item.id) ?? [],
				newGroups: wizard.selectedGroups,
				newExclusionGroups: wizard.exclusionGroups,
				newIntent: item.type !== 'app' ? null : wizard.intent,
				newFilter: wizard.filterConfig,
				groupNames,
				filterNames,
				replaceMode: wizard.replaceMode,
				replaceIntents: wizard.replaceConfig.appIntents,
				replaceInclusions: wizard.replaceConfig.policyInclusions,
				replaceExclusions: wizard.replaceConfig.policyExclusions
			}));

			diffResult = computeFullDiff(diffItems);
			hasLoaded = true;
		} catch (err) {
			loadError = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	function resolveTargetDisplayName(
		target: AssignmentTarget,
		groupNames: Map<string, string>
	): string {
		switch (target['@odata.type']) {
			case '#microsoft.graph.allDevicesAssignmentTarget':
				return 'All Devices';
			case '#microsoft.graph.allLicensedUsersAssignmentTarget':
				return 'All Users';
			case '#microsoft.graph.groupAssignmentTarget':
			case '#microsoft.graph.exclusionGroupAssignmentTarget':
				return groupNames.get(target.groupId) ?? target.groupId;
			default:
				return 'Unknown';
		}
	}

	function setResolution(conflict: AssignmentConflict, resolution: 'update' | 'skip'): void {
		const updated = conflicts.map((c) =>
			c.itemId === conflict.itemId && c.targetKey === conflict.targetKey ? { ...c, resolution } : c
		);
		onUpdateConflicts(updated);
	}

	function getIntentLabel(intent: string | null): string {
		switch (intent) {
			case 'required':
				return 'Required';
			case 'available':
				return 'Available';
			case 'uninstall':
				return 'Uninstall';
			case 'availableWithoutEnrollment':
				return 'Available (No Enrollment)';
			default:
				return 'Applicable';
		}
	}

	function getIntentVariant(
		intent: string | null
	): 'required' | 'available' | 'uninstall' | 'neutral' {
		switch (intent) {
			case 'required':
				return 'required';
			case 'available':
			case 'availableWithoutEnrollment':
				return 'available';
			case 'uninstall':
				return 'uninstall';
			default:
				return 'neutral';
		}
	}

	$effect(() => {
		detectConflicts();
	});
</script>

{#if loading}
	<div class="flex justify-center py-12">
		<Spinner label="Checking for conflicts..." />
	</div>
{:else if loadError}
	<div class="panel-inset border-ember bg-ember-light mb-4 border-l-2">
		<p class="text-ember text-sm">{loadError}</p>
		<button
			onclick={() => {
				hasLoaded = false;
				detectConflicts();
			}}
			class="text-ember mt-2 text-sm font-medium underline"
		>
			Try again
		</button>
	</div>
{:else}
	{#if wizard.replaceMode && removalCount > 0}
		<div class="panel-inset border-ember bg-ember-light mb-4 flex items-start gap-2 border-l-2">
			<AlertTriangle size={16} class="text-ember mt-0.5 shrink-0" />
			<p class="text-ink text-sm">
				<strong>Replace mode is active.</strong>
				{removalCount} existing assignment{removalCount !== 1 ? 's' : ''} will be removed
				across {itemsWithRemovals} item{itemsWithRemovals !== 1 ? 's' : ''}.
			</p>
		</div>
	{/if}

	<!-- View toggle -->
	<div class="mb-3">
		<Tabs
			tabs={[
				{ id: 'list', label: 'Assignment List' },
				{ id: 'diff', label: 'Change Preview' }
			]}
			active={viewMode}
			onchange={(id) => (viewMode = id as 'list' | 'diff')}
		/>
	</div>

	{#if viewMode === 'list'}
		<!-- Summary counters -->
		<div class="mb-4 flex flex-wrap gap-4 text-sm">
			<span class="flex items-center gap-1.5">
				<span class="bg-accent inline-block h-2 w-2 rounded-full"></span>
				<span class="text-ink">{newCount} new</span>
			</span>
			{#if updateCount > 0}
				<span class="flex items-center gap-1.5">
					<span class="bg-warn inline-block h-2 w-2 rounded-full"></span>
					<span class="text-ink">{updateCount} update{updateCount !== 1 ? 's' : ''}</span>
				</span>
			{/if}
			{#if skipCount > 0}
				<span class="flex items-center gap-1.5">
					<span class="bg-muted inline-block h-2 w-2 rounded-full"></span>
					<span class="text-ink">{skipCount} skipped</span>
				</span>
			{/if}
		</div>

		{#if conflicts.length > 0}
			<div class="panel-inset border-warn bg-warn-light mb-4 flex items-start gap-2 border-l-2">
				<AlertTriangle size={16} class="text-warn mt-0.5 shrink-0" />
				<p class="text-ink text-sm">
					{conflicts.length} existing assignment{conflicts.length !== 1 ? 's' : ''} conflict with your
					selections. Choose to update or skip each conflict below.
				</p>
			</div>
		{/if}

		<!-- Assignment table -->
		<div class="border-border overflow-hidden rounded-lg border">
			<!-- Header -->
			<div
				class="border-border bg-canvas-deep text-muted grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase"
			>
				<div class="col-span-4">Item</div>
				<div class="col-span-3">Target</div>
				<div class="col-span-2">Intent</div>
				<div class="col-span-3">Filter</div>
			</div>

			<!-- Rows -->
			<div class="max-h-96 overflow-y-auto">
				{#each allItems as item (item.id)}
					{#each wizard.selectedGroups as group (group.groupId ?? group.type)}
						{@const target = buildAssignmentTarget(group, wizard.filterConfig)}
						{@const key = getTargetKey(target)}
						{@const conflict = conflicts.find((c) => c.itemId === item.id && c.targetKey === key)}
						<div
							class="border-border grid grid-cols-12 items-center gap-2 border-b px-4 py-2.5 last:border-b-0 {conflict
								? 'border-l-warn bg-warn-light/50 border-l-2'
								: ''}"
						>
							<div class="col-span-4 min-w-0">
								<p class="text-ink truncate text-sm font-medium">{item.name}</p>
								<p class="text-muted text-xs">{item.type === 'app' ? 'App' : item.type === 'compliance' ? 'Compliance' : item.type === 'security' ? 'Security' : 'Profile'}</p>
							</div>
							<div class="col-span-3 min-w-0">
								<p class="text-ink truncate text-sm">{group.displayName}</p>
							</div>
							<div class="col-span-2">
								<Badge variant={getIntentVariant(wizard.intent)}>
									{getIntentLabel(item.type === 'app' ? wizard.intent : null)}
								</Badge>
							</div>
							<div class="col-span-3 min-w-0">
								{#if wizard.filterConfig}
									<p class="text-muted truncate text-xs">
										{wizard.filterConfig.filterName} ({wizard.filterConfig.filterType})
									</p>
								{:else}
									<p class="text-muted text-xs">None</p>
								{/if}
							</div>

							{#if conflict}
								<div class="col-span-12 flex flex-wrap items-center gap-3 pt-0.5 pb-1 text-xs">
									<span class="text-warn flex items-center gap-1">
										<AlertTriangle size={12} />
										Currently: {getIntentLabel(conflict.existingIntent)}
										<ArrowRight size={12} />
										{getIntentLabel(item.type === 'app' ? wizard.intent : null)}
									</span>
									<label class="flex cursor-pointer items-center gap-1">
										<input
											type="radio"
											name="conflict-{conflict.itemId}-{conflict.targetKey}"
											value="update"
											checked={conflict.resolution === 'update'}
											onchange={() => setResolution(conflict, 'update')}
											class="accent-accent"
										/>
										<span class="text-ink">Update</span>
									</label>
									<label class="flex cursor-pointer items-center gap-1">
										<input
											type="radio"
											name="conflict-{conflict.itemId}-{conflict.targetKey}"
											value="skip"
											checked={conflict.resolution === 'skip'}
											onchange={() => setResolution(conflict, 'skip')}
											class="accent-accent"
										/>
										<span class="text-ink">Skip</span>
									</label>
								</div>
							{/if}
						</div>
					{/each}

					{#each wizard.exclusionGroups as group (group.groupId ?? group.type)}
						{@const target = buildExclusionTarget(group, wizard.filterConfig)}
						{@const key = getTargetKey(target)}
						{@const conflict = conflicts.find((c) => c.itemId === item.id && c.targetKey === key)}
						<div
							class="border-border grid grid-cols-12 items-center gap-2 border-b px-4 py-2.5 last:border-b-0 {conflict
								? 'border-l-warn bg-warn-light/50 border-l-2'
								: ''}"
						>
							<div class="col-span-4 min-w-0">
								<p class="text-ink truncate text-sm font-medium">{item.name}</p>
								<p class="text-muted text-xs">{item.type === 'app' ? 'App' : item.type === 'compliance' ? 'Compliance' : item.type === 'security' ? 'Security' : 'Profile'}</p>
							</div>
							<div class="col-span-3 min-w-0">
								<p class="text-ink truncate text-sm">{group.displayName}</p>
								<p class="text-ember text-xs">Exclusion</p>
							</div>
							<div class="col-span-2">
								<Badge variant="exclude">Excluded</Badge>
							</div>
							<div class="col-span-3 min-w-0">
								{#if wizard.filterConfig}
									<p class="text-muted truncate text-xs">
										{wizard.filterConfig.filterName} ({wizard.filterConfig.filterType})
									</p>
								{:else}
									<p class="text-muted text-xs">None</p>
								{/if}
							</div>

							{#if conflict}
								<div class="col-span-12 flex flex-wrap items-center gap-3 pt-0.5 pb-1 text-xs">
									<span class="text-warn">Existing exclusion for this group</span>
									<label class="flex cursor-pointer items-center gap-1">
										<input
											type="radio"
											name="conflict-{conflict.itemId}-{conflict.targetKey}"
											value="update"
											checked={conflict.resolution === 'update'}
											onchange={() => setResolution(conflict, 'update')}
											class="accent-accent"
										/>
										<span class="text-ink">Update</span>
									</label>
									<label class="flex cursor-pointer items-center gap-1">
										<input
											type="radio"
											name="conflict-{conflict.itemId}-{conflict.targetKey}"
											value="skip"
											checked={conflict.resolution === 'skip'}
											onchange={() => setResolution(conflict, 'skip')}
											class="accent-accent"
										/>
										<span class="text-ink">Skip</span>
									</label>
								</div>
							{/if}
						</div>
					{/each}

				<!-- Removed assignments (replace mode) -->
				{#if wizard.replaceMode && diffResult}
					{@const itemDiff = diffResult.items.find((d) => d.itemId === item.id)}
					{#if itemDiff}
						{#each itemDiff.entries.filter((e) => e.status === 'removed') as entry (entry.targetKey)}
							<div
								class="border-border border-l-ember bg-ember-light/50 grid grid-cols-12 items-center gap-2 border-b border-l-2 px-4 py-2.5 last:border-b-0"
							>
								<div class="col-span-4 min-w-0">
									<p class="text-ink truncate text-sm font-medium line-through opacity-60">
										{item.name}
									</p>
									<p class="text-muted text-xs">
										{item.type === 'app' ? 'App' : item.type === 'compliance' ? 'Compliance' : item.type === 'security' ? 'Security' : 'Profile'}
									</p>
								</div>
								<div class="col-span-3 min-w-0">
									<p class="text-ink truncate text-sm line-through opacity-60">
										{entry.targetDisplayName}
										{#if entry.isExclusion}
											<span class="text-xs">(Exclusion)</span>
										{/if}
									</p>
								</div>
								<div class="col-span-2">
									<Badge variant="neutral">
										<span class="text-ember">Removed</span>
									</Badge>
								</div>
								<div class="col-span-3 min-w-0">
									{#if entry.currentFilterName}
										<p class="text-muted truncate text-xs line-through opacity-60">
											{entry.currentFilterName} ({entry.currentFilterMode})
										</p>
									{:else}
										<p class="text-muted text-xs">—</p>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				{/if}
			{/each}
		</div>
	</div>

		<!-- Total summary -->
		<div class="text-muted mt-4 text-sm">
			{totalAssignments} total assignment{totalAssignments !== 1 ? 's' : ''} will be processed.
			{#if wizard.replaceMode && removalCount > 0}
				<span class="text-ember font-medium">
					{removalCount} will be removed.
				</span>
			{/if}
		</div>
	{:else if diffResult}
		<AssignmentDiff diff={diffResult} />
	{:else}
		<p class="text-muted text-sm">No diff data available.</p>
	{/if}
{/if}
