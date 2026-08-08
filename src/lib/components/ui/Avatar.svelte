<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Props {
		name: string;
		size?: 'sm' | 'md' | 'lg';
	}

	const { name, size = 'md' }: Props = $props();

	const initials = $derived(
		name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase()
	);

	const sizeClasses: Record<string, string> = {
		sm: 'h-7 w-7 text-[10px]',
		md: 'h-9 w-9 text-xs',
		lg: 'h-11 w-11 text-sm'
	};
</script>

<div
	class="bg-accent/20 text-accent flex shrink-0 items-center justify-center rounded-full font-semibold {sizeClasses[
		size
	]}"
	aria-hidden="true"
>
	{initials}
</div>
