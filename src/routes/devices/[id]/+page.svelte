<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import DeviceOverviewCard from '$lib/components/devices/DeviceOverviewCard.svelte';
	import DevicePolicyList from '$lib/components/devices/DevicePolicyList.svelte';
	import DeviceActionBar from '$lib/components/devices/DeviceActionBar.svelte';
	import { TIER_2_SCOPES } from '$lib/auth/config';
	import { getGraphClient } from '$lib/stores/graph';
	import { getDeviceDetail } from '$lib/graph/devices';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { getDeviceTypeInfo, getComplianceInfo, formatStorageSize } from '$lib/utils/device-types';
	import type { DeviceDetail } from '$lib/types/device';
	import { ArrowLeft, Package } from 'lucide-svelte';

	let deviceDetail = $state<DeviceDetail | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	let activeTab = $state('overview');

	const tabs = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'compliance', label: 'Compliance' },
		{ id: 'config', label: 'Config Profiles' },
		{ id: 'apps', label: 'Detected Apps' },
		{ id: 'actions', label: 'Quick Actions' }
	];

	async function fetchData(): Promise<void> {
		const id = page.params.id!;
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			deviceDetail = await getDeviceDetail(client, id);
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	function handleActionComplete(): void {
		fetchData();
	}

	$effect(() => {
		// Bare read, deliberately: this is the effect's only tracked dependency, so
		// navigating between device ids refetches. `void` keeps it a statement.
		void page.params.id;
		untrack(() => fetchData());
	});
</script>

<AuthGuard>
	<PermissionGuard requiredScopes={[...TIER_2_SCOPES]} featureName="Device Detail">
		<div class="animate-fade-in-up">
			{#if error}
				<div class="mb-4">
					<ErrorState message={error} onretry={fetchData} />
				</div>
			{/if}

			{#if loading && !deviceDetail}
				<!-- Skeleton loading state (initial load only) -->
				<div class="space-y-4">
					<Skeleton width="5rem" height="1.5rem" rounded="lg" />
					<div class="flex items-center gap-4">
						<Skeleton width="3rem" height="3rem" rounded="lg" />
						<div class="flex-1 space-y-2">
							<Skeleton width="40%" height="1.75rem" />
							<Skeleton width="25%" height="0.875rem" />
						</div>
					</div>
					<div class="flex gap-4">
						{#each Array(5) as _, i (i)}
							<Skeleton width="5rem" height="1.5rem" />
						{/each}
					</div>
					<div class="panel">
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{#each Array(8) as _, i (i)}
								<div class="space-y-1">
									<Skeleton width="5rem" height="0.625rem" />
									<Skeleton width="10rem" height="1rem" />
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			{#if deviceDetail}
				{@const device = deviceDetail.device}
				{@const typeInfo = getDeviceTypeInfo(device.operatingSystem)}
				{@const complianceInfo = getComplianceInfo(device.complianceState)}
				{@const TypeIcon = typeInfo.icon}

				<!-- Back button -->
				<div class="mb-4">
					<Button variant="ghost" size="sm" icon={ArrowLeft} href="/devices">
						Back to Devices
					</Button>
				</div>

				<!-- Page header -->
				<div class="panel-raised mb-6">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-center gap-4">
							<div
								class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							>
								<TypeIcon size={24} class="text-accent" />
							</div>
							<div>
								<h1 class="text-ink text-2xl font-bold tracking-tight">
									{device.deviceName}
								</h1>
								<p class="text-ink-faint text-sm">
									{device.userDisplayName ?? 'No assigned user'}
								</p>
							</div>
						</div>
						<div class="flex flex-wrap gap-2">
							<Badge variant="info">{typeInfo.label}</Badge>
							{#if device.osVersion}
								<Badge variant="outline">{device.osVersion}</Badge>
							{/if}
							<Badge variant={complianceInfo.variant} dot>
								{complianceInfo.label}
							</Badge>
						</div>
					</div>
				</div>

				<!-- Tabs -->
				<div class="mb-4">
					<Tabs {tabs} active={activeTab} onchange={(id) => (activeTab = id)} />
				</div>

				<!-- Tab content -->
				{#if activeTab === 'overview'}
					<DeviceOverviewCard {device} />
				{:else if activeTab === 'compliance'}
					<DevicePolicyList
						policies={deviceDetail.compliancePolicyStates}
						type="compliance"
						emptyMessage="No compliance policies"
					/>
				{:else if activeTab === 'config'}
					<DevicePolicyList
						policies={deviceDetail.configurationStates}
						type="configuration"
						emptyMessage="No configuration profiles"
					/>
				{:else if activeTab === 'apps'}
					{@const detectedApps = deviceDetail.detectedApps}
					{#if detectedApps.length === 0}
						<EmptyState
							icon={Package}
							title="No detected apps"
							description="No applications have been detected on this device."
						/>
					{:else}
						<div class="panel overflow-clip p-0">
							<div class="border-border bg-surface/95 sticky top-12 z-10 border-b backdrop-blur-sm">
								<div class="px-4 py-2">
									<p class="text-muted text-xs font-medium tracking-wide uppercase">
										{detectedApps.length} detected app{detectedApps.length !== 1 ? 's' : ''}
									</p>
								</div>
								<div
									class="border-border grid grid-cols-12 gap-2 border-t px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase"
								>
									<div class="text-muted col-span-6 sm:col-span-7">App Name</div>
									<div class="text-muted col-span-3 sm:col-span-3">Version</div>
									<div class="text-muted col-span-3 sm:col-span-2 text-right">Size</div>
								</div>
							</div>

							{#each detectedApps as app, i (i)}
								<div
									class="border-border grid grid-cols-12 items-center gap-2 border-b px-4 py-2.5"
								>
									<div class="col-span-6 sm:col-span-7 min-w-0">
										<p class="text-ink truncate text-sm">
											{app.displayName ?? 'Unknown App'}
										</p>
									</div>
									<div class="col-span-3 sm:col-span-3">
										<span class="text-ink-faint text-sm font-mono">
											{app.version ?? '—'}
										</span>
									</div>
									<div class="col-span-3 sm:col-span-2 text-right">
										<span class="text-ink-faint text-sm">
											{app.sizeInByte > 0 ? formatStorageSize(app.sizeInByte) : '—'}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else if activeTab === 'actions'}
					<DeviceActionBar
						deviceId={device.id}
						deviceName={device.deviceName}
						onActionComplete={handleActionComplete}
					/>
				{/if}
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>
