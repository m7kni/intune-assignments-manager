<script lang="ts">
	import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';

	interface Column {
		key: string;
		label: string;
		sortable?: boolean;
		align?: 'left' | 'center' | 'right';
	}

	interface Props {
		columns: Column[];
		rows: Record<string, unknown>[];
		sortKey: string;
		sortDir: 'asc' | 'desc';
		onsort: (key: string) => void;
	}

	const { columns, rows, sortKey, sortDir, onsort }: Props = $props();

	function formatCell(value: unknown): string {
		if (value === null || value === undefined) return '--';
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (typeof value === 'number') return value.toLocaleString();
		return String(value);
	}

	function getCellColor(key: string, value: unknown): string {
		if (typeof value !== 'number') return '';
		if (key.toLowerCase().includes('failed')) return value > 0 ? 'text-ember font-medium' : '';
		if (key.toLowerCase().includes('installed') && !key.toLowerCase().includes('not'))
			return value > 0 ? 'text-success' : '';
		if (key.toLowerCase().includes('pending')) return value > 0 ? 'text-warn' : '';
		return '';
	}
</script>

<div class="panel overflow-clip p-0">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-border border-b">
					{#each columns as col (col.key)}
						<th
							class="text-ink-faint px-4 py-2.5 text-xs font-medium tracking-wider uppercase
								{col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
								{col.sortable ? 'cursor-pointer select-none hover:text-ink transition-colors' : ''}"
							onclick={() => col.sortable && onsort(col.key)}
						>
							<span class="inline-flex items-center gap-1">
								{col.label}
								{#if col.sortable}
									{#if sortKey === col.key}
										{#if sortDir === 'asc'}
											<ArrowUp size={12} />
										{:else}
											<ArrowDown size={12} />
										{/if}
									{:else}
										<ArrowUpDown size={12} class="opacity-30" />
									{/if}
								{/if}
							</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (`${String(row['id'] ?? row['applicationId'] ?? i)}-${i}`)}
					<tr class="border-border hover:bg-canvas-deep border-b transition-colors last:border-b-0">
						{#each columns as col (col.key)}
							<td
								class="px-4 py-2.5
									{col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
									{getCellColor(col.key, row[col.key])}"
							>
								{formatCell(row[col.key])}
							</td>
						{/each}
					</tr>
				{/each}
				{#if rows.length === 0}
					<tr>
						<td colspan={columns.length} class="text-muted px-4 py-8 text-center">
							No data to display
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
