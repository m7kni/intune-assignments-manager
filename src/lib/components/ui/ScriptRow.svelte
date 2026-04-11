<script lang="ts">
	import type { DeviceManagementScript } from '$lib/types/scripts';
	import Badge from './Badge.svelte';
	import { ChevronRight, FileCode } from 'lucide-svelte';

	interface Props {
		script: DeviceManagementScript;
	}

	const { script }: Props = $props();
</script>

<a
	href="/scripts/{script.id}"
	class="group border-border hover:bg-accent-subtle hover:border-l-accent flex items-center gap-4 border-b px-4 py-3 transition-all hover:border-l-2"
>
	<!-- Script icon -->
	<div class="bg-accent-light flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
		<FileCode size={20} class="text-accent" />
	</div>

	<!-- Name and file name -->
	<div class="min-w-0 flex-1">
		<p class="text-ink group-hover:text-accent truncate text-sm font-medium transition-colors">
			{script.displayName}
		</p>
		<p class="text-ink-faint truncate text-xs">
			{script.fileName || 'No file name'}
		</p>
	</div>

	<!-- Run as badge -->
	<Badge variant={script.runAsAccount === 'system' ? 'info' : 'outline'}>
		{script.runAsAccount === 'system' ? 'System' : 'User'}
	</Badge>

	<!-- 32-bit badge -->
	{#if script.runAs32Bit}
		<Badge variant="outline">32-bit</Badge>
	{/if}

	<!-- Chevron -->
	<ChevronRight
		size={16}
		class="text-muted shrink-0 transition-transform group-hover:translate-x-0.5"
	/>
</a>
