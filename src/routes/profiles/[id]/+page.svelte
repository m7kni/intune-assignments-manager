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
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import StatusSummaryCard from '$lib/components/status/StatusSummaryCard.svelte';
	import DeviceStatusRow from '$lib/components/status/DeviceStatusRow.svelte';
	import AssignmentRow from '$lib/components/assignments/AssignmentRow.svelte';
	import AssignmentEditor from '$lib/components/assignments/AssignmentEditor.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import CsvExportButton from '$lib/components/csv/CsvExportButton.svelte';
	import { Layers, Plus } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getConfigPolicy,
		getConfigAssignments,
		assignConfigPolicy
	} from '$lib/graph/configurations';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { getConfigStatusOverview, getConfigDeviceStatuses } from '$lib/graph/status';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { getProfileTypeInfo } from '$lib/utils/profile-types';
	import { exportAssignmentsCsv, type ExportableAssignment } from '$lib/utils/csv-assignments';
	import type {
		ConfigurationPolicy,
		ConfigurationPolicyAssignment,
		AssignmentTarget,
		AssignmentIntent
	} from '$lib/types/graph';
	import type {
		DeviceConfigurationDeviceOverview,
		DeviceConfigurationDeviceStatus
	} from '$lib/types/status';

	let profile = $state<ConfigurationPolicy | null>(null);
	let assignments = $state<ConfigurationPolicyAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('assignments');

	// Status tab state
	let statusOverview = $state<DeviceConfigurationDeviceOverview | null>(null);
	let deviceStatuses = $state<DeviceConfigurationDeviceStatus[]>([]);
	let statusLoading = $state(false);
	let statusError = $state<string | null>(null);
	let statusSearch = $state('');
	let statusLoaded = $state(false);

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<ConfigurationPolicyAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<ConfigurationPolicyAssignment | null>(null);

	const profileTypeInfo = $derived(
		profile ? getProfileTypeInfo(profile.platforms, profile.technologies) : null
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

			profile = policyData;
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
		if (!profile) return;
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

			await assignConfigPolicy(getGraphClient(), profile.id, updated);
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

			await assignConfigPolicy(getGraphClient(), profile.id, updated);
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
			itemType: 'profile',
			itemName: profile!.name,
			itemId: profile!.id,
			target: a.target,
			intent: a.intent
		}));
		return exportAssignmentsCsv(exportable, groupNames, buildFilterNames());
	}

	// ─── Status tab ───────────────────────────────────────────────────

	function getConfigStatusVariant(
		status: string
	): 'required' | 'available' | 'uninstall' | 'neutral' {
		switch (status) {
			case 'compliant':
			case 'remediated':
				return 'required';
			case 'error':
			case 'nonCompliant':
				return 'uninstall';
			case 'conflict':
				return 'available';
			default:
				return 'neutral';
		}
	}

	function getConfigStatusLabel(status: string): string {
		switch (status) {
			case 'compliant':
				return 'Compliant';
			case 'remediated':
				return 'Remediated';
			case 'nonCompliant':
				return 'Non-Compliant';
			case 'error':
				return 'Error';
			case 'conflict':
				return 'Conflict';
			case 'notApplicable':
				return 'Not Applicable';
			case 'notAssigned':
				return 'Not Assigned';
			default:
				return 'Unknown';
		}
	}

	const filteredDeviceStatuses = $derived(
		deviceStatuses.filter((s) => {
			if (!statusSearch) return true;
			const q = statusSearch.toLowerCase();
			return (
				s.deviceDisplayName.toLowerCase().includes(q) ||
				(s.userName ?? '').toLowerCase().includes(q)
			);
		})
	);

	async function fetchStatusData(): Promise<void> {
		const id = page.params.id!;
		statusLoading = true;
		statusError = null;
		try {
			const client = getGraphClient();
			const [overview, statuses] = await Promise.all([
				getConfigStatusOverview(client, id),
				getConfigDeviceStatuses(client, id)
			]);
			statusOverview = overview;
			deviceStatuses = statuses;
			statusLoaded = true;
		} catch {
			statusError =
				'Device status is not available for Settings Catalog profiles. Status tracking is available for legacy device configuration profiles.';
		} finally {
			statusLoading = false;
		}
	}

	$effect(() => {
		if (activeTab === 'status' && !statusLoaded && !statusLoading) {
			fetchStatusData();
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
		{:else if profile}
			<!-- Redesigned info panel -->
			<div class="panel-raised mb-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-4">
						{#if profileTypeInfo}
							{@const TypeIcon = profileTypeInfo.icon}
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<TypeIcon size={24} class="text-accent" />
							</div>
						{/if}
						<div>
							<h1 class="text-ink text-2xl font-bold tracking-tight">
								{profile.name}
							</h1>
							<p class="text-ink-faint text-sm">
								{profile.settingCount} setting{profile.settingCount !== 1 ? 's' : ''}
							</p>
						</div>
					</div>
					<div class="flex gap-2">
						<CsvExportButton
							getCsvContent={exportCsv}
							filename="{profile?.name ?? 'profile'}-assignments.csv"
							disabled={assignments.length === 0}
						/>
						<Button variant="primary" icon={Layers} href="/assign?profileId={profile?.id}">
							Edit in Bulk Assign
						</Button>
					</div>
				</div>

				<!-- Metadata pills -->
				<div class="mt-4 flex flex-wrap gap-2">
					{#if profileTypeInfo}
						<Badge variant="info">{profileTypeInfo.label}</Badge>
						<Badge variant="outline">{profileTypeInfo.technology}</Badge>
					{/if}
					<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
						{hasAssignments ? 'Assigned' : 'Unassigned'}
					</Badge>
				</div>

				{#if profile.description}
					<p class="text-ink-faint mt-3 text-sm">{profile.description}</p>
				{/if}
			</div>

			<div class="mb-4">
				<Tabs
					tabs={[
						{ id: 'assignments', label: 'Assignments' },
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
						icon={Layers}
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
								intent={assignment.intent}
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
			{:else if activeTab === 'status'}
				{#if statusLoading}
					<div class="space-y-4">
						<Skeleton height="8rem" rounded="lg" />
						{#each Array(4) as _, i (i)}
							<Skeleton height="3rem" rounded="lg" />
						{/each}
					</div>
				{:else if statusError}
					<EmptyState icon={Layers} title="Status unavailable" description={statusError} />
				{:else if statusOverview}
					<div class="mb-4">
						<StatusSummaryCard
							title="Deployment Overview"
							segments={[
								{
									label: 'Success',
									value: statusOverview.successCount,
									color: 'bg-success'
								},
								{
									label: 'Error',
									value: statusOverview.errorCount,
									color: 'bg-ember'
								},
								{
									label: 'Failed',
									value: statusOverview.failedCount,
									color: 'bg-ember'
								},
								{
									label: 'Pending',
									value: statusOverview.pendingCount,
									color: 'bg-warn'
								},
								{
									label: 'Not Applicable',
									value: statusOverview.notApplicableCount,
									color: 'bg-muted'
								}
							]}
							lastUpdated={statusOverview.lastUpdateDateTime}
						/>
					</div>

					{#if deviceStatuses.length > 0}
						<div class="mb-3">
							<SearchInput placeholder="Filter by device or user..." bind:value={statusSearch} />
						</div>
						<div class="panel overflow-clip p-0">
							<div
								class="border-border bg-surface/95 text-muted sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm"
							>
								<div class="col-span-4">Device</div>
								<div class="col-span-3">Status</div>
								<div class="col-span-3">Last Reported</div>
								<div class="col-span-2">User</div>
							</div>
							{#each filteredDeviceStatuses as status (status.id)}
								<DeviceStatusRow
									deviceName={status.deviceDisplayName}
									userName={status.userName ?? ''}
									statusVariant={getConfigStatusVariant(status.status)}
									statusLabel={getConfigStatusLabel(status.status)}
									lastReported={status.lastReportedDateTime}
								/>
							{/each}
							{#if filteredDeviceStatuses.length === 0}
								<div class="px-4 py-8 text-center">
									<p class="text-muted text-sm">No devices match your search.</p>
								</div>
							{/if}
						</div>
					{:else}
						<EmptyState
							icon={Layers}
							title="No device statuses"
							description="No device deployment status data is available for this profile."
						/>
					{/if}
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
		existingIntent={editingAssignment?.intent as AssignmentIntent | null | undefined}
		existingTargetName={editingAssignment ? resolveTargetName(editingAssignment.target) : undefined}
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
