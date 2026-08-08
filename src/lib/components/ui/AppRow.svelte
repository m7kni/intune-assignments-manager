<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { MobileApp } from '$lib/types/graph';
	import { getAppTypeInfo } from '$lib/utils/app-types';
	import Badge from './Badge.svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		app: MobileApp;
	}

	const { app }: Props = $props();
	const typeInfo = $derived(getAppTypeInfo(app['@odata.type']));
	const Icon = $derived(typeInfo.icon);
</script>

<a
	href="/apps/{app.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
>
	<!-- Platform icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<Icon size={20} class="text-accent" />
	</div>

	<!-- Name and publisher -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{app.displayName}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{app.publisher ?? 'Unknown publisher'}
		</p>
	</div>

	<!-- Type label (hidden on mobile) -->
	<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
		{typeInfo.label}
	</span>

	<!-- Assignment status -->
	<Badge variant={app.isAssigned ? 'required' : 'neutral'} dot>
		{app.isAssigned ? 'Assigned' : 'Unassigned'}
	</Badge>

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
