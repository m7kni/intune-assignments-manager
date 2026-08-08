<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		onchange?: (checked: boolean) => void;
	}

	let { checked = $bindable(false), disabled = false, label, onchange }: Props = $props();

	function handleClick() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	onclick={handleClick}
	class="focus-visible:outline-accent relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {checked
		? 'bg-accent'
		: 'bg-soft'}"
>
	<span
		class="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {checked
			? 'translate-x-6'
			: 'translate-x-1'}"
	></span>
</button>
