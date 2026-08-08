<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Plus, Minus, ArrowRight, Equal, ChevronDown, ChevronUp } from 'lucide-svelte';
	import type { AssignmentDiffResult, DiffEntry, ItemDiff } from '$lib/types/diff';

	interface Props {
		diff: AssignmentDiffResult;
	}

	const { diff }: Props = $props();

	let collapsedItems = new SvelteSet<string>();

	function toggleItem(itemId: string): void {
		if (collapsedItems.has(itemId)) {
			collapsedItems.delete(itemId);
		} else {
			collapsedItems.add(itemId);
		}
	}

	function getIntentLabel(intent: string | null): string {
		switch (intent) {
			case 'required':
				return 'Required';
			case 'available':
				return 'Available';
			case 'uninstall':
				return 'Uninstall';
			case 'availableWithoutEnrollment':
				return 'Available (No Enrollment)';
			default:
				return 'Applicable';
		}
	}

	function getIntentVariant(
		intent: string | null
	): 'required' | 'available' | 'uninstall' | 'neutral' {
		switch (intent) {
			case 'required':
				return 'required';
			case 'available':
			case 'availableWithoutEnrollment':
				return 'available';
			case 'uninstall':
				return 'uninstall';
			default:
				return 'neutral';
		}
	}

	function hasChanges(item: ItemDiff): boolean {
		return item.entries.some((e) => e.status !== 'unchanged');
	}

	function unchangedCount(item: ItemDiff): number {
		return item.entries.filter((e) => e.status === 'unchanged').length;
	}

	function changedEntries(item: ItemDiff): DiffEntry[] {
		return item.entries.filter((e) => e.status !== 'unchanged');
	}

	function unchangedEntries(item: ItemDiff): DiffEntry[] {
		return item.entries.filter((e) => e.status === 'unchanged');
	}

	const statusBorder: Record<string, string> = {
		added: 'border-l-success bg-success-light/50',
		removed: 'border-l-ember bg-ember-light/50',
		changed: 'border-l-warn bg-warn-light/50',
		unchanged: 'border-l-soft bg-canvas'
	};
</script>

