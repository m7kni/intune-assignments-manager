<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { DeviceCompliancePolicy } from '$lib/types/compliance';
	import { getCompliancePlatformInfo } from '$lib/utils/compliance-types';
	import Badge from './Badge.svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		policy: DeviceCompliancePolicy;
	}

	const { policy }: Props = $props();
	const platformInfo = $derived(getCompliancePlatformInfo(policy['@odata.type']));
	const Icon = $derived(platformInfo.icon);
</script>

<a
	href="/compliance/{policy.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
>
	<!-- Platform icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<Icon size={20} class="text-accent" />
	</div>

	<!-- Name and description -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{policy.displayName}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{policy.description ?? 'No description'}
		</p>
	</div>

	<!-- Platform label (hidden on mobile) -->
	<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
		{platformInfo.label}
	</span>

	<!-- Version -->
	<span class="text-ink-faint hidden text-xs whitespace-nowrap md:block">
		v{policy.version}
	</span>

	<!-- Assignment status -->
	<Badge variant={policy.isAssigned ? 'required' : 'neutral'} dot>
		{policy.isAssigned ? 'Assigned' : 'Unassigned'}
	</Badge>

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
