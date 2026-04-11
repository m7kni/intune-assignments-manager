<script lang="ts">
	import { page } from '$app/state';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Laptop, Save, ArrowLeft } from 'lucide-svelte';
	import { TIER_4_SCOPES } from '$lib/auth/config';
	import { getGraphClient } from '$lib/stores/graph';
	import {
		getAutopilotDevice,
		updateAutopilotDeviceProperties
	} from '$lib/graph/autopilot';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type { AutopilotDevice } from '$lib/types/autopilot';

	let device = $state<AutopilotDevice | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let saveSuccess = $state(false);

	// Editable fields
	let editGroupTag = $state('');
	let editDisplayName = $state('');

	function getEnrollmentBadge(state: string): {
		variant: 'required' | 'available' | 'uninstall' | 'neutral' | 'info';
		label: string;
	} {
		switch (state) {
			case 'enrolled':
				return { variant: 'required', label: 'Enrolled' };
			case 'pendingReset':
				return { variant: 'available', label: 'Pending Reset' };
			case 'failed':
				return { variant: 'uninstall', label: 'Failed' };
			case 'notContacted':
				return { variant: 'neutral', label: 'Not Contacted' };
			case 'blocked':
				return { variant: 'uninstall', label: 'Blocked' };
			default:
				return { variant: 'neutral', label: 'Unknown' };
		}
	}

	function getProfileAssignmentBadge(status: string): {
		variant: 'required' | 'available' | 'uninstall' | 'neutral' | 'info';
		label: string;
	} {
		switch (status) {
			case 'assignedInSync':
				return { variant: 'required', label: 'Assigned (In Sync)' };
			case 'assignedOutOfSync':
				return { variant: 'available', label: 'Assigned (Out of Sync)' };
			case 'assignedUnkownSyncState':
				return { variant: 'available', label: 'Assigned (Sync Unknown)' };
			case 'notAssigned':
				return { variant: 'neutral', label: 'Not Assigned' };
			case 'pending':
				return { variant: 'info', label: 'Pending' };
			case 'failed':
				return { variant: 'uninstall', label: 'Failed' };
			default:
				return { variant: 'neutral', label: 'Unknown' };
		}
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return 'Never';
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
			device = await getAutopilotDevice(client, id);
			editGroupTag = device.groupTag ?? '';
			editDisplayName = device.addressableUserName ?? '';
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	async function handleSave(): Promise<void> {
		if (!device) return;
		saving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const client = getGraphClient();
			await updateAutopilotDeviceProperties(client, device.id, {
				groupTag: editGroupTag,
				displayName: editDisplayName
			});
			saveSuccess = true;
			// Refresh device data
			device = await getAutopilotDevice(client, device.id);
			editGroupTag = device.groupTag ?? '';
			editDisplayName = device.addressableUserName ?? '';

			setTimeout(() => {
				saveSuccess = false;
			}, 3000);
		} catch (err) {
			saveError = toFriendlyMessage(err);
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		fetchData();
	});
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
							{#each Array(6) as _, i (i)}
								<div class="space-y-1">
									<Skeleton width="5rem" height="0.75rem" />
									<Skeleton width="10rem" height="1rem" />
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else if device}
				{@const enrollBadge = getEnrollmentBadge(device.enrollmentState)}
				{@const profileBadge = getProfileAssignmentBadge(
					device.deploymentProfileAssignmentStatus
				)}

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

				<!-- Device info panel -->
				<div class="panel-raised mb-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<Laptop size={24} class="text-accent" />
							</div>
							<div>
								<h1 class="text-ink text-2xl font-bold tracking-tight">
									{device.serialNumber}
								</h1>
								<p class="text-ink-faint text-sm">
									{device.manufacturer ?? 'Unknown'} {device.model ?? ''}
								</p>
							</div>
						</div>
					</div>

					<!-- Status badges -->
					<div class="mt-4 flex flex-wrap gap-2">
						<Badge variant={enrollBadge.variant} dot>
							{enrollBadge.label}
						</Badge>
						<Badge variant={profileBadge.variant} dot>
							{profileBadge.label}
						</Badge>
						{#if device.groupTag}
							<Badge variant="outline">{device.groupTag}</Badge>
						{/if}
					</div>
				</div>

				<!-- Device details -->
				<div class="panel mb-6">
					<h2 class="text-ink mb-4 text-lg font-semibold">Device Information</h2>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div>
							<p class="text-muted text-xs font-medium uppercase">Serial Number</p>
							<p class="text-ink text-sm">{device.serialNumber}</p>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">Manufacturer</p>
							<p class="text-ink text-sm">{device.manufacturer ?? '-'}</p>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">Model</p>
							<p class="text-ink text-sm">{device.model ?? '-'}</p>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">Enrollment State</p>
							<div class="mt-0.5">
								<Badge variant={enrollBadge.variant} dot>
									{enrollBadge.label}
								</Badge>
							</div>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">
								Profile Assignment Status
							</p>
							<div class="mt-0.5">
								<Badge variant={profileBadge.variant} dot>
									{profileBadge.label}
								</Badge>
							</div>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">Last Contacted</p>
							<p class="text-ink text-sm">
								{formatDateTime(device.lastContactedDateTime)}
							</p>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">Purchase Order</p>
							<p class="text-ink text-sm">
								{device.purchaseOrderIdentifier ?? '-'}
							</p>
						</div>
						<div>
							<p class="text-muted text-xs font-medium uppercase">User</p>
							<p class="text-ink text-sm">
								{device.addressableUserName ?? '-'}
							</p>
						</div>
						{#if device.deploymentProfileAssignmentDetailedStatus}
							<div>
								<p class="text-muted text-xs font-medium uppercase">
									Assignment Detail
								</p>
								<p class="text-ink text-sm">
									{device.deploymentProfileAssignmentDetailedStatus}
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Editable properties -->
				<div class="panel">
					<h2 class="text-ink mb-4 text-lg font-semibold">Edit Properties</h2>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="groupTag" class="text-muted mb-1 block text-xs font-medium uppercase">
								Group Tag
							</label>
							<input
								id="groupTag"
								type="text"
								bind:value={editGroupTag}
								class="border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
								placeholder="Enter group tag..."
							/>
						</div>
						<div>
							<label
								for="displayName"
								class="text-muted mb-1 block text-xs font-medium uppercase"
							>
								Display Name
							</label>
							<input
								id="displayName"
								type="text"
								bind:value={editDisplayName}
								class="border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
								placeholder="Enter display name..."
							/>
						</div>
					</div>
					<div class="mt-4 flex items-center gap-3">
						<Button
							variant="primary"
							icon={Save}
							onclick={handleSave}
							loading={saving}
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</Button>
						{#if saveSuccess}
							<span class="text-success text-sm font-medium">Changes saved</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>
