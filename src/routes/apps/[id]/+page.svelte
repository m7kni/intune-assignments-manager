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
	import { Layers, Monitor, Plus } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { getApp, getAppAssignments, assignApp } from '$lib/graph/apps';
	import { getAppInstallSummary, getAppDeviceInstallStatuses } from '$lib/graph/status';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { getAppTypeInfo } from '$lib/utils/app-types';
	import { exportAssignmentsCsv, type ExportableAssignment } from '$lib/utils/csv-assignments';
	import type {
		MobileApp,
		MobileAppAssignment,
		AssignmentTarget,
		AssignmentIntent
	} from '$lib/types/graph';
	import type { MobileAppInstallSummary, AppDeviceInstallStatusRow } from '$lib/types/status';

	let app = $state<MobileApp | null>(null);
	let assignments = $state<MobileAppAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('assignments');

	// Status tab state
	let installSummary = $state<MobileAppInstallSummary | null>(null);
	let deviceStatuses = $state<AppDeviceInstallStatusRow[]>([]);
	let statusLoading = $state(false);
	let statusError = $state<string | null>(null);
	let deviceStatusError = $state<string | null>(null);
	let statusLoaded = $state(false);
	let statusSearch = $state('');
	let statusFilter = $state<'all' | 'failed'>('all');

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<MobileAppAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<MobileAppAssignment | null>(null);

	const appTypeInfo = $derived(app ? getAppTypeInfo(app['@odata.type']) : null);
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

			const [appData, assignmentData] = await Promise.all([
				getApp(client, id),
				getAppAssignments(client, id),
				ensureFiltersLoaded(client)
			]);

			app = appData;
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
		const assignmentData = await getAppAssignments(client, id);
		assignments = assignmentData;

		// Resolve any new group names
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

	function openEditEditor(assignment: MobileAppAssignment): void {
		editorMode = 'edit';
		editingAssignment = assignment;
		editorOpen = true;
	}

	function openDeleteDialog(assignment: MobileAppAssignment): void {
		deletingAssignment = assignment;
		deleteDialogOpen = true;
	}

	async function handleEditorSave(
		target: AssignmentTarget,
		intent: AssignmentIntent | null
	): Promise<void> {
		if (!app) return;
		editorOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(target);
			const updated = [...assignments];
			const existingIdx = updated.findIndex((a) => getTargetKey(a.target) === key);

			const newAssignment: MobileAppAssignment = {
				id: existingIdx >= 0 ? updated[existingIdx].id : '',
				intent: (intent as AssignmentIntent) ?? 'required',
				target,
				settings: existingIdx >= 0 ? updated[existingIdx].settings : null
			};

			if (existingIdx >= 0) {
				updated[existingIdx] = newAssignment;
			} else {
				updated.push(newAssignment);
			}

			await assignApp(getGraphClient(), app.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!app || !deletingAssignment) return;
		deleteDialogOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(deletingAssignment.target);
			const updated = assignments.filter((a) => getTargetKey(a.target) !== key);

			await assignApp(getGraphClient(), app.id, updated);
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
		if (!app) return '';
		const exportable: ExportableAssignment[] = assignments.map((a) => ({
			itemType: 'app',
			itemName: app!.displayName,
			itemId: app!.id,
			target: a.target,
			intent: a.intent
		}));
		return exportAssignmentsCsv(exportable, groupNames, buildFilterNames());
	}

	// ─── Status tab ───────────────────────────────────────────────────

	// Reports API returns short codes for AppInstallState (e.g. "1", "2", "5")
	// Map them to human-readable labels and badge variants
	const installStateLabels: Record<string, string> = {
		'1': 'Installed',
		'2': 'Failed',
		'3': 'Not Installed',
		'4': 'Pending',
		'5': 'Not Applicable',
		'99': 'Unknown'
	};

	const installStateVariants: Record<string, 'required' | 'available' | 'uninstall' | 'neutral'> =
		{
			'1': 'required',
			'2': 'uninstall',
			'3': 'neutral',
			'4': 'available',
			'5': 'neutral',
			'99': 'neutral'
		};

	function getInstallStatusVariant(
		row: AppDeviceInstallStatusRow
	): 'required' | 'available' | 'uninstall' | 'neutral' {
		const code = String(row.appInstallState || row.installState || '');
		if (installStateVariants[code]) return installStateVariants[code];
		// Fallback: try matching human-readable strings
		const state = code.toLowerCase();
		if (state.includes('installed') && !state.includes('not') && !state.includes('failed'))
			return 'required';
		if (state.includes('fail') || state.includes('error')) return 'uninstall';
		if (state.includes('pending')) return 'available';
		return 'neutral';
	}

	function getInstallStatusLabel(row: AppDeviceInstallStatusRow): string {
		const code = String(row.appInstallState || row.installState || '');
		return installStateLabels[code] || code || 'Unknown';
	}

	function getInstallErrorDetail(row: AppDeviceInstallStatusRow): string | null {
		const parts: string[] = [];
		if (row.errorCode && Number(row.errorCode) !== 0) {
			parts.push(`Error: ${row.hexErrorCode || row.errorCode}`);
		}
		if (row.appInstallStateDetails) {
			parts.push(row.appInstallStateDetails);
		} else if (row.installStateDetail) {
			parts.push(row.installStateDetail);
		}
		return parts.length > 0 ? parts.join('\n') : null;
	}

	const filteredDeviceStatuses = $derived(
		deviceStatuses.filter((s) => {
			if (statusFilter === 'failed') {
				const variant = getInstallStatusVariant(s);
				if (variant !== 'uninstall') return false;
			}
			if (!statusSearch) return true;
			const q = statusSearch.toLowerCase();
			return (
				(s.deviceName ?? '').toLowerCase().includes(q) ||
				(s.userName ?? '').toLowerCase().includes(q)
			);
		})
	);

	async function fetchStatusData(): Promise<void> {
		const id = page.params.id!;
		statusLoading = true;
		statusError = null;
		deviceStatusError = null;
		try {
			const client = getGraphClient();
			const [summaryResult, devicesResult] = await Promise.allSettled([
				getAppInstallSummary(client, id),
				getAppDeviceInstallStatuses(client, id)
			]);

			if (summaryResult.status === 'fulfilled') {
				installSummary = summaryResult.value;
			} else {
				statusError = toFriendlyMessage(summaryResult.reason);
			}

			if (devicesResult.status === 'fulfilled') {
				deviceStatuses = devicesResult.value;
			} else {
				deviceStatusError =
					'Per-device install status is not available. This report endpoint may not be supported in your tenant.';
			}

			statusLoaded = true;
		} catch (err) {
			statusError = toFriendlyMessage(err);
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
		{:else if app}
			<!-- Redesigned info panel: horizontal layout -->
			<div class="panel-raised mb-6">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-4">
						{#if appTypeInfo}
							{@const TypeIcon = appTypeInfo.icon}
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<TypeIcon size={24} class="text-accent" />
							</div>
						{/if}
						<div>
							<h1 class="text-ink text-2xl font-bold tracking-tight">
								{app.displayName}
							</h1>
							<p class="text-ink-faint text-sm">
								{app.publisher ?? 'Unknown publisher'}
							</p>
						</div>
					</div>
					<div class="flex gap-2">
						<CsvExportButton
							getCsvContent={exportCsv}
							filename="{app?.displayName ?? 'app'}-assignments.csv"
							disabled={assignments.length === 0}
						/>
						<Button variant="primary" icon={Layers} href="/assign?appId={app?.id}">
							Edit in Bulk Assign
						</Button>
					</div>
				</div>

				<!-- Metadata pills -->
				<div class="mt-4 flex flex-wrap gap-2">
					{#if appTypeInfo}
						<Badge variant="info">{appTypeInfo.label}</Badge>
					{/if}
					<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
						{hasAssignments ? 'Assigned' : 'Unassigned'}
					</Badge>
				</div>

				{#if app.description}
					<p class="text-ink-faint mt-3 text-sm">{app.description}</p>
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
						<!-- Sticky header -->
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
				{:else if statusError && !installSummary}
					<ErrorState message={statusError} onretry={fetchStatusData} />
				{:else}
					{#if installSummary}
						<div class="mb-4">
							<StatusSummaryCard
								title="Install Summary"
								segments={[
									{
										label: 'Installed',
										value: installSummary.installedDeviceCount,
										color: 'bg-success'
									},
									{
										label: 'Failed',
										value: installSummary.failedDeviceCount,
										color: 'bg-ember'
									},
									{
										label: 'Pending',
										value: installSummary.pendingInstallDeviceCount,
										color: 'bg-warn'
									},
									{
										label: 'Not Applicable',
										value: installSummary.notApplicableDeviceCount,
										color: 'bg-muted'
									},
									{
										label: 'Not Installed',
										value: installSummary.notInstalledDeviceCount,
										color: 'bg-canvas-deep'
									}
								]}
							/>
						</div>
					{:else}
						<EmptyState
							icon={Monitor}
							title="No install data"
							description="No install status data is available for this app."
						/>
					{/if}

					{#if deviceStatusError}
						<EmptyState
							icon={Monitor}
							title="Per-device status unavailable"
							description={deviceStatusError}
						/>
					{:else if deviceStatuses.length > 0}
						<div class="mb-3 flex items-center gap-3">
							<div class="flex-1">
								<SearchInput
									placeholder="Filter by device or user..."
									bind:value={statusSearch}
								/>
							</div>
							<div class="border-border flex overflow-hidden rounded-lg border text-sm">
								<button
									class="px-3 py-2 transition-colors {statusFilter === 'all'
										? 'bg-accent text-white'
										: 'bg-surface text-ink hover:bg-canvas-deep'}"
									onclick={() => (statusFilter = 'all')}
								>
									All
								</button>
								<button
									class="border-border border-l px-3 py-2 transition-colors {statusFilter ===
									'failed'
										? 'bg-ember text-white'
										: 'bg-surface text-ink hover:bg-canvas-deep'}"
									onclick={() => (statusFilter = 'failed')}
								>
									Failed Only
								</button>
							</div>
						</div>
						<div class="panel overflow-clip p-0">
							<div
								class="border-border bg-surface/95 text-muted sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm"
							>
								<div class="col-span-4">Device</div>
								<div class="col-span-3">Status</div>
								<div class="col-span-3">Last Reported</div>
								<div class="col-span-2">Error</div>
							</div>
							{#each filteredDeviceStatuses as status, i (`${status.deviceId}-${i}`)}
								<DeviceStatusRow
									deviceName={status.deviceName || 'Unknown Device'}
									userName={status.userName || ''}
									statusVariant={getInstallStatusVariant(status)}
									statusLabel={getInstallStatusLabel(status)}
									lastReported={status.lastModifiedDateTime}
									errorDetail={getInstallErrorDetail(status)}
								/>
							{/each}
							{#if filteredDeviceStatuses.length === 0}
								<div class="px-4 py-8 text-center">
									<p class="text-muted text-sm">No devices match your search.</p>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			{/if}
		{/if}
	</div>

	<!-- Assignment editor dialog -->
	<AssignmentEditor
		open={editorOpen}
		mode={editorMode}
		itemKind="app"
		existingTarget={editingAssignment?.target}
		existingIntent={editingAssignment?.intent}
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
