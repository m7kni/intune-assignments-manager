<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { parseCsv } from '$lib/utils/csv';
	import {
		parseAssignmentRows,
		validateImportRows,
		type ValidatedImportRow,
		type ImportRowError
	} from '$lib/utils/csv-assignments';
	import { getGraphClient } from '$lib/stores/graph';

	interface Props {
		open: boolean;
		onClose: () => void;
		onImport: (rows: ValidatedImportRow[]) => void;
	}

	const { open, onClose, onImport }: Props = $props();

	type DialogState = 'idle' | 'parsing' | 'validating' | 'preview' | 'error';

	let dialogEl: HTMLDialogElement;
	let dialogState: DialogState = $state('idle');
	let validRows: ValidatedImportRow[] = $state([]);
	let errorRows: ImportRowError[] = $state([]);
	let fatalError: string | null = $state(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			resetState();
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function resetState() {
		dialogState = 'idle';
		validRows = [];
		errorRows = [];
		fatalError = null;
	}

	function handleClose() {
		onClose();
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		dialogState = 'parsing';

		const reader = new FileReader();
		reader.onload = async (e) => {
			try {
				const text = e.target?.result as string;
				if (!text || text.trim().length === 0) {
					fatalError = 'The selected file is empty.';
					dialogState = 'error';
					return;
				}

				const parsed = parseCsv(text);

				if (parsed.headers.length === 0) {
					fatalError = 'No headers found in CSV file.';
					dialogState = 'error';
					return;
				}

				const { rows, errors: parseErrors } = parseAssignmentRows(parsed);

				if (parseErrors.some((e) => e.rowIndex === 0)) {
					fatalError = parseErrors
						.filter((e) => e.rowIndex === 0)
						.map((e) => e.message)
						.join('; ');
					dialogState = 'error';
					return;
				}

				if (rows.length === 0 && parseErrors.length > 0) {
					errorRows = parseErrors;
					validRows = [];
					dialogState = 'preview';
					return;
				}

				if (rows.length === 0) {
					fatalError = 'No data rows found in CSV file.';
					dialogState = 'error';
					return;
				}

				dialogState = 'validating';
				const client = getGraphClient();
				const result = await validateImportRows(client, rows);

				validRows = result.valid;
				errorRows = [...parseErrors, ...result.errors];
				dialogState = 'preview';
			} catch (err) {
				fatalError = err instanceof Error ? err.message : 'Failed to process CSV file.';
				dialogState = 'error';
			}
		};
		reader.onerror = () => {
			fatalError = 'Failed to read the file.';
			dialogState = 'error';
		};
		reader.readAsText(file);
	}

	function handleImport() {
		if (validRows.length === 0) return;
		onImport(validRows);
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleClose}
	class="border-border bg-surface w-full max-w-2xl rounded-xl border p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
	<div class="border-border border-b px-6 py-4">
		<h2 class="text-ink flex items-center gap-2 text-lg font-semibold">
			<Upload size={20} />
			Import CSV
		</h2>
		<p class="text-muted mt-1 text-sm">Import assignments from a previously exported CSV file.</p>
	</div>

	<div class="p-6">
		{#if dialogState === 'idle'}
			<label
				class="border-border hover:border-accent hover:bg-canvas flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors"
			>
				<FileText size={32} class="text-muted" />
				<span class="text-ink text-sm font-medium">Choose a CSV file</span>
				<span class="text-muted text-xs">or drag and drop</span>
				<input type="file" accept=".csv" class="hidden" onchange={handleFileChange} />
			</label>
		{:else if dialogState === 'parsing'}
			<div class="flex flex-col items-center gap-3 py-10">
				<Spinner label="Parsing CSV..." />
			</div>
		{:else if dialogState === 'validating'}
			<div class="flex flex-col items-center gap-3 py-10">
				<Spinner label="Validating assignments..." />
				<p class="text-muted text-xs">Resolving items and groups against Microsoft Graph</p>
			</div>
		{:else if dialogState === 'error'}
			<div class="bg-ember-light flex flex-col items-center gap-3 rounded-lg px-6 py-8">
				<AlertTriangle size={32} class="text-ember" />
				<p class="text-ember text-sm font-medium">Import Error</p>
				<p class="text-muted text-center text-sm">{fatalError}</p>
			</div>
		{:else if dialogState === 'preview'}
			<div class="space-y-4">
				<div class="flex items-center gap-3 text-sm">
					<span class="text-success inline-flex items-center gap-1.5">
						<CheckCircle size={16} />
						{validRows.length} valid row{validRows.length !== 1 ? 's' : ''}
					</span>
					{#if errorRows.length > 0}
						<span class="text-ember inline-flex items-center gap-1.5">
							<XCircle size={16} />
							{errorRows.length} error{errorRows.length !== 1 ? 's' : ''}
						</span>
					{/if}
				</div>

				<div class="border-border max-h-72 overflow-auto rounded-lg border">
					<table class="w-full text-left text-xs">
						<thead class="bg-canvas sticky top-0">
							<tr class="border-border border-b">
								<th class="text-muted px-3 py-2 font-medium"></th>
								<th class="text-muted px-3 py-2 font-medium">Type</th>
								<th class="text-muted px-3 py-2 font-medium">Item</th>
								<th class="text-muted px-3 py-2 font-medium">Target</th>
								<th class="text-muted px-3 py-2 font-medium">Intent</th>
							</tr>
						</thead>
						<tbody>
							{#each validRows as row, i (i)}
								<tr class="border-border bg-success-light/30 border-b">
									<td class="text-success px-3 py-2"><CheckCircle size={14} /></td>
									<td class="text-ink px-3 py-2">{row.itemType}</td>
									<td class="text-ink px-3 py-2">{row.itemName}</td>
									<td class="text-ink px-3 py-2">
										{#if row.targetType === 'allDevices'}
											All Devices
										{:else if row.targetType === 'allUsers'}
											All Users
										{:else}
											{row.groupName || row.resolvedGroupId}
										{/if}
									</td>
									<td class="text-ink px-3 py-2">{row.intent}</td>
								</tr>
							{/each}
							{#each errorRows as err (err.rowIndex)}
								<tr class="border-border bg-ember-light/30 border-b">
									<td class="text-ember px-3 py-2"><XCircle size={14} /></td>
									<td class="text-muted px-3 py-2" colspan="3">
										Row {err.rowIndex}: {err.message}
									</td>
									<td class="text-muted px-3 py-2 text-xs">{err.field}={err.value}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>

	<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
		<Button variant="ghost" onclick={handleClose}>Cancel</Button>
		{#if dialogState === 'preview' && validRows.length > 0}
			<Button variant="primary" icon={Upload} onclick={handleImport}>
				Import {validRows.length} valid row{validRows.length !== 1 ? 's' : ''}
			</Button>
		{/if}
	</div>
</dialog>
