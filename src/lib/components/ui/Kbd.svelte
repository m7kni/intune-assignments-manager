<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Props {
		keys: string;
	}

	const { keys }: Props = $props();
</script>

<kbd
	class="border-border bg-canvas-deep text-ink-faint inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium"
>
	{keys}
</kbd>
