<script lang="ts">
	import type { AssignmentDiff } from '$lib/types/compare';

	interface Props {
		diffs: AssignmentDiff[];
	}

	const { diffs }: Props = $props();

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

	function formatAssignment(assignment: Record<string, unknown> | null): string {
		if (!assignment) return '\u2014';

		const parts: string[] = [];

		if (assignment.intent && typeof assignment.intent === 'string') {
			parts.push(`Intent: ${assignment.intent}`);
		}

		const target = assignment.target as Record<string, unknown> | undefined;
		if (target) {
			const filterType = target.deviceAndAppManagementAssignmentFilterType;
			if (filterType && filterType !== 'none') {
				parts.push(`Filter: ${String(filterType)}`);
			}
		}

		return parts.length > 0 ? parts.join(', ') : 'Assigned';
	}
</script>

{#if diffs.length === 0}
	<p class="text-muted py-8 text-center text-sm">No assignment differences found.</p>
{:else}
	<div class="overflow-x-auto">
		<table class="w-full text-left">
			<thead>
				<tr class="border-border border-b">
					<th class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
						>Target</th
					>
					<th class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
						>Left Policy</th
					>
					<th class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
						>Right Policy</th
					>
				</tr>
			</thead>
			<tbody>
				{#each diffs as diff, i (`${diff.targetDisplayName}-${i}`)}
					{@const style = statusStyles[diff.status]}
					<tr class="{style.row} border-border border-b transition-colors last:border-b-0">
						<td class="px-4 py-3 text-sm">
							<div class="flex items-center gap-2">
								<span
									class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {style.label}"
								>
									{style.labelText}
								</span>
								<span class="text-ink font-medium">{diff.targetDisplayName}</span>
							</div>
						</td>
						<td class="text-ink-light px-4 py-3 text-sm">
							{formatAssignment(diff.leftAssignment)}
						</td>
						<td class="text-ink-light px-4 py-3 text-sm">
							{formatAssignment(diff.rightAssignment)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
