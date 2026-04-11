<script lang="ts">
	import type { ManagedDevice } from '$lib/types/device';
	import {
		getDeviceTypeInfo,
		getComplianceInfo,
		getOwnershipLabel,
		formatRelativeTime
	} from '$lib/utils/device-types';
	import Badge from './Badge.svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		device: ManagedDevice;
		selectable?: boolean;
		selected?: boolean;
		onToggle?: (id: string) => void;
	}

	const { device, selectable = false, selected = false, onToggle }: Props = $props();
	const typeInfo = $derived(getDeviceTypeInfo(device.operatingSystem));
	const Icon = $derived(typeInfo.icon);
	const complianceInfo = $derived(getComplianceInfo(device.complianceState));
	const lastSync = $derived(formatRelativeTime(device.lastSyncDateTime));
	const ownership = $derived(getOwnershipLabel(device.managedDeviceOwnerType));

	function handleCheckboxClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onToggle?.(device.id);
	}
</script>

<a
	href="/devices/{device.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2 {selected
		? 'bg-accent-subtle/50'
		: ''}"
>
	{#if selectable}
		<!-- Checkbox -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex shrink-0 items-center" onclick={handleCheckboxClick}>
			<input
				type="checkbox"
				checked={selected}
				class="accent-accent h-4 w-4 cursor-pointer rounded"
				tabindex={-1}
			/>
		</div>
	{/if}

	<!-- Platform icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<Icon size={20} class="text-accent" />
	</div>

	<!-- Name and user -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{device.deviceName}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{device.userDisplayName ?? 'No user'}
		</p>
	</div>

	<!-- OS version (hidden on mobile) -->
	<span class="text-ink-faint hidden w-24 text-right text-xs whitespace-nowrap sm:block">
		{device.osVersion ?? typeInfo.label}
	</span>

	<!-- Compliance badge -->
	<div class="flex w-24 justify-center">
		<Badge variant={complianceInfo.variant} dot>
			{complianceInfo.label}
		</Badge>
	</div>

	<!-- Last sync (hidden on mobile) -->
	<span class="text-ink-faint hidden w-16 text-right text-xs whitespace-nowrap md:block">
		{lastSync}
	</span>

	<!-- Ownership badge -->
	<div class="flex w-20 justify-center">
		<Badge variant="outline">
			{ownership}
		</Badge>
	</div>

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
