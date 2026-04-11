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
	import AssignmentRow from '$lib/components/assignments/AssignmentRow.svelte';
	import AssignmentEditor from '$lib/components/assignments/AssignmentEditor.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { FileStack, Plus, ArrowLeft, Check, X as XIcon } from 'lucide-svelte';
	import { TIER_4_SCOPES } from '$lib/auth/config';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getDeploymentProfile,
		getDeploymentProfileAssignments,
		assignDeploymentProfile
	} from '$lib/graph/autopilot';
	import { getTargetKey } from '$lib/graph/merge';
	import { resolveGroupNames } from '$lib/stores/group-cache';
	import { ensureFiltersLoaded, getFilterById } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type {
		AutopilotDeploymentProfile,
		AutopilotDeploymentProfileAssignment
	} from '$lib/types/autopilot';
	import type { AssignmentTarget, AssignmentIntent } from '$lib/types/graph';

	let profile = $state<AutopilotDeploymentProfile | null>(null);
	let assignments = $state<AutopilotDeploymentProfileAssignment[]>([]);
	let groupNames = $state<Map<string, string>>(new Map());
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Tab state
	let activeTab = $state('settings');

	// Editor state
	let editorOpen = $state(false);
	let editorMode = $state<'add' | 'edit'>('add');
	let editingAssignment = $state<AutopilotDeploymentProfileAssignment | null>(null);

	// Delete confirmation state
	let deleteDialogOpen = $state(false);
	let deletingAssignment = $state<AutopilotDeploymentProfileAssignment | null>(null);

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

	function formatDateTime(dateStr: string | null | undefined): string {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}

	async function fetchData(): Promise<void> {
		const id = page.params.id!;
		loading = true;
		error = null;
		try {
			const client = getGraphClient();

			const [profileData, assignmentData] = await Promise.all([
				getDeploymentProfile(client, id),
				getDeploymentProfileAssignments(client, id),
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
		const assignmentData = await getDeploymentProfileAssignments(client, id);
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

	function openEditEditor(assignment: AutopilotDeploymentProfileAssignment): void {
		editorMode = 'edit';
		editingAssignment = assignment;
		editorOpen = true;
	}

	function openDeleteDialog(assignment: AutopilotDeploymentProfileAssignment): void {
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

			const newAssignment: AutopilotDeploymentProfileAssignment = {
				id: existingIdx >= 0 ? updated[existingIdx].id : '',
				target
			};

			if (existingIdx >= 0) {
				updated[existingIdx] = newAssignment;
			} else {
				updated.push(newAssignment);
			}

			await assignDeploymentProfile(getGraphClient(), profile.id, updated);
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

			await assignDeploymentProfile(getGraphClient(), profile.id, updated);
			await refreshAssignments();
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
			deletingAssignment = null;
		}
	}
</script>

<AuthGuard>
	<PermissionGuard requiredScopes={[...TIER_4_SCOPES]} featureName="Windows Autopilot">
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
				<!-- Back link -->
				<div class="mb-4">
					<a
						href="/autopilot"
						class="text-accent hover:text-accent/80 inline-flex items-center gap-1 text-sm font-medium transition-colors"
					>
						<ArrowLeft size={16} />
						Back to Autopilot
					</a>
				</div>

				<!-- Profile info panel -->
				<div class="panel-raised mb-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<FileStack size={24} class="text-accent" />
							</div>
							<div>
								<h1 class="text-ink text-2xl font-bold tracking-tight">
									{profile.displayName}
								</h1>
								<p class="text-ink-faint text-sm">Deployment Profile</p>
							</div>
						</div>
					</div>

					<!-- Metadata pills -->
					<div class="mt-4 flex flex-wrap gap-2">
						<Badge
							variant={profile.preprovisioningAllowed ? 'info' : 'neutral'}
						>
							{#if profile.preprovisioningAllowed}
								<Check size={12} class="mr-0.5 inline" />
							{:else}
								<XIcon size={12} class="mr-0.5 inline" />
							{/if}
							Pre-provisioning
						</Badge>
						<Badge variant={hasAssignments ? 'required' : 'neutral'} dot>
							{hasAssignments ? 'Assigned' : 'Unassigned'}
						</Badge>
						{#if profile.language}
							<Badge variant="outline">{profile.language}</Badge>
						{/if}
					</div>

					{#if profile.description}
						<p class="text-ink-faint mt-3 text-sm">{profile.description}</p>
					{/if}
				</div>

				<div class="mb-4">
					<Tabs
						tabs={[
							{ id: 'settings', label: 'Settings' },
							{ id: 'assignments', label: 'Assignments' }
						]}
						active={activeTab}
						onchange={(id) => (activeTab = id)}
					/>
				</div>

				{#if activeTab === 'settings'}
					<!-- Profile settings -->
					<div class="panel">
						<h2 class="text-ink mb-4 text-lg font-semibold">Profile Configuration</h2>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Device Name Template
								</p>
								<p class="text-ink text-sm">
									{profile.deviceNameTemplate ?? 'Not configured'}
								</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">Language</p>
								<p class="text-ink text-sm">{profile.language ?? 'OS default'}</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Pre-provisioning
								</p>
								<div class="mt-0.5">
									<Badge
										variant={profile.preprovisioningAllowed ? 'required' : 'neutral'}
										dot
									>
										{profile.preprovisioningAllowed ? 'Allowed' : 'Not Allowed'}
									</Badge>
								</div>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">Created</p>
								<p class="text-ink text-sm">
									{formatDateTime(profile.createdDateTime)}
								</p>
							</div>
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Last Modified
								</p>
								<p class="text-ink text-sm">
									{formatDateTime(profile.lastModifiedDateTime)}
								</p>
							</div>
						</div>
					</div>

					{#if profile.outOfBoxExperienceSettings}
						<div class="panel mt-4">
							<h2 class="text-ink mb-4 text-lg font-semibold">
								Out-of-Box Experience (OOBE)
							</h2>
							<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div>
									<p class="text-muted text-xs font-medium uppercase">User Type</p>
									<p class="text-ink text-sm capitalize">
										{profile.outOfBoxExperienceSettings.userType || 'Not set'}
									</p>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">
										Device Usage Type
									</p>
									<p class="text-ink text-sm capitalize">
										{profile.outOfBoxExperienceSettings.deviceUsageType || 'Not set'}
									</p>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">
										Hide Privacy Settings
									</p>
									<div class="mt-0.5">
										<Badge
											variant={profile.outOfBoxExperienceSettings.hidePrivacySettings
												? 'available'
												: 'neutral'}
											dot
										>
											{profile.outOfBoxExperienceSettings.hidePrivacySettings
												? 'Hidden'
												: 'Shown'}
										</Badge>
									</div>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">Hide EULA</p>
									<div class="mt-0.5">
										<Badge
											variant={profile.outOfBoxExperienceSettings.hideEULA
												? 'available'
												: 'neutral'}
											dot
										>
											{profile.outOfBoxExperienceSettings.hideEULA
												? 'Hidden'
												: 'Shown'}
										</Badge>
									</div>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">
										Hide Escape Link
									</p>
									<div class="mt-0.5">
										<Badge
											variant={profile.outOfBoxExperienceSettings.hideEscapeLink
												? 'available'
												: 'neutral'}
											dot
										>
											{profile.outOfBoxExperienceSettings.hideEscapeLink
												? 'Hidden'
												: 'Shown'}
										</Badge>
									</div>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">
										Skip Keyboard Selection
									</p>
									<div class="mt-0.5">
										<Badge
											variant={profile.outOfBoxExperienceSettings.skipKeyboardSelectionPage
												? 'available'
												: 'neutral'}
											dot
										>
											{profile.outOfBoxExperienceSettings.skipKeyboardSelectionPage
												? 'Skipped'
												: 'Shown'}
										</Badge>
									</div>
								</div>
								<div>
									<p class="text-muted text-xs font-medium uppercase">
										Hide Change Account
									</p>
									<div class="mt-0.5">
										<Badge
											variant={profile.outOfBoxExperienceSettings.hideChangeAccountOption
												? 'available'
												: 'neutral'}
											dot
										>
											{profile.outOfBoxExperienceSettings.hideChangeAccountOption
												? 'Hidden'
												: 'Shown'}
										</Badge>
									</div>
								</div>
							</div>
						</div>
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
							icon={FileStack}
							title="No assignments yet"
							description="Add an assignment to target this deployment profile to device groups."
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
	</PermissionGuard>
</AuthGuard>
