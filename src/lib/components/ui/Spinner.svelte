<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Props {
		label?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	const { label, size = 'md' }: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'h-4 w-4 border-2',
		md: 'h-6 w-6 border-2',
		lg: 'h-10 w-10 border-3'
	};
</script>

<div class="flex flex-col items-center gap-2" role="status" aria-label={label ?? 'Loading'}>
	<div
		class="border-accent animate-spin rounded-full border-t-transparent {sizeClasses[size]}"
	></div>
	{#if label}
		<span class="text-muted text-sm">{label}</span>
	{/if}
</div>
