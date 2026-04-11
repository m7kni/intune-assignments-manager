<script lang="ts">
	import type { DeviceHealthScript } from '$lib/types/remediation';
	import Badge from './Badge.svelte';
	import { ChevronRight, Globe, User, Monitor } from 'lucide-svelte';

	interface Props {
		script: DeviceHealthScript;
	}

	const { script }: Props = $props();
	const RunAsIcon = $derived(script.runAsAccount === 'system' ? Monitor : User);
</script>

<a
	href="/remediations/{script.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
>
	<!-- Icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<RunAsIcon size={20} class="text-accent" />
	</div>

	<!-- Name and publisher -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{script.displayName}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{script.publisher ?? 'No publisher'}
		</p>
	</div>

	<!-- Run-as badge (hidden on mobile) -->
	<span class="hidden sm:block">
		<Badge variant="outline">
			Run as {script.runAsAccount}
		</Badge>
	</span>

	<!-- Global script indicator -->
	{#if script.isGlobalScript}
		<span class="text-ink-faint hidden items-center gap-1 text-xs md:flex">
			<Globe size={14} />
			Global
		</span>
	{/if}

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
