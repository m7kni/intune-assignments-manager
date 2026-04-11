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
	import { Layers, Plus, ShieldCheck } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getQualityUpdateProfile,
		getQualityUpdateAssignments,
		assignQualityUpdate
	} from '$lib/graph/updates';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { exportAssignmentsCsv, type ExportableAssignment } from '$lib/utils/csv-assignments';
	import type {
		WindowsQualityUpdateProfile,
		UpdateAssignment
	} from '$lib/types/updates';
	import type { AssignmentTarget, AssignmentIntent } from '$lib/types/graph';

	let profile = $state<WindowsQualityUpdateProfile | null>(null);
	let assignments = $state<UpdateAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('assignments');

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<UpdateAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<UpdateAssignment | null>(null);

	const hasAssignments = $derived(assignments.length > 0);
	const isExpedited = $derived(profile?.expeditedUpdateSettings !== null);

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

			const [profileData, assignmentData] = await Promise.all([
				getQualityUpdateProfile(client, id),
				getQualityUpdateAssignments(client, id),
				ensureFiltersLoaded(client)
			]);

			profile = profileData;
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
		const assignmentData = await getQualityUpdateAssignments(client, id);
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

	function openEditEditor(assignment: UpdateAssignment): void {
		editorMode = 'edit';
		editingAssignment = assignment;
		editorOpen = true;
	}

	function openDeleteDialog(assignment: UpdateAssignment): void {
		deletingAssignment = assignment;
		deleteDialogOpen = true;
	}

	async function handleEditorSave(
		target: AssignmentTarget,
		_: AssignmentIntent | null
	): Promise<void> {
		if (!profile) return;
		editorOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(target);
			const updated = [...assignments];
			const existingIdx = updated.findIndex((a) => getTargetKey(a.target) === key);

			const newAssignment: UpdateAssignment = {
				id: existingIdx >= 0 ? updated[existingIdx].id : '',
				target
			};

			if (existingIdx >= 0) {
				updated[existingIdx] = newAssignment;
			} else {
				updated.push(newAssignment);
			}

			await assignQualityUpdate(getGraphClient(), profile.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!profile || !deletingAssignment) return;
		deleteDialogOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(deletingAssignment.target);
			const updated = assignments.filter((a) => getTargetKey(a.target) !== key);

			await assignQualityUpdate(getGraphClient(), profile.id, updated);
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
		if (!profile) return '';
		const exportable: ExportableAssignment[] = assignments.map((a) => ({
			itemType: 'profile' as ExportableAssignment['itemType'],
			itemName: profile!.displayName,
			itemId: profile!.id,
			target: a.target,
			intent: null
		}));
		return exportAssignmentsCsv(exportable, groupNames, buildFilterNames());
	}
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
		{:else if profile}
			<!-- Info panel -->
			<div class="panel-raised mb-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-4">
						<div
							class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
						>
							<ShieldCheck size={24} class="text-accent" />
						</div>
						<div>
							<h1 class="text-ink text-2xl font-bold tracking-tight">
								{profile.displayName}
							</h1>
							<p class="text-ink-faint text-sm">Quality Update Profile</p>
						</div>
					</div>
					<div class="flex gap-2">
						<CsvExportButton
							getCsvContent={exportCsv}
							filename="{profile?.displayName ?? 'quality-update'}-assignments.csv"
							disabled={assignments.length === 0}
						/>
						<Button variant="primary" icon={Layers} href="/assign">
							Edit in Bulk Assign
						</Button>
					</div>
				</div>

				<!-- Metadata pills -->
				<div class="mt-4 flex flex-wrap gap-2">
					<Badge variant="info">Quality Update</Badge>
					{#if isExpedited}
						<Badge variant="available">Expedited</Badge>
					{/if}
					<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
						{hasAssignments ? 'Assigned' : 'Unassigned'}
					</Badge>
				</div>

				{#if profile.description}
					<p class="text-ink-faint mt-3 text-sm">{profile.description}</p>
				{/if}

				<!-- Settings summary -->
				<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#if profile.releaseDateDisplayName}
						<div>
							<p class="text-muted text-xs font-medium uppercase">Release Date</p>
							<p class="text-ink text-sm">{profile.releaseDateDisplayName}</p>
						</div>
					{/if}
					{#if profile.expeditedUpdateSettings}
						{#if profile.expeditedUpdateSettings.qualityUpdateRelease}
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Quality Update Release
								</p>
								<p class="text-ink text-sm">
									{profile.expeditedUpdateSettings.qualityUpdateRelease}
								</p>
							</div>
						{/if}
						{#if profile.expeditedUpdateSettings.daysUntilForcedReboot !== null}
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Days Until Forced Reboot
								</p>
								<p class="text-ink text-sm">
									{profile.expeditedUpdateSettings.daysUntilForcedReboot} days
								</p>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<div class="mb-4">
				<Tabs
					tabs={[{ id: 'assignments', label: 'Assignments' }]}
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
						icon={ShieldCheck}
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
