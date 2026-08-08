<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { ManagedDevice } from '$lib/types/device';
	import {
		getDeviceTypeInfo,
		getComplianceInfo,
		getOwnershipLabel,
		getManagementAgentLabel,
		formatStorageSize,
		formatRelativeTime
	} from '$lib/utils/device-types';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		Shield,
		Lock,
		Eye,
		HardDrive,
		Mail,
		Calendar,
		RefreshCw,
		Fingerprint,
		Hash,
		Cpu
	} from 'lucide-svelte';

	interface Props {
		device: ManagedDevice;
	}

	const { device }: Props = $props();

	const typeInfo = $derived(getDeviceTypeInfo(device.operatingSystem));
	const TypeIcon = $derived(typeInfo.icon);
	const complianceInfo = $derived(getComplianceInfo(device.complianceState));
	const ownership = $derived(getOwnershipLabel(device.managedDeviceOwnerType));
	const managementAgent = $derived(getManagementAgentLabel(device.managementAgent));
	const totalStorage = $derived(formatStorageSize(device.totalStorageSpaceInBytes));
	const freeStorage = $derived(formatStorageSize(device.freeStorageSpaceInBytes));
	const lastSync = $derived(formatRelativeTime(device.lastSyncDateTime));
	const enrolledDate = $derived(
		device.enrolledDateTime
			? new Date(device.enrolledDateTime).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})
			: 'Unknown'
	);
	const storagePercent = $derived(
		device.totalStorageSpaceInBytes > 0
			? Math.round(
					((device.totalStorageSpaceInBytes - device.freeStorageSpaceInBytes) /
						device.totalStorageSpaceInBytes) *
						100
				)
			: 0
	);
</script>

<div class="panel-raised">
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left: Device info -->
		<div class="space-y-4 lg:col-span-2">
			<!-- Model subtitle -->
			{#if device.manufacturer || device.model}
				<p class="text-ink-faint text-sm">
					{[device.manufacturer, device.model].filter(Boolean).join(' ')}
				</p>
			{/if}

			<div class="grid gap-3 sm:grid-cols-2">
				<!-- OS -->
				<div class="flex items-center gap-2.5">
					<div class="bg-accent-light flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<TypeIcon size={16} class="text-accent" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">
							Operating System
						</p>
						<p class="text-ink text-sm font-medium">
							{typeInfo.label}
							{#if device.osVersion}
								<span class="text-ink-faint font-normal">{device.osVersion}</span>
							{/if}
						</p>
					</div>
				</div>

				<!-- Serial number -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Hash size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">
							Serial Number
						</p>
						<p class="text-ink text-sm font-medium font-mono">
							{device.serialNumber ?? 'N/A'}
						</p>
					</div>
				</div>

				<!-- Azure AD Device ID -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Fingerprint size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">
							Azure AD Device ID
						</p>
						<p
							class="text-ink truncate text-sm font-medium font-mono max-w-[200px]"
							title={device.azureADDeviceId ?? undefined}
						>
							{device.azureADDeviceId ?? 'N/A'}
						</p>
					</div>
				</div>

				<!-- Email -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Mail size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">
							Email Address
						</p>
						<p
							class="text-ink truncate text-sm font-medium max-w-[200px]"
							title={device.emailAddress ?? undefined}
						>
							{device.emailAddress ?? 'N/A'}
						</p>
					</div>
				</div>

				<!-- Management agent -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Cpu size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">
							Management Agent
						</p>
						<p class="text-ink text-sm font-medium">{managementAgent}</p>
					</div>
				</div>

				<!-- Enrolled date -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Calendar size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">Enrolled</p>
						<p class="text-ink text-sm font-medium">{enrolledDate}</p>
					</div>
				</div>

				<!-- Last sync -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<RefreshCw size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">Last Sync</p>
						<p class="text-ink text-sm font-medium" title={device.lastSyncDateTime ?? undefined}>
							{lastSync}
						</p>
					</div>
				</div>

				<!-- Ownership -->
				<div class="flex items-center gap-2.5">
					<div class="bg-canvas-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<Shield size={16} class="text-muted" />
					</div>
					<div>
						<p class="text-muted text-[10px] font-semibold tracking-wider uppercase">Ownership</p>
						<p class="text-ink text-sm font-medium">{ownership}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Right: Status indicators -->
		<div class="space-y-4">
			<!-- Compliance -->
			<div class="panel-inset text-center">
				<p class="text-muted mb-2 text-[10px] font-semibold tracking-wider uppercase">Compliance</p>
				<Badge variant={complianceInfo.variant} dot>
					{complianceInfo.label}
				</Badge>
			</div>

			<!-- Encrypted -->
			<div class="flex items-center justify-between rounded-lg px-3 py-2">
				<div class="flex items-center gap-2">
					<Lock size={14} class="text-muted" />
					<span class="text-ink text-sm">Encrypted</span>
				</div>
				<Badge variant={device.isEncrypted ? 'required' : 'neutral'}>
					{device.isEncrypted ? 'Yes' : 'No'}
				</Badge>
			</div>

			<!-- Supervised -->
			<div class="flex items-center justify-between rounded-lg px-3 py-2">
				<div class="flex items-center gap-2">
					<Eye size={14} class="text-muted" />
					<span class="text-ink text-sm">Supervised</span>
				</div>
				<Badge variant={device.isSupervised ? 'required' : 'neutral'}>
					{device.isSupervised ? 'Yes' : 'No'}
				</Badge>
			</div>

			<!-- Storage -->
			<div class="px-3 py-2">
				<div class="mb-1.5 flex items-center gap-2">
					<HardDrive size={14} class="text-muted" />
					<span class="text-ink text-sm">Storage</span>
				</div>
				{#if device.totalStorageSpaceInBytes > 0}
					<div class="bg-canvas-deep mb-1 h-2 overflow-hidden rounded-full">
						<div
							class="h-full rounded-full transition-all {storagePercent > 90
								? 'bg-ember'
								: storagePercent > 70
									? 'bg-warn'
									: 'bg-accent'}"
							style="width: {storagePercent}%"
						></div>
					</div>
					<p class="text-muted text-xs">
						{freeStorage} free of {totalStorage}
						<span class="text-ink-faint">({storagePercent}% used)</span>
					</p>
				{:else}
					<p class="text-muted text-xs">Unknown</p>
				{/if}
			</div>
		</div>
	</div>
</div>
