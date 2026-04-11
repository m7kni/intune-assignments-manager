<script lang="ts">
	import { page } from '$app/state';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
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
	import { Layers, Plus, FileCode, Copy, Check } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getScript,
		getScriptAssignments,
		assignScript,
		getScriptDeviceStates,
		getScriptRunSummary
	} from '$lib/graph/scripts';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { exportAssignmentsCsv, type ExportableAssignment } from '$lib/utils/csv-assignments';
	import type {
		DeviceManagementScript,
		DeviceManagementScriptAssignment,
		DeviceManagementScriptDeviceState,
		DeviceManagementScriptRunSummary
	} from '$lib/types/scripts';
	import type { AssignmentTarget, AssignmentIntent } from '$lib/types/graph';

	let script = $state<DeviceManagementScript | null>(null);
	let assignments = $state<DeviceManagementScriptAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('script');

	// Device status tab state
	let runSummary = $state<DeviceManagementScriptRunSummary | null>(null);
	let deviceStates = $state<DeviceManagementScriptDeviceState[]>([]);
	let statusLoading = $state(false);
	let statusError = $state<string | null>(null);
	let statusSearch = $state('');
	let statusLoaded = $state(false);

	// Copy to clipboard state
	let copied = $state(false);

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<DeviceManagementScriptAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<DeviceManagementScriptAssignment | null>(null);

	const hasAssignments = $derived(assignments.length > 0);

	const decodedScriptContent = $derived.by(() => {
		if (!script?.scriptContent) return null;
		try {
			return atob(script.scriptContent);
		} catch {
			return null;
		}
	});

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

			const [scriptData, assignmentData] = await Promise.all([
				getScript(client, id),
				getScriptAssignments(client, id),
				ensureFiltersLoaded(client)
			]);

			script = scriptData;
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
		const assignmentData = await getScriptAssignments(client, id);
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

	// ─── Copy to clipboard ────────────────────────────────────────────

	async function copyScript(): Promise<void> {
		if (!decodedScriptContent) return;
		await navigator.clipboard.writeText(decodedScriptContent);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	// ─── Inline editing handlers ───────────────────────────────────────

	function openAddEditor(): void {
		editorMode = 'add';
		editingAssignment = null;
		editorOpen = true;
	}

	function openEditEditor(assignment: DeviceManagementScriptAssignment): void {
		editorMode = 'edit';
		editingAssignment = assignment;
		editorOpen = true;
	}

	function openDeleteDialog(assignment: DeviceManagementScriptAssignment): void {
		deletingAssignment = assignment;
		deleteDialogOpen = true;
	}

	async function handleEditorSave(
		target: AssignmentTarget,
		_: AssignmentIntent | null
	): Promise<void> {
		if (!script) return;
		editorOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(target);
			const updated = [...assignments];
			const existingIdx = updated.findIndex((a) => getTargetKey(a.target) === key);

			const newAssignment: DeviceManagementScriptAssignment = {
				id: existingIdx >= 0 ? updated[existingIdx].id : '',
				target
			};

			if (existingIdx >= 0) {
				updated[existingIdx] = newAssignment;
			} else {
				updated.push(newAssignment);
			}

			await assignScript(getGraphClient(), script.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
		}
	}

	async function handleDelete(): Promise<void> {
		if (!script || !deletingAssignment) return;
		deleteDialogOpen = false;
		saving = true;
		saveError = null;

		try {
			const key = getTargetKey(deletingAssignment.target);
			const updated = assignments.filter((a) => getTargetKey(a.target) !== key);

			await assignScript(getGraphClient(), script.id, updated);
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
		if (!script) return '';
		const exportable: ExportableAssignment[] = assignments.map((a) => ({
			itemType: 'script',
			itemName: script!.displayName,
			itemId: script!.id,
			target: a.target,
			intent: null
		}));
		return exportAssignmentsCsv(exportable, groupNames, buildFilterNames());
	}

	// ─── Device status tab ────────────────────────────────────────────

	function getRunStateVariant(
		state: string
	): 'required' | 'available' | 'uninstall' | 'neutral' {
		switch (state) {
			case 'success':
				return 'required';
			case 'fail':
			case 'scriptError':
				return 'uninstall';
			case 'pending':
				return 'available';
			default:
				return 'neutral';
		}
	}

	function getRunStateLabel(state: string): string {
		switch (state) {
			case 'success':
				return 'Success';
			case 'fail':
				return 'Failed';
			case 'scriptError':
				return 'Script Error';
			case 'pending':
				return 'Pending';
			case 'notApplicable':
				return 'Not Applicable';
			default:
				return 'Unknown';
		}
	}

	const filteredDeviceStates = $derived(
		deviceStates.filter((s) => {
			if (!statusSearch) return true;
			const q = statusSearch.toLowerCase();
			return (
				(s.managedDevice?.deviceName ?? '').toLowerCase().includes(q) ||
				(s.resultMessage ?? '').toLowerCase().includes(q)
			);
		})
	);

	async function fetchStatusData(): Promise<void> {
		const id = page.params.id!;
		statusLoading = true;
		statusError = null;
		try {
			const client = getGraphClient();
			const [summary, states] = await Promise.all([
				getScriptRunSummary(client, id),
				getScriptDeviceStates(client, id)
			]);
			runSummary = summary;
			deviceStates = states;
			statusLoaded = true;
		} catch {
			statusError =
				'Device status data is not available for this script.';
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
	<PermissionGuard
		requiredScopes={['DeviceManagementConfiguration.Read.All']}
		featureName="Platform Scripts"
	>
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
			{:else if script}
				<!-- Info panel -->
				<div class="panel-raised mb-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<FileCode size={24} class="text-accent" />
							</div>
							<div>
								<h1 class="text-ink text-2xl font-bold tracking-tight">
									{script.displayName}
								</h1>
								<p class="text-ink-faint text-sm">
									{script.fileName}
								</p>
							</div>
						</div>
						<div class="flex gap-2">
							<CsvExportButton
								getCsvContent={exportCsv}
								filename="{script?.displayName ?? 'script'}-assignments.csv"
								disabled={assignments.length === 0}
							/>
							<Button
								variant="primary"
								icon={Layers}
								href="/assign?scriptId={script?.id}"
							>
								Edit in Bulk Assign
							</Button>
						</div>
					</div>

					<!-- Metadata pills -->
					<div class="mt-4 flex flex-wrap gap-2">
						<Badge variant={script.runAsAccount === 'system' ? 'info' : 'outline'}>
							Run as: {script.runAsAccount === 'system' ? 'System' : 'User'}
						</Badge>
						{#if script.runAs32Bit}
							<Badge variant="outline">32-bit</Badge>
						{/if}
						{#if script.enforceSignatureCheck}
							<Badge variant="available">Signature Check</Badge>
						{/if}
						<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
							{hasAssignments ? 'Assigned' : 'Unassigned'}
						</Badge>
					</div>

					{#if script.description}
						<p class="text-ink-faint mt-3 text-sm">{script.description}</p>
					{/if}
				</div>

				<div class="mb-4">
					<Tabs
						tabs={[
							{ id: 'script', label: 'Script Content' },
							{ id: 'assignments', label: 'Assignments' },
							{ id: 'status', label: 'Device Status' }
						]}
						active={activeTab}
						onchange={(id) => (activeTab = id)}
					/>
				</div>

				{#if activeTab === 'script'}
					<!-- Script metadata -->
					<div class="panel mb-4">
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<p class="text-muted text-xs font-medium uppercase">File Name</p>
								<p class="text-ink mt-1 text-sm font-medium">{script.fileName}</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">Run As Account</p>
								<p class="text-ink mt-1 text-sm font-medium capitalize">
									{script.runAsAccount}
								</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">Signature Check</p>
								<p class="text-ink mt-1 text-sm font-medium">
									{script.enforceSignatureCheck ? 'Enforced' : 'Not enforced'}
								</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">Run as 32-bit</p>
								<p class="text-ink mt-1 text-sm font-medium">
									{script.runAs32Bit ? 'Yes' : 'No'}
								</p>
							</div>
						</div>
					</div>

					<!-- Script content -->
					{#if decodedScriptContent}
						<div class="panel overflow-clip p-0">
							<div
								class="border-border flex items-center justify-between border-b px-4 py-2.5"
							>
								<p class="text-muted text-xs font-medium tracking-wide uppercase">
									Script Content
								</p>
								<Button
									variant="ghost"
									size="sm"
									icon={copied ? Check : Copy}
									onclick={copyScript}
								>
									{copied ? 'Copied!' : 'Copy'}
								</Button>
							</div>
							<div class="overflow-x-auto p-4">
								<pre
									class="text-ink text-xs leading-relaxed"><code>{decodedScriptContent}</code></pre>
							</div>
						</div>
					{:else}
						<EmptyState
							icon={FileCode}
							title="No script content"
							description="The script content is not available or could not be decoded."
						/>
					{/if}
				{:else if activeTab === 'assignments'}
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
							icon={FileCode}
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
				{:else if activeTab === 'status'}
					{#if statusLoading}
						<div class="space-y-4">
							<Skeleton height="8rem" rounded="lg" />
							{#each Array(4) as _, i (i)}
								<Skeleton height="3rem" rounded="lg" />
							{/each}
						</div>
					{:else if statusError}
						<EmptyState
							icon={FileCode}
							title="Status unavailable"
							description={statusError}
						/>
					{:else if runSummary}
						<div class="mb-4">
							<StatusSummaryCard
								title="Run Summary"
								segments={[
									{
										label: 'Success',
										value: runSummary.successDeviceCount,
										color: 'bg-success'
									},
									{
										label: 'Error',
										value: runSummary.errorDeviceCount,
										color: 'bg-ember'
									}
								]}
							/>
						</div>

						{#if deviceStates.length > 0}
							<div class="mb-3">
								<SearchInput
									placeholder="Filter by device name..."
									bind:value={statusSearch}
								/>
							</div>
							<div class="panel overflow-clip p-0">
								<div
									class="border-border bg-surface/95 text-muted sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm"
								>
									<div class="col-span-4">Device</div>
									<div class="col-span-3">Status</div>
									<div class="col-span-3">Last Updated</div>
									<div class="col-span-2">Error</div>
								</div>
								{#each filteredDeviceStates as state (state.id)}
									<DeviceStatusRow
										deviceName={state.managedDevice?.deviceName ?? 'Unknown'}
										userName=""
										statusVariant={getRunStateVariant(state.runState)}
										statusLabel={getRunStateLabel(state.runState)}
										lastReported={state.lastStateUpdateDateTime}
										errorDetail={state.resultMessage ||
											(state.errorCode !== 0
												? `Error code: ${state.errorCode}`
												: null)}
									/>
								{/each}
								{#if filteredDeviceStates.length === 0}
									<div class="px-4 py-8 text-center">
										<p class="text-muted text-sm">No devices match your search.</p>
									</div>
								{/if}
							</div>
						{:else}
							<EmptyState
								icon={FileCode}
								title="No device run states"
								description="No device run state data is available for this script."
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
			itemKind="script"
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
	</PermissionGuard>
</AuthGuard>
