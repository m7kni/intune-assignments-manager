<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		label: string;
		value: number | string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
	}

	const { label, value, icon: Icon }: Props = $props();

	let displayValue = $state('0');

	$effect(() => {
		if (!browser || typeof value !== 'number' || value === 0) {
			displayValue = String(value);
			return;
		}

		const target = value;
		const duration = 400;
		const start = performance.now();

		function tick(now: number) {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			// ease-out
			const eased = 1 - Math.pow(1 - progress, 3);
			displayValue = String(Math.round(target * eased));
			if (progress < 1) requestAnimationFrame(tick);
		}

		requestAnimationFrame(tick);
	});
</script>

<div class="panel-raised flex items-center gap-4 transition-shadow hover:shadow-lg">
	<div class="bg-accent-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
		<Icon size={22} class="text-accent" />
	</div>
	<div>
		<p class="text-ink text-3xl font-semibold tabular-nums">{displayValue}</p>
		<p class="text-ink-faint text-sm">{label}</p>
	</div>
</div>
