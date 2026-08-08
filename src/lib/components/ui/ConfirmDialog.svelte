<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	const { open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }: Props = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	function handleClose() {
		onCancel();
	}

	function handleConfirm() {
		onConfirm();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleClose}
	class="border-border bg-surface animate-scale-in w-full max-w-md rounded-xl border p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
	<div class="p-6">
		<h2 class="text-ink text-lg font-semibold">{title}</h2>
		<p class="text-muted mt-2 text-sm">{message}</p>
	</div>
	<div class="border-border flex justify-end gap-3 border-t px-6 py-4">
		<Button variant="ghost" onclick={handleClose}>Cancel</Button>
		<Button variant="destructive" onclick={handleConfirm}>
			{confirmLabel}
		</Button>
	</div>
</dialog>
