<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		deviceName: string;
		userName: string;
		statusVariant: 'required' | 'available' | 'uninstall' | 'neutral';
		statusLabel: string;
		lastReported: string | null;
		errorDetail?: string | null;
	}

	const {
		deviceName,
		userName,
		statusVariant,
		statusLabel,
		lastReported,
		errorDetail = null
	}: Props = $props();

	let expanded = $state(false);

	const hasError = $derived(!!errorDetail);

	function formatTimeAgo(iso: string | null): string {
		if (!iso) return '\u2014';
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
</script>

<div>
	<button
		type="button"
		class="hover:bg-canvas-deep border-border grid w-full grid-cols-12 items-center gap-2 border-b px-4 py-3 text-left transition-colors"
		onclick={() => {
			if (hasError) expanded = !expanded;
		}}
		class:cursor-pointer={hasError}
		class:cursor-default={!hasError}
	>
		<div class="col-span-4 min-w-0">
			<p class="text-ink truncate text-sm font-medium">{deviceName}</p>
			<p class="text-ink-faint truncate text-xs">{userName}</p>
		</div>
		<div class="col-span-3">
			<Badge variant={statusVariant}>{statusLabel}</Badge>
		</div>
		<div class="col-span-3">
			<span class="text-ink-faint text-sm">{formatTimeAgo(lastReported)}</span>
		</div>
		<div class="col-span-2 min-w-0">
			{#if errorDetail}
				<p class="text-ember truncate text-xs">{errorDetail}</p>
			{/if}
		</div>
	</button>

	{#if hasError && expanded}
		<div class="bg-ember-light border-border animate-slide-down border-b px-4 py-3">
			<p class="text-ember text-xs font-medium">Error Detail</p>
			<p class="text-ink-light mt-1 text-xs whitespace-pre-wrap">{errorDetail}</p>
		</div>
	{/if}
</div>
