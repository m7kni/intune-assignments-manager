<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { page } from '$app/state';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import AssignmentRow from '$lib/components/assignments/AssignmentRow.svelte';
	import AssignmentEditor from '$lib/components/assignments/AssignmentEditor.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import CsvExportButton from '$lib/components/csv/CsvExportButton.svelte';
	import { Layers, Plus, Swords, Monitor } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getConfigPolicy,
		getConfigAssignments,
		assignConfigPolicy,
		getSecurityPolicySettings
	} from '$lib/graph/security';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { getSecurityCategoryInfo } from '$lib/utils/security-types';
	import { getPlatformLabel } from '$lib/utils/profile-types';
	import { exportAssignmentsCsv, type ExportableAssignment } from '$lib/utils/csv-assignments';
	import type { ConfigurationPolicy, ConfigurationPolicyAssignment } from '$lib/types/graph';
	import type { AssignmentTarget, AssignmentIntent } from '$lib/types/graph';
	import type { PolicySettingInstance } from '$lib/types/security';

	let policy = $state<ConfigurationPolicy | null>(null);
	let assignments = $state<ConfigurationPolicyAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('assignments');

	// Settings tab state
	let settings = $state<PolicySettingInstance[]>([]);
	let settingsLoading = $state(false);
	let settingsError = $state<string | null>(null);
	let settingsLoaded = $state(false);

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<ConfigurationPolicyAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<ConfigurationPolicyAssignment | null>(null);

	const categoryInfo = $derived(
		policy
			? getSecurityCategoryInfo(policy.templateReference?.templateFamily ?? '')
			: undefined
	);
	const hasAssignments = $derived(assignments.length > 0);

	function resolveTargetName(target: AssignmentTarget): string {
		switch (target['@odata.type']) {
			case '#microsoft.graph.allDevicesAssignmentTarget':
				return 'All Devices';
			case '#microsoft.graph.allLicensedUsersAssignmentTarget':
				return 'All Users';
			case '#microsoft.graph.groupAssignmentTarget':
			case '#microsoft.graph.exclusionGroupAssignmentTarget':
				return groupNames.get(target.groupId) ?? target.groupId;
			default:
				return 'Unknown target';
		}
	}

	function resolveFilterName(target: AssignmentTarget): string | null {
		const filterId = target.deviceAndAppManagementAssignmentFilterId;
		if (!filterId) return null;
		const filter = getFilterById(filterId);
		return filter?.displayName ?? filterId;
	}

	async function fetchData(): Promise<void> {
		const id = page.params.id!;
		loading = true;
		error = null;
		try {
			const client = getGraphClient();

			const [policyData, assignmentData] = await Promise.all([
				getConfigPolicy(client, id),
				getConfigAssignments(client, id),
				ensureFiltersLoaded(client)
			]);

			policy = policyData;
			assignments = assignmentData;

			const groupIds = assignmentData
				.map((a) => a.target)
				.filter((t): t is Extract<AssignmentTarget, { groupId: string }> => 'groupId' in t)
				.map((t) => t.groupId);

			const uniqueGroupIds = [...new Set(groupIds)];
			if (uniqueGroupIds.length > 0) {
				groupNames = await resolveGroupNames(client, uniqueGroupIds);
			}
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	async function refreshAssignments(): Promise<void> {
		const id = page.params.id!;
		const client = getGraphClient();
		const assignmentData = await getConfigAssignments(client, id);
		assignments = assignmentData;

		const groupIds = assignmentData
			.map((a) => a.target)
			.filter((t): t is Extract<AssignmentTarget, { groupId: string }> => 'groupId' in t)
			.map((t) => t.groupId);

		const uniqueGroupIds = [...new Set(groupIds)];
		if (uniqueGroupIds.length > 0) {
			groupNames = await resolveGroupNames(client, uniqueGroupIds);
		}
	}

	$effect(() => {
		fetchData();
	});

	// ─── Inline editing handlers ───────────────────────────────────────

	function openAddEditor(): void {
		editorMode = 'add';
		editingAssignment = null;
		editorOpen = true;
	}

	function openEditEditor(assignment: ConfigurationPolicyAssignment): void {
		editorMode = 'edit';
		editingAssignment = assignment;
		editorOpen = true;
	}

	function openDeleteDialog(assignment: ConfigurationPolicyAssignment): void {
		deletingAssignment = assignment;
		deleteDialogOpen = true;
	}

	async function handleEditorSave(
		target: AssignmentTarget,
		_: AssignmentIntent | null
	): Promise<void> {
		if (!policy) return;
		editorOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(target);
			const updated = [...assignments];
			const existingIdx = updated.findIndex((a) => getTargetKey(a.target) === key);

			const newAssignment: ConfigurationPolicyAssignment = {
				id: existingIdx >= 0 ? updated[existingIdx].id : '',
				intent: null,
				target
			};

			if (existingIdx >= 0) {
				updated[existingIdx] = newAssignment;
			} else {
				updated.push(newAssignment);
			}

			await assignConfigPolicy(getGraphClient(), policy.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!policy || !deletingAssignment) return;
		deleteDialogOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(deletingAssignment.target);
			const updated = assignments.filter((a) => getTargetKey(a.target) !== key);

			await assignConfigPolicy(getGraphClient(), policy.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
			deletingAssignment = null;
		}
	}

	// ─── CSV export ────────────────────────────────────────────────────

	function buildFilterNames(): Map<string, string> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const map = new Map<string, string>();
		for (const a of assignments) {
			const filterId = a.target.deviceAndAppManagementAssignmentFilterId;
			if (filterId && !map.has(filterId)) {
				const filter = getFilterById(filterId);
				if (filter) map.set(filterId, filter.displayName);
			}
		}
		return map;
	}

	function exportCsv(): string {
		if (!policy) return '';
		const exportable: ExportableAssignment[] = assignments.map((a) => ({
			itemType: 'security' as ExportableAssignment['itemType'],
			itemName: policy!.name,
			itemId: policy!.id,
			target: a.target,
			intent: null
		}));
		return exportAssignmentsCsv(exportable, groupNames, buildFilterNames());
	}

	// ─── Settings tab ─────────────────────────────────────────────────

	function formatSettingName(definitionId: string): string {
		// Extract the last segment after the last underscore or dot
		const lastPart = definitionId.split('_').pop() ?? definitionId;
		// Convert camelCase to spaces and capitalize
		return lastPart
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[._]/g, ' ')
			.replace(/^\w/, (c) => c.toUpperCase());
	}

	function extractSettingValue(instance: PolicySettingInstance['settingInstance']): string {
		const type = instance['@odata.type'];

		if (type.includes('choiceSettingInstance')) {
			const choice = instance['choiceSettingValue'] as
				| { value?: string; children?: unknown[] }
				| undefined;
			if (choice?.value) {
				const lastPart = choice.value.split('_').pop() ?? choice.value;
				return lastPart.replace(/([a-z])([A-Z])/g, '$1 $2');
			}
		}

		if (type.includes('simpleSettingInstance')) {
			const simple = instance['simpleSettingValue'] as
				| { value?: string | number | boolean }
				| undefined;
			if (simple?.value !== undefined) {
				return String(simple.value);
			}
		}

		if (type.includes('groupSettingCollectionInstance')) {
			const collection = instance['groupSettingCollectionValue'] as unknown[] | undefined;
			if (collection) {
				return `${collection.length} setting group(s)`;
			}
		}

		if (type.includes('simpleSettingCollectionInstance')) {
			const collection = instance['simpleSettingCollectionValue'] as unknown[] | undefined;
			if (collection) {
				return `${collection.length} value(s)`;
			}
		}

		return 'Configured';
	}

	async function fetchSettings(): Promise<void> {
		const id = page.params.id!;
		settingsLoading = true;
		settingsError = null;
		try {
			const client = getGraphClient();
			settings = await getSecurityPolicySettings(client, id);
			settingsLoaded = true;
		} catch (err) {
			settingsError = toFriendlyMessage(err);
		} finally {
			settingsLoading = false;
		}
	}

	$effect(() => {
		if (activeTab === 'settings' && !settingsLoaded && !settingsLoading) {
			fetchSettings();
		}
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		{#if error}
			<div class="mb-4">
				<ErrorState message={error} onretry={fetchData} />
			</div>
		{/if}

		{#if saveError}
			<div class="mb-4">
				<ErrorState message={saveError} onretry={() => (saveError = null)} />
			</div>
		{/if}

		{#if loading}
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<Skeleton width="3rem" height="3rem" rounded="lg" />
					<div class="flex-1 space-y-2">
						<Skeleton width="40%" height="1.5rem" />
						<Skeleton width="20%" height="0.875rem" />
					</div>
				</div>
				<div class="panel">
					<div class="grid gap-4 sm:grid-cols-3">
						{#each Array(3) as _, i (i)}
							<div class="space-y-1">
								<Skeleton width="5rem" height="0.75rem" />
								<Skeleton width="10rem" height="1rem" />
							</div>
						{/each}
					</div>
				</div>
				{#each Array(4) as _, i (i)}
					<Skeleton height="3rem" rounded="lg" />
				{/each}
			</div>
		{:else if policy}
			{@const CatIcon = categoryInfo?.icon ?? Swords}

			<!-- Info panel -->
			<div class="panel-raised mb-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-4">
						<div
							class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
						>
							<CatIcon size={24} class="text-accent" />
						</div>
						<div>
							<h1 class="text-ink text-2xl font-bold tracking-tight">
								{policy.name}
							</h1>
							<p class="text-ink-faint text-sm">
								{categoryInfo?.label ?? 'Endpoint Security'}
							</p>
						</div>
					</div>
					<div class="flex gap-2">
						<CsvExportButton
							getCsvContent={exportCsv}
							filename="{policy?.name ?? 'security-policy'}-assignments.csv"
							disabled={assignments.length === 0}
						/>
						<Button
							variant="primary"
							icon={Layers}
							href="/assign?securityPolicyId={policy?.id}"
						>
							Edit in Bulk Assign
						</Button>
					</div>
				</div>

				<!-- Metadata pills -->
				<div class="mt-4 flex flex-wrap gap-2">
					{#if categoryInfo}
						<Badge variant="info">{categoryInfo.label}</Badge>
					{/if}
					<Badge variant="outline">{getPlatformLabel(policy.platforms)}</Badge>
					<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
						{hasAssignments ? 'Assigned' : 'Unassigned'}
					</Badge>
				</div>

				{#if policy.description}
					<p class="text-ink-faint mt-3 text-sm">{policy.description}</p>
				{/if}
			</div>

			<div class="mb-4">
				<Tabs
					tabs={[
						{ id: 'assignments', label: 'Assignments' },
						{ id: 'settings', label: 'Settings' },
						{ id: 'status', label: 'Device Status' }
					]}
					active={activeTab}
					onchange={(id) => (activeTab = id)}
				/>
			</div>

			{#if activeTab === 'assignments'}
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-ink text-lg font-semibold">Assignments</h2>
					<Button
						variant="secondary"
						size="sm"
						icon={Plus}
						onclick={openAddEditor}
						loading={saving}
					>
						Add Assignment
					</Button>
				</div>

				{#if assignments.length === 0}
					<EmptyState
						icon={Swords}
						title="No assignments yet"
						description="Add an assignment or use Bulk Assign to get started."
					>
						{#snippet action()}
							<Button variant="primary" size="sm" icon={Plus} onclick={openAddEditor}>
								Add Assignment
							</Button>
						{/snippet}
					</EmptyState>
				{:else}
					<div class="panel overflow-clip p-0">
						<div
							class="border-border bg-surface/95 text-muted sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm"
						>
							<div class="col-span-5">Target</div>
							<div class="col-span-3">Intent</div>
							<div class="col-span-4">Filter</div>
						</div>
						{#each assignments as assignment (assignment.id)}
							<AssignmentRow
								targetName={resolveTargetName(assignment.target)}
								targetType={assignment.target['@odata.type']}
								intent={null}
								filterName={resolveFilterName(assignment.target)}
								filterType={assignment.target.deviceAndAppManagementAssignmentFilterType}
								isExclusion={assignment.target['@odata.type'] ===
									'#microsoft.graph.exclusionGroupAssignmentTarget'}
								onEdit={() => openEditEditor(assignment)}
								onDelete={() => openDeleteDialog(assignment)}
							/>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'settings'}
				{#if settingsLoading}
					<div class="space-y-4">
						{#each Array(6) as _, i (i)}
							<Skeleton height="3rem" rounded="lg" />
						{/each}
					</div>
				{:else if settingsError}
					<ErrorState message={settingsError} onretry={fetchSettings} />
				{:else if settings.length === 0}
					<EmptyState
						icon={Swords}
						title="No settings"
						description="This policy has no configured settings."
					/>
				{:else}
					<div class="panel overflow-clip p-0">
						<div
							class="border-border bg-surface/95 text-muted sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm"
						>
							<div class="col-span-7">Setting</div>
							<div class="col-span-5">Value</div>
						</div>
						{#each settings as setting, i (`${setting.id}-${i}`)}
							<div class="border-border grid grid-cols-12 gap-2 border-b px-4 py-3 last:border-b-0">
								<div class="col-span-7">
									<p class="text-ink text-sm font-medium">
										{formatSettingName(setting.settingInstance.settingDefinitionId)}
									</p>
									<p class="text-muted truncate text-xs">
										{setting.settingInstance.settingDefinitionId}
									</p>
								</div>
								<div class="col-span-5">
									<p class="text-ink text-sm">
										{extractSettingValue(setting.settingInstance)}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'status'}
				<EmptyState
					icon={Monitor}
					title="Status unavailable"
					description="Device status reporting is not available for endpoint security policies managed through the Settings Catalog."
				/>
			{/if}
		{/if}
	</div>

	<!-- Assignment editor dialog -->
	<AssignmentEditor
		open={editorOpen}
		mode={editorMode}
		itemKind="profile"
		existingTarget={editingAssignment?.target}
		existingIntent={null}
		existingTargetName={editingAssignment
			? resolveTargetName(editingAssignment.target)
			: undefined}
		onSave={handleEditorSave}
		onCancel={() => (editorOpen = false)}
	/>

	<!-- Delete confirmation dialog -->
	<ConfirmDialog
		open={deleteDialogOpen}
		title="Delete Assignment"
		message="Are you sure you want to remove this assignment? This will take effect immediately."
		confirmLabel="Delete"
		onConfirm={handleDelete}
		onCancel={() => {
			deleteDialogOpen = false;
			deletingAssignment = null;
		}}
	/>
</AuthGuard>
