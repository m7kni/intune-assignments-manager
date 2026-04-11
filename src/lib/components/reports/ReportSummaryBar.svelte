<script lang="ts">
	interface StatItem {
		label: string;
		value: string | number;
		color?: 'default' | 'accent' | 'success' | 'warn' | 'ember';
	}

	interface Props {
		stats: StatItem[];
	}

	const { stats }: Props = $props();

	const colorClasses: Record<string, string> = {
		default: 'text-ink',
		accent: 'text-accent',
		success: 'text-success',
		warn: 'text-warn',
		ember: 'text-ember'
	};
</script>

<div class="panel flex flex-wrap items-center gap-6 px-5 py-3">
	{#each stats as stat, i (i)}
		{#if i > 0}
			<div class="bg-border h-8 w-px"></div>
		{/if}
		<div class="flex flex-col">
			<span class="text-ink-faint text-[10px] font-medium tracking-wider uppercase">
				{stat.label}
			</span>
			<span class="text-lg font-bold {colorClasses[stat.color ?? 'default']}">
				{stat.value}
			</span>
		</div>
	{/each}
</div>
