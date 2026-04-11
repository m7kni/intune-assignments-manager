<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { fly } from 'svelte/transition';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DropdownMenu from '$lib/components/ui/DropdownMenu.svelte';
	import DeviceRow from '$lib/components/ui/DeviceRow.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import BulkActionDialog from '$lib/components/devices/BulkActionDialog.svelte';
	import {
		Search,
		Monitor,
		ArrowDownAZ,
		ArrowUpZA,
		Clock,
		ShieldCheck,
		RefreshCw,
		RotateCcw,
		Lock,
		Power,
		KeyRound,
		UserMinus,
		Trash2,
		X
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import type { ManagedDevice, DeviceAction } from '$lib/types/device';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { listDevices, loadMoreDevices } from '$lib/graph/devices';
	import {
		DEVICE_PLATFORM_OPTIONS,
		DEVICE_COMPLIANCE_OPTIONS,
		DEVICE_OWNERSHIP_OPTIONS,
		filterDevices,
		hasActiveDeviceFilters
	} from '$lib/utils/filters';

	const DEVICE_SELECT_FIELDS = [
		'id',
		'deviceName',
		'userDisplayName',
		'userPrincipalName',
		'managedDeviceOwnerType',
		'operatingSystem',
		'osVersion',
		'deviceType',
		'complianceState',
		'lastSyncDateTime',
		'enrolledDateTime',
		'model',
		'manufacturer',
		'serialNumber',
		'totalStorageSpaceInBytes',
		'freeStorageSpaceInBytes',
		'managementAgent',
		'isEncrypted',
		'isSupervised',
		'azureADDeviceId',
		'azureADRegistered',
		'emailAddress',
		'deviceRegistrationState'
	];

	let devices = $state<ManagedDevice[]>([]);
	let nextLink = $state<string | null>(null);
	let search = $state('');
	let loading = $state(false);
	let loadingMore = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<string>('name-asc');
	let platformFilter = $state<string[]>([]);
	let complianceFilter = $state<string[]>([]);
	let ownershipFilter = $state<string[]>([]);

	// ─── Multi-select state ────────────────────────────────────────
	let selectedDeviceIds = new SvelteSet<string>();
	let bulkActionOpen = $state(false);
	let bulkAction = $state<DeviceAction>('syncDevice');

	const selectedCount = $derived(selectedDeviceIds.size);
	const hasSelection = $derived(selectedCount > 0);

	const selectedDevices = $derived.by(() => {
		return filteredDevices
			.filter((d) => selectedDeviceIds.has(d.id))
			.map((d) => ({ id: d.id, deviceName: d.deviceName }));
	});

	const allOnPageSelected = $derived.by(() => {
		if (filteredDevices.length === 0) return false;
		return filteredDevices.every((d) => selectedDeviceIds.has(d.id));
	});

	function toggleDevice(id: string) {
		if (selectedDeviceIds.has(id)) {
			selectedDeviceIds.delete(id);
		} else {
			selectedDeviceIds.add(id);
		}
	}

	function toggleSelectAll() {
		if (allOnPageSelected) {
			// Deselect all visible
			for (const d of filteredDevices) {
				selectedDeviceIds.delete(d.id);
			}
		} else {
			// Select all visible
			for (const d of filteredDevices) {
				selectedDeviceIds.add(d.id);
			}
		}
	}

	function clearSelection() {
		selectedDeviceIds.clear();
	}

	function openBulkAction(action: DeviceAction) {
		bulkAction = action;
		bulkActionOpen = true;
	}

	function closeBulkAction() {
		bulkActionOpen = false;
	}

	const sortOptions = [
		{ id: 'name-asc', label: 'Name A\u2013Z', icon: ArrowDownAZ },
		{ id: 'name-desc', label: 'Name Z\u2013A', icon: ArrowUpZA },
		{ id: 'sync-newest', label: 'Last Sync (Newest)', icon: Clock },
		{ id: 'sync-oldest', label: 'Last Sync (Oldest)', icon: Clock },
		{ id: 'compliance', label: 'Compliance State', icon: ShieldCheck }
	];

	const filteredDevices = $derived.by(() => {
		let result = filterDevices(devices, {
			search,
			platforms: platformFilter,
			complianceStates: complianceFilter,
			ownershipTypes: ownershipFilter
		});

		if (sortBy === 'name-desc') {
			result = [...result].sort((a, b) => b.deviceName.localeCompare(a.deviceName));
		} else if (sortBy === 'sync-newest') {
			result = [...result].sort((a, b) => {
				if (!a.lastSyncDateTime) return 1;
				if (!b.lastSyncDateTime) return -1;
				return b.lastSyncDateTime.localeCompare(a.lastSyncDateTime);
			});
		} else if (sortBy === 'sync-oldest') {
			result = [...result].sort((a, b) => {
				if (!a.lastSyncDateTime) return 1;
				if (!b.lastSyncDateTime) return -1;
				return a.lastSyncDateTime.localeCompare(b.lastSyncDateTime);
			});
		} else if (sortBy === 'compliance') {
			const order = ['compliant', 'inGracePeriod', 'unknown', 'noncompliant', 'error', 'conflict', 'configManager'];
			result = [...result].sort(
				(a, b) => order.indexOf(a.complianceState) - order.indexOf(b.complianceState)
			);
		}

		return result;
	});

	const filtersActive = $derived(
		hasActiveDeviceFilters(platformFilter, complianceFilter, ownershipFilter)
	);

	async function fetchDevices(): Promise<void> {
		loading = true;
		error = null;
		try {
			const client = getGraphClient();
			const result = await listDevices(client, {
				top: 100,
				orderBy: 'deviceName',
				select: DEVICE_SELECT_FIELDS
			});
			devices = result.devices;
			nextLink = result.nextLink;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	async function loadMore(): Promise<void> {
		if (!nextLink || loadingMore) return;
		loadingMore = true;
		try {
			const client = getGraphClient();
			const result = await loadMoreDevices(client, nextLink);
			devices = [...devices, ...result.devices];
			nextLink = result.nextLink;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loadingMore = false;
		}
	}

	$effect(() => {
		fetchDevices();
	});
</script>

<AuthGuard>
	<PermissionGuard
		requiredScopes={['DeviceManagementManagedDevices.Read.All']}
		featureName="Device Inventory"
	>
		<div class="animate-fade-in-up">
			<PageHeader
				title="Devices"
				icon={Monitor}
				description="Browse managed device inventory"
			/>

			<!-- Filter bar -->
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<div class="min-w-0 flex-1">
					<SearchInput
						placeholder="Filter by name, user, serial number..."
						bind:value={search}
					/>
				</div>
				<MultiSelectFilter
					label="Platform"
					options={DEVICE_PLATFORM_OPTIONS}
					bind:selected={platformFilter}
				/>
				<MultiSelectFilter
					label="Compliance"
					options={DEVICE_COMPLIANCE_OPTIONS}
					bind:selected={complianceFilter}
				/>
				<MultiSelectFilter
					label="Ownership"
					options={DEVICE_OWNERSHIP_OPTIONS}
					bind:selected={ownershipFilter}
				/>
				<DropdownMenu
					items={sortOptions}
					selected={sortBy}
					label="Sort"
					onselect={(id) => (sortBy = id)}
				/>
			</div>

			{#if error}
				<div class="mb-4">
					<ErrorState message={error} onretry={fetchDevices} />
				</div>
			{/if}

			{#if loading}
				<div class="panel overflow-clip p-0">
					<div class="border-border border-b px-4 py-2.5">
						<Skeleton width="10rem" height="0.75rem" />
					</div>
					{#each Array(8) as _, i}
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
			{:else if filteredDevices.length === 0 && (search.trim() !== '' || filtersActive)}
				<EmptyState
					icon={Search}
					title="No devices match your filters"
					description="Try adjusting your filters or search term."
				/>
			{:else if devices.length === 0}
				<EmptyState
					icon={Monitor}
					title="No managed devices found"
					description="Your Intune tenant doesn't have any managed devices enrolled."
				/>
			{:else}
				<div class="panel overflow-clip p-0">
					<div
						class="border-border bg-surface/95 sticky top-12 z-10 border-b backdrop-blur-sm"
					>
						<div class="flex items-center gap-3 px-4 py-2">
							<!-- Select all checkbox -->
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									checked={allOnPageSelected}
									onchange={toggleSelectAll}
									class="accent-accent h-3.5 w-3.5 rounded"
								/>
								<span class="text-muted text-xs font-medium tracking-wide uppercase">
									{#if hasSelection}
										{selectedCount} selected
									{:else}
										{filteredDevices.length}{filtersActive || search.trim() !== ''
											? ` of ${devices.length}`
											: ''} device{filteredDevices.length !== 1 ? 's' : ''}
									{/if}
									{#if search.trim() !== '' && !hasSelection}
										matching "{search.trim()}"
									{/if}
								</span>
							</label>
						</div>
						<div
							class="border-border flex items-center gap-4 border-t px-4 py-1.5 text-[10px] font-semibold tracking-wider uppercase"
						>
							<div class="w-4 shrink-0"></div>
							<div class="w-10 shrink-0"></div>
							<div class="text-muted min-w-0 flex-1">Device</div>
							<span class="text-muted hidden w-24 text-right sm:block">OS Version</span>
							<span class="text-muted w-24 text-center">Compliance</span>
							<span class="text-muted hidden w-16 text-right md:block">Last Sync</span>
							<span class="text-muted w-20 text-center">Ownership</span>
							<div class="w-4 shrink-0"></div>
						</div>
					</div>

					{#each filteredDevices as device, i (device.id)}
						<div in:fly={{ y: 10, duration: 200, delay: Math.min(i * 30, 300) }}>
							<DeviceRow
								{device}
								selectable={true}
								selected={selectedDeviceIds.has(device.id)}
								onToggle={toggleDevice}
							/>
						</div>
					{/each}
				</div>

				{#if nextLink}
					<div class="mt-4 text-center">
						<Button variant="secondary" onclick={loadMore} loading={loadingMore}>
							{loadingMore ? 'Loading more...' : 'Load more devices'}
						</Button>
					</div>
				{/if}

				<!-- Floating bulk action toolbar -->
				{#if hasSelection}
					<div
						class="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
						transition:fly={{ y: 20, duration: 200 }}
					>
						<div
							class="border-border bg-surface flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg"
						>
							<span class="text-ink mr-2 text-sm font-medium whitespace-nowrap">
								{selectedCount} device{selectedCount !== 1 ? 's' : ''} selected
							</span>

							<div class="bg-border mx-1 h-6 w-px"></div>

							<!-- Non-destructive actions -->
							<Button
								variant="primary"
								size="sm"
								icon={RefreshCw}
								onclick={() => openBulkAction('syncDevice')}
							>
								Sync
							</Button>
							<Button
								variant="secondary"
								size="sm"
								icon={RotateCcw}
								onclick={() => openBulkAction('rebootNow')}
							>
								Restart
							</Button>
							<Button
								variant="secondary"
								size="sm"
								icon={Lock}
								onclick={() => openBulkAction('remoteLock')}
							>
								Lock
							</Button>
							<Button
								variant="ghost"
								size="sm"
								icon={Power}
								onclick={() => openBulkAction('shutDown')}
							>
								Shut Down
							</Button>
							<Button
								variant="ghost"
								size="sm"
								icon={KeyRound}
								onclick={() => openBulkAction('resetPasscode')}
							>
								Reset Passcode
							</Button>

							<div class="bg-border mx-1 h-6 w-px"></div>

							<!-- Destructive actions -->
							<Button
								variant="destructive"
								size="sm"
								icon={UserMinus}
								onclick={() => openBulkAction('retire')}
							>
								Retire
							</Button>
							<Button
								variant="destructive"
								size="sm"
								icon={Trash2}
								onclick={() => openBulkAction('wipe')}
							>
								Wipe
							</Button>

							<div class="bg-border mx-1 h-6 w-px"></div>

							<Button variant="ghost" size="sm" icon={X} onclick={clearSelection}>
								Clear
							</Button>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>

<!-- Bulk action dialog -->
<BulkActionDialog
	open={bulkActionOpen}
	action={bulkAction}
	devices={selectedDevices}
	onClose={closeBulkAction}
/>
