<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface StatusSegment {
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		title: string;
		segments: StatusSegment[];
		lastUpdated?: string | null;
	}

	const { title, segments, lastUpdated = null }: Props = $props();

	const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));

	function pct(value: number): string {
		if (total === 0) return '0';
		return ((value / total) * 100).toFixed(1);
	}

	function formatTimestamp(iso: string | null): string {
		if (!iso) return '';
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

<div class="panel">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-ink text-sm font-semibold">{title}</h3>
		{#if lastUpdated}
			<span class="text-ink-faint text-xs">Last updated: {formatTimestamp(lastUpdated)}</span>
		{/if}
	</div>

	{#if total === 0}
		<p class="text-ink-faint py-4 text-center text-sm">No data</p>
	{:else}
		<div class="mb-3 flex h-2 overflow-hidden rounded-full">
			{#each segments as segment (segment.label)}
				{#if segment.value > 0}
					<div
						class="{segment.color} transition-all duration-300"
						style="width: {pct(segment.value)}%"
					></div>
				{/if}
			{/each}
		</div>

		<div class="grid grid-cols-2 gap-x-4 gap-y-2">
			{#each segments as segment (segment.label)}
				<div class="flex items-center justify-between text-sm">
					<div class="flex items-center gap-2">
						<span class="{segment.color} h-2 w-2 rounded-full"></span>
						<span class="text-ink-light">{segment.label}</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="text-ink font-medium tabular-nums">{segment.value}</span>
						<span class="text-ink-faint text-xs tabular-nums">({pct(segment.value)}%)</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