<!-- Summary bar -->
<div class="mb-4 flex flex-wrap gap-4 text-sm">
	{#if diff.summary.added > 0}
		<span class="flex items-center gap-1.5">
			<span class="bg-success inline-block h-2 w-2 rounded-full"></span>
			<span class="text-ink">+{diff.summary.added} added</span>
		</span>
	{/if}
	{#if diff.summary.changed > 0}
		<span class="flex items-center gap-1.5">
			<span class="bg-warn inline-block h-2 w-2 rounded-full"></span>
			<span class="text-ink">~{diff.summary.changed} changed</span>
		</span>
	{/if}
	{#if diff.summary.removed > 0}
		<span class="flex items-center gap-1.5">
			<span class="bg-ember inline-block h-2 w-2 rounded-full"></span>
			<span class="text-ink">-{diff.summary.removed} removed</span>
		</span>
	{/if}
	{#if diff.summary.unchanged > 0}
		<span class="flex items-center gap-1.5">
			<span class="bg-muted inline-block h-2 w-2 rounded-full"></span>
			<span class="text-ink">={diff.summary.unchanged} unchanged</span>
		</span>
	{/if}
</div>

<!-- Per-item sections -->
<div class="space-y-4">
	{#each diff.items as item (item.itemId)}
		<div class="border-border overflow-hidden rounded-lg border">
			<!-- Item header -->
			<div class="border-border bg-canvas-deep flex items-center gap-2 border-b px-4 py-2.5">
				<p class="text-ink text-sm font-medium">{item.itemName}</p>
				<Badge variant="neutral">{item.itemType === 'app' ? 'App' : 'Profile'}</Badge>
			</div>

			<!-- Changed entries (always visible) -->
			{#each changedEntries(item) as entry (entry.targetKey)}
				<div
					class="border-border flex items-center gap-3 border-b border-l-2 px-4 py-2.5 last:border-b-0 {statusBorder[
						entry.status
					]}"
				>
					<div class="shrink-0">
						{#if entry.status === 'added'}
							<Plus size={14} class="text-success" />
						{:else if entry.status === 'removed'}
							<Minus size={14} class="text-ember" />
						{:else if entry.status === 'changed'}
							<ArrowRight size={14} class="text-warn" />
						{/if}
					</div>

					<div class="min-w-0 flex-1">
						<p class="text-ink truncate text-sm">
							{entry.targetDisplayName}
							{#if entry.isExclusion}
								<span class="text-ember text-xs">(Exclusion)</span>
							{/if}
						</p>

						{#if entry.status === 'added'}
							<div class="mt-0.5 flex items-center gap-2">
								<Badge variant={getIntentVariant(entry.newIntent)}>
									{getIntentLabel(entry.newIntent)}
								</Badge>
								{#if entry.newFilterName}
									<span class="text-muted text-xs"
										>{entry.newFilterName} ({entry.newFilterMode})</span
									>
								{/if}
							</div>
						{:else if entry.status === 'changed'}
							<div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
								<span class="text-muted line-through">{getIntentLabel(entry.currentIntent)}</span>
								<ArrowRight size={10} class="text-muted" />
								<Badge variant={getIntentVariant(entry.newIntent)}>
									{getIntentLabel(entry.newIntent)}
								</Badge>
								{#if entry.currentFilterName !== entry.newFilterName || entry.currentFilterMode !== entry.newFilterMode}
									<span class="text-muted ml-1">
										{#if entry.currentFilterName}
											<span class="line-through">{entry.currentFilterName}</span> &rarr;
										{/if}
										{entry.newFilterName ?? 'No filter'}
									</span>
								{/if}
							</div>
						{:else if entry.status === 'removed'}
							<div class="mt-0.5 flex items-center gap-2">
								<span class="text-muted text-xs line-through"
									>{getIntentLabel(entry.currentIntent)}</span
								>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			<!-- Unchanged entries -->
			{#if hasChanges(item) && unchangedCount(item) > 0}
				<button
					onclick={() => toggleItem(item.itemId)}
					class="border-border bg-canvas text-muted hover:bg-canvas-deep flex w-full items-center gap-2 border-b px-4 py-2 text-xs last:border-b-0"
				>
					{#if collapsedItems.has(item.itemId)}
						<ChevronUp size={12} />
					{:else}
						<ChevronDown size={12} />
					{/if}
					{unchangedCount(item)} unchanged assignment{unchangedCount(item) !== 1 ? 's' : ''}
				</button>
				{#if collapsedItems.has(item.itemId)}
					{#each unchangedEntries(item) as entry (entry.targetKey)}
						<div
							class="border-border flex items-center gap-3 border-b border-l-2 px-4 py-2.5 last:border-b-0 {statusBorder[
								'unchanged'
							]}"
						>
							<div class="shrink-0">
								<Equal size={14} class="text-muted" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-muted truncate text-sm">
									{entry.targetDisplayName}
									{#if entry.isExclusion}
										<span class="text-xs">(Exclusion)</span>
									{/if}
								</p>
								<div class="mt-0.5 flex items-center gap-2">
									<Badge variant={getIntentVariant(entry.currentIntent)}>
										{getIntentLabel(entry.currentIntent)}
									</Badge>
									{#if entry.currentFilterName}
										<span class="text-muted text-xs"
											>{entry.currentFilterName} ({entry.currentFilterMode})</span
										>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			{:else if !hasChanges(item)}
				<!-- No changes at all — show all as unchanged -->
				{#each item.entries as entry (entry.targetKey)}
					<div
						class="border-border flex items-center gap-3 border-b border-l-2 px-4 py-2.5 last:border-b-0 {statusBorder[
							'unchanged'
						]}"
					>
						<div class="shrink-0">
							<Equal size={14} class="text-muted" />
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-muted truncate text-sm">
								{entry.targetDisplayName}
								{#if entry.isExclusion}
									<span class="text-xs">(Exclusion)</span>
								{/if}
							</p>
							<div class="mt-0.5 flex items-center gap-2">
								<Badge variant={getIntentVariant(entry.currentIntent)}>
									{getIntentLabel(entry.currentIntent)}
								</Badge>
								{#if entry.currentFilterName}
									<span class="text-muted text-xs"
										>{entry.currentFilterName} ({entry.currentFilterMode})</span
									>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/each}
</div>
