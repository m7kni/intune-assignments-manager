<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { CheckCircle, XCircle, AlertTriangle, RotateCcw, Plus } from 'lucide-svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { AssignmentResult, BulkProgress } from '$lib/types/wizard';

	interface Props {
		progress: BulkProgress | null;
		results: AssignmentResult[];
		executing: boolean;
		executionError: string | null;
		onRetry: () => void;
		onReset: () => void;
	}

	const { progress, results, executing, executionError, onRetry, onReset }: Props = $props();

	// ─── Phase Labels ───────────────────────────────────────────────
	const phaseLabels: Record<BulkProgress['phase'], string> = {
		fetching: 'Fetching current assignments...',
		merging: 'Computing changes...',
		applying: 'Applying assignments...'
	};

	const phaseLabel = $derived(progress ? phaseLabels[progress.phase] : '');
	const progressPercent = $derived(
		progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
	);

	// ─── Result Summaries ───────────────────────────────────────────
	const successCount = $derived(results.filter((r) => r.status === 'success').length);
	const errorCount = $derived(results.filter((r) => r.status === 'error').length);

	const summaryKind = $derived<'allSuccess' | 'allError' | 'mixed'>(
		errorCount === 0 ? 'allSuccess' : successCount === 0 ? 'allError' : 'mixed'
	);
</script>

{#if executing}
	<!-- ─── Execution In Progress ──────────────────────────────────── -->
	<div class="flex flex-col items-center gap-4 py-8">
		<Spinner size="lg" />

		{#if progress}
			<div class="w-full max-w-md space-y-2">
				<p class="text-ink text-center text-sm font-medium">{phaseLabel}</p>

				<!-- Progress bar -->
				<div class="bg-soft h-2 w-full rounded-full">
					<div
						class="bg-accent animate-progress-pulse h-2 rounded-full transition-all duration-300"
						style="width: {progressPercent}%"
					></div>
				</div>

				<!-- Counter -->
				<p class="text-muted text-center text-xs">
					{progress.completed} of {progress.total}
				</p>

				<!-- Current item -->
				{#if progress.currentItem}
					<p class="text-ink text-center text-sm">{progress.currentItem}</p>
				{/if}
			</div>
		{/if}
	</div>
{:else if executionError}
	<!-- ─── Execution Error ────────────────────────────────────────── -->
	<div class="space-y-4">
		<div class="panel-inset border-ember bg-ember-light border-l-2">
			<div class="flex items-start gap-3">
				<XCircle size={20} class="text-ember mt-0.5 shrink-0" />
				<div>
					<p class="text-ember text-sm font-medium">Execution failed</p>
					<p class="text-ember mt-1 text-sm">{executionError}</p>
				</div>
			</div>
		</div>

		<div class="flex justify-end">
			<Button variant="primary" icon={RotateCcw} onclick={onRetry}>Retry</Button>
		</div>
	</div>
{:else if results.length > 0}
	<!-- ─── Results ────────────────────────────────────────────────── -->
	<div class="space-y-4">
		<!-- Summary banner -->
		{#if summaryKind === 'allSuccess'}
			<div class="panel-inset border-success bg-success-light border-l-2">
				<div class="flex items-center gap-3">
					<CheckCircle size={20} class="text-success shrink-0" />
					<p class="text-ink text-sm font-medium">
						All {results.length} assignment{results.length !== 1 ? 's' : ''} applied successfully
					</p>
				</div>
			</div>
		{:else if summaryKind === 'allError'}
			<div class="panel-inset border-ember bg-ember-light border-l-2">
				<div class="flex items-center gap-3">
					<XCircle size={20} class="text-ember shrink-0" />
					<p class="text-ink text-sm font-medium">All assignments failed</p>
				</div>
			</div>
		{:else}
			<div class="panel-inset border-warn bg-warn-light border-l-2">
				<div class="flex items-center gap-3">
					<AlertTriangle size={20} class="text-warn shrink-0" />
					<p class="text-ink text-sm font-medium">
						{successCount} succeeded, {errorCount} failed
					</p>
				</div>
			</div>
		{/if}

		<!-- Per-item result list -->
		<div class="border-border rounded-lg border">
			{#each results as result (result.itemId)}
				<div class="border-border flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
					{#if result.status === 'success'}
						<CheckCircle size={18} class="text-success shrink-0" />
					{:else}
						<XCircle size={18} class="text-ember shrink-0" />
					{/if}

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="text-ink truncate text-sm font-medium">
								{result.itemName}
							</p>
							<span class="bg-canvas-deep text-muted shrink-0 rounded px-1.5 py-0.5 text-xs">
								{result.itemKind === 'app' ? 'App' : 'Profile'}
							</span>
						</div>
						{#if result.status === 'error' && result.error}
							<p class="text-ember mt-0.5 text-xs">{result.error}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Action buttons -->
		<div class="flex items-center justify-end gap-3">
			{#if errorCount > 0}
				<Button variant="primary" icon={RotateCcw} onclick={onRetry}>Retry Failed</Button>
			{/if}
			<Button variant="secondary" icon={Plus} onclick={onReset}>Start New Assignment</Button>
		</div>
	</div>
{/if}
