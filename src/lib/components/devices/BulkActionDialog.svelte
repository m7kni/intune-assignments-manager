<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { getActionInfo } from '$lib/utils/device-actions';
	import { executeBulkDeviceActions } from '$lib/graph/device-actions';
	import { getGraphClient } from '$lib/stores/graph';
	import type { DeviceAction, BulkActionProgress } from '$lib/types/device';
	import {
		RefreshCw,
		RotateCcw,
		Lock,
		Power,
		Trash2,
		UserMinus,
		KeyRound,
		AlertTriangle,
		CheckCircle2,
		XCircle,
		RotateCw
	} from 'lucide-svelte';

	interface DeviceTarget {
		id: string;
		deviceName: string;
	}

	interface Props {
		open: boolean;
		action: DeviceAction;
		devices: DeviceTarget[];
		onClose: () => void;
	}

	const { open, action, devices, onClose }: Props = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ACTION_ICONS: Record<DeviceAction, any> = {
		syncDevice: RefreshCw,
		rebootNow: RotateCcw,
		remoteLock: Lock,
		shutDown: Power,
		resetPasscode: KeyRound,
		retire: UserMinus,
		wipe: Trash2
	};

	type Phase = 'confirm' | 'progress' | 'results';

	let phase = $state<Phase>('confirm');
	let progress = $state<BulkActionProgress | null>(null);
	let cancelled = $state(false);
	let wipeAcknowledged = $state(false);
	let typedActionName = $state('');

	const actionInfo = $derived(getActionInfo(action));
	const ActionIcon = $derived(ACTION_ICONS[action] ?? AlertTriangle);
	const isDestructive = $derived(actionInfo.destructive);
	const isLargeBatch = $derived(devices.length >= 10);

	// For destructive large batches, require typing the action label
	const requiresTypedConfirm = $derived(isDestructive && isLargeBatch);
	const typedConfirmMatch = $derived(
		typedActionName.toLowerCase() === actionInfo.label.toLowerCase()
	);

	// Can the user confirm?
	const canConfirm = $derived.by(() => {
		if (action === 'wipe' && !wipeAcknowledged) return false;
		if (requiresTypedConfirm && !typedConfirmMatch) return false;
		return true;
	});

	const progressPercent = $derived(
		progress ? Math.round((progress.completed / progress.total) * 100) : 0
	);

	const failedResults = $derived(
		progress?.results.filter((r) => r.status === 'error') ?? []
	);

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			phase = 'confirm';
			progress = null;
			cancelled = false;
			wipeAcknowledged = false;
			typedActionName = '';
		}
	});

	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	function handleDialogClose() {
		onClose();
	}

	async function handleConfirm() {
		phase = 'progress';
		cancelled = false;

		const client = getGraphClient();

		const result = await executeBulkDeviceActions(
			client,
			devices,
			action,
			(p) => {
				progress = p;
			}
		);

		progress = result;
		phase = 'results';
	}

	async function handleRetryFailed() {
		if (!progress) return;

		const failedDevices: DeviceTarget[] = failedResults.map((r) => ({
			id: r.deviceId,
			deviceName: r.deviceName
		}));

		if (failedDevices.length === 0) return;

		// Remove failed results from progress, keep succeeded
		const succeededResults = progress.results.filter((r) => r.status === 'success');

		phase = 'progress';
		progress = {
			total: failedDevices.length + succeededResults.length,
			completed: succeededResults.length,
			succeeded: succeededResults.length,
			failed: 0,
			results: [...succeededResults]
		};

		const client = getGraphClient();
		const retryResult = await executeBulkDeviceActions(
			client,
			failedDevices,
			action,
			(p) => {
				// Merge with existing succeeded results
				progress = {
					total: failedDevices.length + succeededResults.length,
					completed: succeededResults.length + p.completed,
					succeeded: succeededResults.length + p.succeeded,
					failed: p.failed,
					results: [...succeededResults, ...p.results]
				};
			}
		);

		progress = {
			total: failedDevices.length + succeededResults.length,
			completed: succeededResults.length + retryResult.completed,
			succeeded: succeededResults.length + retryResult.succeeded,
			failed: retryResult.failed,
			results: [...succeededResults, ...retryResult.results]
		};
		phase = 'results';
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleDialogClose}
	class="border-border bg-surface animate-scale-in w-full max-w-lg rounded-xl border p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
	{#if phase === 'confirm'}
		<!-- Phase 1: Confirmation -->
		<div class="p-6">
			<div class="mb-4 flex items-center gap-3">
				<div
					class="{isDestructive
						? 'bg-ember-light'
						: 'bg-accent-light'} flex h-10 w-10 items-center justify-center rounded-xl"
				>
					<ActionIcon
						size={20}
						class={isDestructive ? 'text-ember' : 'text-accent'}
					/>
				</div>
				<div>
					<h2 class="text-ink text-lg font-semibold">
						{actionInfo.label} {devices.length} Device{devices.length !== 1 ? 's' : ''}
					</h2>
					<p class="text-muted text-sm">{actionInfo.description}</p>
				</div>
			</div>

			{#if isDestructive}
				<div class="bg-ember-light border-ember/20 mb-4 rounded-lg border p-3">
					<div class="flex items-start gap-2">
						<AlertTriangle size={16} class="text-ember mt-0.5 shrink-0" />
						<div class="text-sm">
							{#if action === 'wipe'}
								<p class="text-ember font-medium">
									This will factory reset all selected devices. All data will be permanently
									erased.
								</p>
							{:else if action === 'retire'}
								<p class="text-ember font-medium">
									This will remove corporate data and unenroll all selected devices from
									management.
								</p>
							{/if}
							<p class="text-ink-faint mt-1">This action cannot be undone.</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Device list -->
			<div class="border-border mb-4 max-h-40 overflow-y-auto rounded-lg border">
				{#each devices as device, i (device.id)}
					<div
						class="border-border flex items-center gap-2 px-3 py-1.5 text-sm {i < devices.length - 1
							? 'border-b'
							: ''}"
					>
						<span class="text-muted font-mono text-xs">{i + 1}.</span>
						<span class="text-ink truncate">{device.deviceName}</span>
					</div>
				{/each}
			</div>

			{#if action === 'wipe'}
				<label class="mb-3 flex cursor-pointer items-start gap-2">
					<input
						type="checkbox"
						bind:checked={wipeAcknowledged}
						class="accent-ember mt-0.5"
					/>
					<span class="text-sm text-ink">
						I understand this will factory reset {devices.length} device{devices.length !== 1
							? 's'
							: ''}
					</span>
				</label>
			{/if}

			{#if requiresTypedConfirm}
				<div class="mb-3">
					<label class="text-ink mb-1.5 block text-sm font-medium" for="bulk-confirm-input">
						Type <span class="font-mono font-semibold">{actionInfo.label}</span> to confirm
					</label>
					<input
						id="bulk-confirm-input"
						type="text"
						class="border-border bg-canvas focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						placeholder={actionInfo.label}
						bind:value={typedActionName}
					/>
				</div>
			{/if}
		</div>

		<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
			<Button variant="ghost" onclick={onClose}>Cancel</Button>
			<Button
				variant={isDestructive ? 'destructive' : 'primary'}
				disabled={!canConfirm}
				onclick={handleConfirm}
			>
				{actionInfo.label} {devices.length} Device{devices.length !== 1 ? 's' : ''}
			</Button>
		</div>
	{:else if phase === 'progress'}
		<!-- Phase 2: Progress -->
		<div class="p-6">
			<h2 class="text-ink mb-4 text-lg font-semibold">
				Executing {actionInfo.label}...
			</h2>

			<!-- Progress bar -->
			<div class="mb-4">
				<div class="mb-1 flex justify-between text-sm">
					<span class="text-muted">Progress</span>
					<span class="text-ink font-medium">
						{progress?.completed ?? 0} / {progress?.total ?? devices.length}
					</span>
				</div>
				<div class="bg-canvas-deep h-2 overflow-hidden rounded-full">
					<div
						class="bg-accent h-full rounded-full transition-all duration-300"
						style="width: {progressPercent}%"
					></div>
				</div>
			</div>

			<!-- Live results -->
			{#if progress?.results.length}
				<div class="border-border max-h-48 overflow-y-auto rounded-lg border">
					{#each progress.results as result, i (result.deviceId)}
						<div
							class="border-border flex items-center gap-2 px-3 py-1.5 text-sm {i <
							progress.results.length - 1
								? 'border-b'
								: ''}"
						>
							{#if result.status === 'success'}
								<CheckCircle2 size={14} class="text-success shrink-0" />
							{:else}
								<XCircle size={14} class="text-ember shrink-0" />
							{/if}
							<span class="text-ink min-w-0 flex-1 truncate">{result.deviceName}</span>
							{#if result.error}
								<span class="text-ember truncate text-xs">{result.error}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
			<Button
				variant="ghost"
				onclick={() => {
					cancelled = true;
					phase = 'results';
				}}
			>
				Cancel
			</Button>
		</div>
	{:else}
		<!-- Phase 3: Results -->
		<div class="p-6">
			<h2 class="text-ink mb-4 text-lg font-semibold">
				{actionInfo.label} Complete
			</h2>

			<!-- Summary -->
			<div class="mb-4 flex items-center gap-4">
				{#if progress}
					<div class="flex items-center gap-1.5">
						<CheckCircle2 size={16} class="text-success" />
						<span class="text-sm font-medium">{progress.succeeded} succeeded</span>
					</div>
					{#if progress.failed > 0}
						<div class="flex items-center gap-1.5">
							<XCircle size={16} class="text-ember" />
							<span class="text-sm font-medium">{progress.failed} failed</span>
						</div>
					{/if}
					<span class="text-muted text-sm">of {progress.total} total</span>
				{/if}
				{#if cancelled}
					<span class="text-warn text-sm font-medium">(Cancelled)</span>
				{/if}
			</div>

			<!-- Results list -->
			{#if progress?.results.length}
				<div class="border-border max-h-60 overflow-y-auto rounded-lg border">
					{#each progress.results as result, i (result.deviceId)}
						<div
							class="border-border flex items-center gap-2 px-3 py-1.5 text-sm {i <
							progress.results.length - 1
								? 'border-b'
								: ''}"
						>
							{#if result.status === 'success'}
								<CheckCircle2 size={14} class="text-success shrink-0" />
							{:else}
								<XCircle size={14} class="text-ember shrink-0" />
							{/if}
							<span class="text-ink min-w-0 flex-1 truncate">{result.deviceName}</span>
							{#if result.error}
								<span class="text-ember truncate text-xs">{result.error}</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
			{#if failedResults.length > 0}
				<Button variant="secondary" icon={RotateCw} onclick={handleRetryFailed}>
					Retry Failed ({failedResults.length})
				</Button>
			{/if}
			<Button variant="primary" onclick={onClose}>Close</Button>
		</div>
	{/if}
</dialog>
