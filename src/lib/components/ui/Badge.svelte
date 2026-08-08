<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant: 'required' | 'available' | 'uninstall' | 'exclude' | 'neutral' | 'info' | 'outline';
		dot?: boolean;
		children: Snippet;
	}

	const { variant, dot = false, children }: Props = $props();

	const variantClasses: Record<string, string> = {
		required: 'bg-success-light text-success',
		available: 'bg-warn-light text-warn',
		uninstall: 'bg-ember-light text-ember',
		exclude: 'bg-ember-light text-ember',
		neutral: 'bg-canvas-deep text-muted',
		info: 'bg-accent-light text-accent',
		outline: 'border border-border text-ink-faint'
	};

	const dotColors: Record<string, string> = {
		required: 'bg-success',
		available: 'bg-warn',
		uninstall: 'bg-ember',
		exclude: 'bg-ember',
		neutral: 'bg-muted',
		info: 'bg-accent',
		outline: 'bg-ink-faint'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium {variantClasses[
		variant
	]}"
>
	{#if dot}
		<span class="h-1.5 w-1.5 rounded-full {dotColors[variant]}"></span>
	{/if}
	{@render children()}
</span>
