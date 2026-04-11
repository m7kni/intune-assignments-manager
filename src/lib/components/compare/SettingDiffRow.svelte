<script lang="ts">
	import type { SettingDiff } from '$lib/types/compare';

	interface Props {
		diff: SettingDiff;
	}

	const { diff }: Props = $props();

	const statusStyles: Record<string, { row: string; label: string; labelText: string }> = {
		identical: {
			row: 'bg-surface',
			label: 'bg-canvas-deep text-muted',
			labelText: 'Identical'
		},
		changed: {
			row: 'bg-warn-light/30',
			label: 'bg-warn-light text-warn',
			labelText: 'Changed'
		},
		added: {
			row: 'bg-success-light/30',
			label: 'bg-success-light text-success',
			labelText: 'Added'
		},
		removed: {
			row: 'bg-ember-light/30',
			label: 'bg-ember-light text-ember',
			labelText: 'Removed'
		}
	};

	const style = $derived(statusStyles[diff.status]);

	function formatValue(value: unknown): string {
		if (value === null || value === undefined) return '\u2014';
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value, null, 2);
			} catch {
				return String(value);
			}
		}
		return String(value);
	}
</script>

<tr class="{style.row} border-border border-b transition-colors last:border-b-0">
	<td class="px-4 py-3 text-sm">
		<div class="flex items-center gap-2">
			<span
				class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {style.label}"
			>
				{style.labelText}
			</span>
			<span class="text-ink font-medium">{diff.settingName}</span>
		</div>
		{#if diff.settingDefinitionId}
			<p class="text-muted mt-0.5 truncate font-mono text-xs">{diff.settingDefinitionId}</p>
		{/if}
	</td>
	<td class="px-4 py-3 text-sm">
		{#if diff.leftValue !== null && diff.leftValue !== undefined}
			<pre class="text-ink-light max-w-xs overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{formatValue(diff.leftValue)}</pre>
		{:else}
			<span class="text-muted italic">\u2014</span>
		{/if}
	</td>
	<td class="px-4 py-3 text-sm">
		{#if diff.rightValue !== null && diff.rightValue !== undefined}
			<pre class="text-ink-light max-w-xs overflow-auto whitespace-pre-wrap break-all font-mono text-xs">{formatValue(diff.rightValue)}</pre>
		{:else}
			<span class="text-muted italic">\u2014</span>
		{/if}
	</td>
</tr>
