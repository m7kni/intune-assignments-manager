<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import Kbd from './Kbd.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	const { open, onclose }: Props = $props();

	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		else if (!open && dialogEl.open) dialogEl.close();
	});

	const shortcuts = [
		{ keys: '\u2318K', label: 'Open command palette' },
		{ keys: 'G then D', label: 'Go to Dashboard' },
		{ keys: 'G then A', label: 'Go to Apps' },
		{ keys: 'G then P', label: 'Go to Profiles' },
		{ keys: 'G then L', label: 'Go to Audit Log' },
		{ keys: 'G then B', label: 'Go to Bulk Assign' },
		{ keys: '/', label: 'Focus search input' },
		{ keys: 'Esc', label: 'Close modals and palettes' },
		{ keys: '?', label: 'Show this help' }
	];
</script>

<dialog
	bind:this={dialogEl}
	{onclose}
	class="border-border bg-surface animate-scale-in w-full max-w-md rounded-xl border p-0 shadow-lg backdrop:bg-black/50 backdrop:backdrop-blur-sm"
>
	<div class="border-border border-b px-6 py-4">
		<h2 class="text-ink text-lg font-semibold">Keyboard Shortcuts</h2>
	</div>
	<div class="p-4">
		<div class="space-y-1">
			{#each shortcuts as shortcut (shortcut.keys)}
				<div class="hover:bg-canvas flex items-center justify-between rounded-lg px-3 py-2">
					<span class="text-ink text-sm">{shortcut.label}</span>
					<Kbd keys={shortcut.keys} />
				</div>
			{/each}
		</div>
	</div>
	<div class="border-border border-t px-6 py-3">
		<button
			type="button"
			onclick={onclose}
			class="text-muted hover:bg-canvas-deep w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
		>
			Close
		</button>
	</div>
</dialog>
