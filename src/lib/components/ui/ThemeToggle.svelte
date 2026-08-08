<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import { Sun, Moon, Monitor } from 'lucide-svelte';
	import { theme, setTheme } from '$lib/stores/theme.svelte';

	const modes = [
		{ value: 'light' as const, icon: Sun, label: 'Light' },
		{ value: 'dark' as const, icon: Moon, label: 'Dark' },
		{ value: 'system' as const, icon: Monitor, label: 'System' }
	] as const;

	function cycle(): void {
		const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
		const idx = order.indexOf(theme.preference);
		const next = order[(idx + 1) % order.length];
		setTheme(next);
	}

	const current = $derived(modes.find((m) => m.value === theme.preference)!);
</script>

<button
	onclick={cycle}
	class="text-muted hover:bg-canvas-deep hover:text-ink flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
	aria-label="Toggle theme: currently {current.label}"
>
	<current.icon size={16} />
</button>
