<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Spinner from './Spinner.svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		disabled?: boolean;
		icon?: any;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	const {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		icon: Icon,
		href,
		type = 'button',
		onclick,
		children
	}: Props = $props();

	const baseClasses =
		'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';

	const variantClasses: Record<string, string> = {
		primary: 'bg-accent text-white shadow-sm hover:bg-accent-hover',
		secondary:
			'bg-surface text-ink border border-border shadow-sm hover:bg-canvas hover:border-border-hover',
		ghost: 'text-ink hover:bg-canvas-deep',
		destructive: 'bg-ember text-white shadow-sm hover:bg-ember/90',
		outline: 'border border-border text-ink hover:bg-canvas hover:border-border-hover'
	};

	const sizeClasses: Record<string, string> = {
		sm: 'text-xs px-2.5 py-1.5 rounded-lg',
		md: 'text-sm px-4 py-2 rounded-lg',
		lg: 'text-sm px-6 py-2.5 rounded-xl'
	};

	const iconSizes: Record<string, number> = { sm: 14, md: 16, lg: 18 };

	const classes = $derived(`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`);
</script>

{#if href && !disabled}
	<a {href} class={classes}>
		{#if loading}
			<Spinner size="sm" />
		{:else if Icon}
			<Icon size={iconSizes[size]} />
		{/if}
		{@render children()}
	</a>
{:else}
	<button {type} {onclick} disabled={disabled || loading} class={classes}>
		{#if loading}
			<Spinner size="sm" />
		{:else if Icon}
			<Icon size={iconSizes[size]} />
		{/if}
		{@render children()}
	</button>
{/if}
