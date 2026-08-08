<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Props {
		settingName: string;
		compliantCount: number;
		errorCount: number;
		nonCompliantCount: number;
		notApplicableCount: number;
		conflictCount: number;
		remediatedCount: number;
	}

	const {
		settingName,
		compliantCount,
		errorCount,
		nonCompliantCount,
		notApplicableCount,
		conflictCount,
		remediatedCount
	}: Props = $props();

	interface Segment {
		label: string;
		count: number;
		color: string;
	}

	const allSegments = $derived<Segment[]>([
		{ label: 'Compliant', count: compliantCount, color: 'bg-success' },
		{ label: 'Error', count: errorCount, color: 'bg-ember' },
		{ label: 'Non-compliant', count: nonCompliantCount, color: 'bg-ember' },
		{ label: 'N/A', count: notApplicableCount, color: 'bg-muted' },
		{ label: 'Conflict', count: conflictCount, color: 'bg-warn' },
		{ label: 'Remediated', count: remediatedCount, color: 'bg-accent' }
	]);

	const activeSegments = $derived(allSegments.filter((s) => s.count > 0));
	const total = $derived(allSegments.reduce((sum, s) => sum + s.count, 0));

	function pct(count: number): string {
		if (total === 0) return '0';
		return ((count / total) * 100).toFixed(1);
	}
</script>

<div class="border-border grid grid-cols-12 items-center gap-2 border-b px-4 py-3">
	<div class="col-span-5 min-w-0">
		<p class="text-ink truncate text-sm" title={settingName}>{settingName}</p>
	</div>
	<div class="col-span-7">
		{#if total === 0}
			<span class="text-ink-faint text-xs">No data</span>
		{:else}
			<div class="mb-1.5 flex h-1.5 overflow-hidden rounded-full">
				{#each activeSegments as segment (segment.label)}
					<div
						class="{segment.color} transition-all duration-300"
						style="width: {pct(segment.count)}%"
					></div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-x-3 gap-y-0.5">
				{#each activeSegments as segment (segment.label)}
					<div class="flex items-center gap-1">
						<span class="{segment.color} h-1.5 w-1.5 rounded-full"></span>
						<span class="text-ink-faint text-xs tabular-nums">
							{segment.count}
							{segment.label}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
