<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Tab {
		id: string;
		label: string;
	}

	interface Props {
		tabs: Tab[];
		active: string;
		onchange: (id: string) => void;
	}

	const { tabs, active, onchange }: Props = $props();

	let tabListEl: HTMLDivElement;
	let indicatorStyle = $state('');

	function updateIndicator(tabId: string) {
		if (!tabListEl) return;
		const btn = tabListEl.querySelector(`[data-tab-id="${tabId}"]`) as HTMLButtonElement | null;
		if (!btn) return;
		const listRect = tabListEl.getBoundingClientRect();
		const btnRect = btn.getBoundingClientRect();
		indicatorStyle = `left: ${btnRect.left - listRect.left}px; width: ${btnRect.width}px;`;
	}

	$effect(() => {
		updateIndicator(active);
	});
</script>

<div role="tablist" class="border-border relative flex gap-4 border-b" bind:this={tabListEl}>
	{#each tabs as tab (tab.id)}
		<button
			role="tab"
			data-tab-id={tab.id}
			aria-selected={active === tab.id}
			class="relative px-1 pt-1 pb-2.5 text-sm transition-colors {active === tab.id
				? 'text-accent font-medium'
				: 'text-muted hover:text-ink'}"
			onclick={() => onchange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
	<!-- Animated underline -->
	<div
		class="bg-accent absolute bottom-0 h-0.5 transition-all duration-200 ease-out"
		style={indicatorStyle}
	></div>
</div>
