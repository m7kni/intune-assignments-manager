<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { ConfigurationPolicy } from '$lib/types/graph';
	import { getProfileTypeInfo } from '$lib/utils/profile-types';
	import Badge from './Badge.svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		profile: ConfigurationPolicy;
	}

	const { profile }: Props = $props();
	const typeInfo = $derived(getProfileTypeInfo(profile.platforms, profile.technologies));
	const Icon = $derived(typeInfo.icon);
</script>

<a
	href="/profiles/{profile.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
>
	<!-- Platform icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<Icon size={20} class="text-accent" />
	</div>

	<!-- Name and description -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{profile.name}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{profile.description ?? 'No description'}
		</p>
	</div>

	<!-- Platform label (hidden on mobile) -->
	<span class="text-ink-faint hidden text-xs whitespace-nowrap sm:block">
		{typeInfo.label}
	</span>

	<!-- Technology label (hidden on mobile) -->
	<span class="text-ink-faint hidden text-xs whitespace-nowrap md:block">
		{typeInfo.technology}
	</span>

	<!-- Setting count -->
	<span class="text-ink-faint text-xs whitespace-nowrap">
		{profile.settingCount} setting{profile.settingCount !== 1 ? 's' : ''}
	</span>

	<!-- Assignment status -->
	<Badge variant={profile.isAssigned ? 'required' : 'neutral'} dot>
		{profile.isAssigned ? 'Assigned' : 'Unassigned'}
	</Badge>

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
