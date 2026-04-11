<script lang="ts">
	import { Equal, ArrowLeftRight, Plus, Minus } from 'lucide-svelte';
	import type { ComparisonSummary, ComparisonStatus } from '$lib/types/compare';

	interface Props {
		summary: ComparisonSummary;
		activeFilter: ComparisonStatus | 'all';
		onfilter: (filter: ComparisonStatus | 'all') => void;
	}

	const { summary, activeFilter, onfilter }: Props = $props();

	const total = $derived(
		summary.identical + summary.changed + summary.added + summary.removed
	);

	const filters: { id: ComparisonStatus | 'all'; label: string; count: number; icon: typeof Equal; colorClass: string; activeClass: string }[] = $derived([
		{
			id: 'all' as const,
			label: 'All',
			count: total,
			icon: Equal,
			colorClass: 'text-ink-faint border-border hover:border-border-hover',
			activeClass: 'border-accent bg-accent-light text-accent'
		},
		{
			id: 'changed' as const,
			label: 'Changed',
			count: summary.changed,
			icon: ArrowLeftRight,
			colorClass: 'text-warn border-border hover:border-border-hover',
			activeClass: 'border-warn bg-warn-light text-warn'
		},
		{
			id: 'added' as const,
			label: 'Added',
			count: summary.added,
			icon: Plus,
			colorClass: 'text-success border-border hover:border-border-hover',
			activeClass: 'border-success bg-success-light text-success'
		},
		{
			id: 'removed' as const,
			label: 'Removed',
			count: summary.removed,
			icon: Minus,
			colorClass: 'text-ember border-border hover:border-border-hover',
			activeClass: 'border-ember bg-ember-light text-ember'
		},
		{
			id: 'identical' as const,
			label: 'Identical',
			count: summary.identical,
			icon: Equal,
			colorClass: 'text-muted border-border hover:border-border-hover',
			activeClass: 'border-muted bg-canvas-deep text-ink-faint'
		}
	]);
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each filters as filter (filter.id)}
		{@const Icon = filter.icon}
		<button
			type="button"
			onclick={() => onfilter(filter.id)}
			class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors {activeFilter ===
			filter.id
				? filter.activeClass
				: filter.colorClass}"
		>
			<Icon size={12} />
			{filter.label}
			<span
				class="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold {activeFilter ===
				filter.id
					? 'bg-white/20'
					: 'bg-canvas-deep'}"
			>
				{filter.count}
			</span>
		</button>
	{/each}
</div>
