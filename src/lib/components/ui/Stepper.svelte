<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { StepDefinition } from '$lib/types/wizard';

	interface Props {
		steps: StepDefinition[];
		currentStepIndex: number;
	}

	const { steps, currentStepIndex }: Props = $props();
</script>

<nav aria-label="Wizard progress">
	<div class="flex items-center gap-2">
		{#each steps as step, i (step.id)}
			{@const isCompleted = i < currentStepIndex}
			{@const isCurrent = i === currentStepIndex}
			<div class="flex flex-1 flex-col items-center gap-1.5">
				<!-- Segment bar -->
				<div
					class="h-1.5 w-full rounded-full transition-all duration-500 ease-out {isCompleted
						? 'bg-accent'
						: isCurrent
							? 'bg-accent animate-progress-pulse'
							: 'bg-soft'}"
				></div>
				<!-- Label -->
				<span
					class="text-xs transition-colors {isCompleted
						? 'text-accent font-medium'
						: isCurrent
							? 'text-ink font-medium'
							: 'text-muted'}"
				>
					<span class="sm:hidden">{step.shortLabel}</span>
					<span class="hidden sm:block">{step.label}</span>
				</span>
			</div>
		{/each}
	</div>
</nav>
