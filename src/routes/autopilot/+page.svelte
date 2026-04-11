<script lang="ts">
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import {
		Search,
		Laptop,
		ChevronRight,
		FileStack,
		Check,
		X as XIcon
	} from 'lucide-svelte';
	import { TIER_4_SCOPES } from '$lib/auth/config';
	import { getGraphClient } from '$lib/stores/graph';
	import { listAutopilotDevices, listDeploymentProfiles } from '$lib/graph/autopilot';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type { AutopilotDevice, AutopilotDeploymentProfile } from '$lib/types/autopilot';

	let activeTab = $state('devices');

	// ─── Devices tab state ─────────────────────────────────────────
	let devices = $state<AutopilotDevice[]>([]);
	let deviceSearch = $state('');
	let devicesLoading = $state(false);
	let devicesError = $state<string | null>(null);
	let devicesLoaded = $state(false);

	// ─── Profiles tab state ────────────────────────────────────────
	let profiles = $state<AutopilotDeploymentProfile[]>([]);
	let profileSearch = $state('');
	let profilesLoading = $state(false);
	let profilesError = $state<string | null>(null);
	let profilesLoaded = $state(false);

	const filteredDevices = $derived.by(() => {
		if (!deviceSearch.trim()) return devices;
		const q = deviceSearch.toLowerCase();
		return devices.filter(
			(d) =>
				d.serialNumber.toLowerCase().includes(q) ||
				(d.model ?? '').toLowerCase().includes(q) ||
				(d.manufacturer ?? '').toLowerCase().includes(q) ||
				(d.groupTag ?? '').toLowerCase().includes(q) ||
				(d.addressableUserName ?? '').toLowerCase().includes(q)
		);
	});

	const filteredProfiles = $derived.by(() => {
		if (!profileSearch.trim()) return profiles;
		const q = profileSearch.toLowerCase();
		return profiles.filter(
			(p) =>
				p.displayName.toLowerCase().includes(q) ||
				(p.description ?? '').toLowerCase().includes(q) ||
				(p.deviceNameTemplate ?? '').toLowerCase().includes(q)
		);
	});

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

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		try {
			return new Date(dateStr).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	async function fetchDevices(): Promise<void> {
		devicesLoading = true;
		devicesError = null;
		try {
			const client = getGraphClient();
			devices = await listAutopilotDevices(client);
			devicesLoaded = true;
		} catch (err) {
			devicesError = toFriendlyMessage(err);
		} finally {
			devicesLoading = false;
		}
	}

	async function fetchProfiles(): Promise<void> {
		profilesLoading = true;
		profilesError = null;
		try {
			const client = getGraphClient();
			profiles = await listDeploymentProfiles(client);
			profilesLoaded = true;
		} catch (err) {
			profilesError = toFriendlyMessage(err);
		} finally {
			profilesLoading = false;
		}
	}

	$effect(() => {
		if (activeTab === 'devices' && !devicesLoaded && !devicesLoading) {
			fetchDevices();
		}
	});

	$effect(() => {
		if (activeTab === 'profiles' && !profilesLoaded && !profilesLoading) {
			fetchProfiles();
		}
	});

	// Auto-load devices on first mount
	$effect(() => {
		fetchDevices();
	});
</script>

<AuthGuard>
	<PermissionGuard requiredScopes={[...TIER_4_SCOPES]} featureName="Windows Autopilot">
		<div class="animate-fade-in-up">
			<PageHeader
				title="Windows Autopilot"
				icon={Laptop}
				description="Browse Autopilot device identities and deployment profiles"
			/>

			<div class="mb-4">
				<Tabs
					tabs={[
						{ id: 'devices', label: 'Devices' },
						{ id: 'profiles', label: 'Deployment Profiles' }
					]}
					active={activeTab}
					onchange={(id) => (activeTab = id)}
				/>
			</div>

			{#if activeTab === 'devices'}
				<!-- Devices tab -->
				<div class="mb-4">
					<SearchInput
						placeholder="Search by serial number, model, or group tag..."
						bind:value={deviceSearch}
					/>
				</div>

				{#if devicesError}
					<div class="mb-4">
						<ErrorState message={devicesError} onretry={fetchDevices} />
					</div>
				{/if}

				{#if devicesLoading}
					<div class="panel overflow-clip p-0">
						<div class="border-border border-b px-4 py-2.5">
							<Skeleton width="10rem" height="0.75rem" />
						</div>
						{#each Array(8) as _, i (i)}
							<div class="border-border flex items-center gap-4 border-b px-4 py-3">
								<Skeleton width="2.5rem" height="2.5rem" rounded="lg" />
								<div class="flex-1 space-y-1">
									<Skeleton width="{60 - i * 3}%" height="0.875rem" />
									<Skeleton width="30%" height="0.75rem" />
								</div>
								<Skeleton width="4rem" height="1.25rem" rounded="full" />
							</div>
						{/each}
					</div>
				{:else if filteredDevices.length === 0 && deviceSearch.trim() !== ''}
					<EmptyState
						icon={Search}
						title="No devices match your search"
						description="Try adjusting your search term."
					/>
				{:else if devices.length === 0}
					<EmptyState
						icon={Laptop}
						title="No Autopilot devices found"
						description="Your tenant doesn't have any Windows Autopilot device identities registered."
					/>
				{:else}
					<div class="panel overflow-clip p-0">
						<div
							class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
						>
							<p class="text-muted text-xs font-medium tracking-wide uppercase">
								{filteredDevices.length}{deviceSearch.trim() !== ''
									? ` of ${devices.length}`
									: ''} device{filteredDevices.length !== 1 ? 's' : ''}
								{#if deviceSearch.trim() !== ''}
									matching "{deviceSearch.trim()}"
								{/if}
							</p>
						</div>

						<!-- Column headers -->
						<div
							class="border-border bg-surface/95 text-muted hidden grid-cols-12 gap-2 border-b px-4 py-2 text-xs font-medium tracking-wide uppercase backdrop-blur-sm md:grid"
						>
							<div class="col-span-2">Serial Number</div>
							<div class="col-span-2">Manufacturer / Model</div>
							<div class="col-span-2">Group Tag</div>
							<div class="col-span-2">Enrollment</div>
							<div class="col-span-2">Profile Status</div>
							<div class="col-span-2">Last Contact</div>
						</div>

						{#each filteredDevices as device, i (device.id)}
							{@const enrollBadge = getEnrollmentBadge(device.enrollmentState)}
							{@const profileBadge = getProfileAssignmentBadge(
								device.deploymentProfileAssignmentStatus
							)}
							<a
								href="/autopilot/devices/{device.id}"
								class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2 md:grid md:grid-cols-12 md:gap-2"
								in:fly={{ y: 10, duration: 200, delay: Math.min(i * 20, 300) }}
							>
								<!-- Mobile: icon + serial -->
								<div
									class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl md:hidden"
								>
									<Laptop size={20} class="text-accent" />
								</div>

								<!-- Serial Number -->
								<div class="col-span-2 min-w-0 flex-1 md:flex-none">
									<p
										class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors"
									>
										{device.serialNumber}
									</p>
									<p class="text-ink-faint truncate text-xs md:hidden">
										{device.manufacturer ?? ''} {device.model ?? ''}
									</p>
								</div>

								<!-- Manufacturer / Model (desktop only) -->
								<div class="col-span-2 hidden min-w-0 md:block">
									<p class="text-ink truncate text-sm">{device.manufacturer ?? '-'}</p>
									<p class="text-ink-faint truncate text-xs">{device.model ?? '-'}</p>
								</div>

								<!-- Group Tag -->
								<div class="col-span-2 hidden min-w-0 md:block">
									<p class="text-ink truncate text-sm">
										{device.groupTag ?? '-'}
									</p>
								</div>

								<!-- Enrollment State -->
								<div class="col-span-2 hidden md:block">
									<Badge variant={enrollBadge.variant} dot>
										{enrollBadge.label}
									</Badge>
								</div>

								<!-- Profile Assignment Status -->
								<div class="col-span-2">
									<Badge variant={profileBadge.variant} dot>
										{profileBadge.label}
									</Badge>
								</div>

								<!-- Last Contact -->
								<div class="col-span-2 hidden items-center gap-1 md:flex">
									<span class="text-ink-faint text-xs">
										{formatDate(device.lastContactedDateTime)}
									</span>
								</div>

								<!-- Mobile chevron -->
								<ChevronRight
									size={16}
									class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5 md:hidden"
								/>
							</a>
						{/each}
					</div>
				{/if}
			{:else if activeTab === 'profiles'}
				<!-- Profiles tab -->
				<div class="mb-4">
					<SearchInput
						placeholder="Search profiles by name..."
						bind:value={profileSearch}
					/>
				</div>

				{#if profilesError}
					<div class="mb-4">
						<ErrorState message={profilesError} onretry={fetchProfiles} />
					</div>
				{/if}

				{#if profilesLoading}
					<div class="panel overflow-clip p-0">
						<div class="border-border border-b px-4 py-2.5">
							<Skeleton width="10rem" height="0.75rem" />
						</div>
						{#each Array(5) as _, i (i)}
							<div class="border-border flex items-center gap-4 border-b px-4 py-3">
								<Skeleton width="2.5rem" height="2.5rem" rounded="lg" />
								<div class="flex-1 space-y-1">
									<Skeleton width="{60 - i * 5}%" height="0.875rem" />
									<Skeleton width="40%" height="0.75rem" />
								</div>
								<Skeleton width="5rem" height="1.25rem" rounded="full" />
							</div>
						{/each}
					</div>
				{:else if filteredProfiles.length === 0 && profileSearch.trim() !== ''}
					<EmptyState
						icon={Search}
						title="No profiles match your search"
						description="Try adjusting your search term."
					/>
				{:else if profiles.length === 0}
					<EmptyState
						icon={FileStack}
						title="No deployment profiles found"
						description="Your tenant doesn't have any Autopilot deployment profiles configured."
					/>
				{:else}
					<div class="panel overflow-clip p-0">
						<div
							class="border-border bg-surface/95 sticky top-12 z-10 border-b px-4 py-2.5 backdrop-blur-sm"
						>
							<p class="text-muted text-xs font-medium tracking-wide uppercase">
								{filteredProfiles.length}{profileSearch.trim() !== ''
									? ` of ${profiles.length}`
									: ''} profile{filteredProfiles.length !== 1 ? 's' : ''}
								{#if profileSearch.trim() !== ''}
									matching "{profileSearch.trim()}"
								{/if}
							</p>
						</div>

						{#each filteredProfiles as profile, i (profile.id)}
							<a
								href="/autopilot/profiles/{profile.id}"
								class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
								in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}
							>
								<div
									class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
								>
									<FileStack size={20} class="text-accent" />
								</div>

								<div class="min-w-0 flex-1">
									<p
										class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors"
									>
										{profile.displayName}
									</p>
									<p class="text-ink-faint truncate text-xs">
										{profile.description ?? 'No description'}
									</p>
								</div>

								<!-- Device name template -->
								{#if profile.deviceNameTemplate}
									<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
										{profile.deviceNameTemplate}
									</span>
								{/if}

								<!-- Pre-provisioning badge -->
								<Badge variant={profile.preprovisioningAllowed ? 'info' : 'neutral'}>
									{#if profile.preprovisioningAllowed}
										<Check size={12} class="mr-0.5 inline" />
									{:else}
										<XIcon size={12} class="mr-0.5 inline" />
									{/if}
									Pre-provision
								</Badge>

								<!-- Language -->
								{#if profile.language}
									<span class="text-ink-faint hidden text-xs whitespace-nowrap md:block">
										{profile.language}
									</span>
								{/if}

								<ChevronRight
									size={16}
									class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
								/>
							</a>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>
