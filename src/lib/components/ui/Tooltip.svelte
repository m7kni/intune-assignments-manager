<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		children: Snippet;
	}

	const { text, position = 'top', children }: Props = $props();

	const positionClasses: Record<string, string> = {
		top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2'
	};
</script>

<div class="group relative inline-flex">
	{@render children()}
	<div
		role="tooltip"
		class="bg-ink text-surface pointer-events-none absolute z-50 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100 {positionClasses[
			position
		]}"
	>
		{text}
	</div>
</div>
