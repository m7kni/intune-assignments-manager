<script lang="ts">
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { TIER_3_SCOPES } from '$lib/auth/config';
	import { DEVICE_ACTIONS } from '$lib/utils/device-types';
	import { executeDeviceAction } from '$lib/graph/devices';
	import { getGraphClient } from '$lib/stores/graph';
	import { notifySuccess, notifyError } from '$lib/stores/notifications.svelte';
	import type { DeviceAction, DeviceActionInfo } from '$lib/types/device';
	import {
		RefreshCw,
		RotateCcw,
		Lock,
		Power,
		Trash2,
		AlertTriangle,
		UserMinus,
		KeyRound
	} from 'lucide-svelte';

	interface Props {
		deviceId: string;
		deviceName: string;
		onActionComplete?: () => void;
	}

	const { deviceId, deviceName, onActionComplete }: Props = $props();

	let loadingAction = $state<DeviceAction | null>(null);

	// Simple confirmation dialog
	let confirmOpen = $state(false);
	let confirmAction = $state<DeviceActionInfo | null>(null);

	// Destructive confirmation dialog (requires typed name)
	let destructiveOpen = $state(false);
	let destructiveAction = $state<DeviceActionInfo | null>(null);
	let typedConfirmation = $state('');

	const typedConfirmationMatch = $derived(typedConfirmation === deviceName);

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

	const nonDestructive = DEVICE_ACTIONS.filter((a) => !a.destructive);
	const destructive = DEVICE_ACTIONS.filter((a) => a.destructive);

	function requestAction(actionInfo: DeviceActionInfo): void {
		if (actionInfo.requiresTypedConfirmation) {
			destructiveAction = actionInfo;
			typedConfirmation = '';
			destructiveOpen = true;
		} else {
			confirmAction = actionInfo;
			confirmOpen = true;
		}
	}

	async function doExecute(action: DeviceAction): Promise<void> {
		loadingAction = action;
		try {
			const client = getGraphClient();
			await executeDeviceAction(client, deviceId, action);
			const info = DEVICE_ACTIONS.find((a) => a.action === action);
			notifySuccess(
				`${info?.label ?? action} sent`,
				`Action "${info?.label ?? action}" was sent to ${deviceName}.`
			);
			onActionComplete?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			notifyError('Action failed', message);
		} finally {
			loadingAction = null;
		}
	}

	function handleConfirm(): void {
		if (!confirmAction) return;
		confirmOpen = false;
		doExecute(confirmAction.action);
		confirmAction = null;
	}

	function handleDestructiveConfirm(): void {
		if (!destructiveAction || !typedConfirmationMatch) return;
		destructiveOpen = false;
		doExecute(destructiveAction.action);
		destructiveAction = null;
		typedConfirmation = '';
	}

	function closeDestructive(): void {
		destructiveOpen = false;
		destructiveAction = null;
		typedConfirmation = '';
	}
</script>

<PermissionGuard requiredScopes={[...TIER_3_SCOPES]} featureName="Device Actions">
	<div class="panel-raised">
		<h3 class="text-ink mb-4 text-sm font-semibold">Quick Actions</h3>
		<div class="flex flex-wrap items-center gap-2">
			<!-- Non-destructive actions -->
			{#each nonDestructive as actionInfo (actionInfo.action)}
				<Button
					variant={actionInfo.action === 'syncDevice' ? 'primary' : 'secondary'}
					size="sm"
					icon={ACTION_ICONS[actionInfo.action]}
					loading={loadingAction === actionInfo.action}
					disabled={loadingAction !== null && loadingAction !== actionInfo.action}
					onclick={() => requestAction(actionInfo)}
				>
					{actionInfo.label}
				</Button>
			{/each}

			<!-- Separator -->
			<div class="bg-border mx-1 hidden h-6 w-px sm:block"></div>

			<!-- Destructive actions -->
			{#each destructive as actionInfo (actionInfo.action)}
				<Button
					variant="destructive"
					size="sm"
					icon={ACTION_ICONS[actionInfo.action]}
					loading={loadingAction === actionInfo.action}
					disabled={loadingAction !== null && loadingAction !== actionInfo.action}
					onclick={() => requestAction(actionInfo)}
				>
					{actionInfo.label}
				</Button>
			{/each}
		</div>
	</div>
</PermissionGuard>

<!-- Standard confirmation dialog -->
<ConfirmDialog
	open={confirmOpen}
	title="Confirm {confirmAction?.label ?? 'Action'}"
	message="{confirmAction?.description ?? 'Are you sure?'} This action will be sent to {deviceName}."
	confirmLabel={confirmAction?.label ?? 'Confirm'}
	onConfirm={handleConfirm}
	onCancel={() => {
		confirmOpen = false;
		confirmAction = null;
	}}
/>

<!-- Destructive confirmation dialog (typed name required) -->
{#if destructiveOpen && destructiveAction}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
	>
	<div
		class="border-border bg-surface animate-scale-in relative z-10 w-full max-w-md rounded-xl border p-0 shadow-lg"
	>
		<div class="p-6">
			<div class="mb-3 flex items-center gap-3">
				<div class="bg-ember-light flex h-10 w-10 items-center justify-center rounded-xl">
					<AlertTriangle size={20} class="text-ember" />
				</div>
				<h2 class="text-ink text-lg font-semibold">{destructiveAction.label} Device</h2>
			</div>
			<p class="text-muted text-sm">
				{destructiveAction.description}
			</p>
			<p class="text-ember mt-2 text-sm font-medium">
				This action cannot be undone.
			</p>
			<div class="mt-4">
				<label class="text-ink mb-1.5 block text-sm font-medium" for="confirm-input">
					Type <span class="font-mono font-semibold">{deviceName}</span> to confirm
				</label>
				<input
					id="confirm-input"
					type="text"
					class="border-border bg-canvas focus:border-accent focus:ring-accent/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
					placeholder={deviceName}
					bind:value={typedConfirmation}
					onkeydown={(e) => {
						if (e.key === 'Enter' && typedConfirmationMatch) handleDestructiveConfirm();
					}}
				/>
			</div>
		</div>
		<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
			<Button variant="ghost" onclick={closeDestructive}>Cancel</Button>
			<Button
				variant="destructive"
				disabled={!typedConfirmationMatch}
				onclick={handleDestructiveConfirm}
			>
				{destructiveAction.label}
			</Button>
		</div>
	</div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm"
		onclick={closeDestructive}
	></div>
	</div>
{/if}
