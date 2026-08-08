<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Monitor, Users, UsersRound, UserMinus, Pencil, Trash2 } from 'lucide-svelte';

	interface Props {
		targetName: string;
		targetType: string;
		intent: string | null;
		filterName: string | null;
		filterType: string | null;
		isExclusion: boolean;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	const {
		targetName,
		targetType,
		intent,
		filterName,
		filterType,
		isExclusion,
		onEdit,
		onDelete
	}: Props = $props();

	const intentConfig = $derived(getIntentConfig(intent));
	const targetIcon = $derived(getTargetIcon(targetType));

	function getIntentConfig(intent: string | null): {
		variant: 'required' | 'available' | 'uninstall' | 'exclude' | 'neutral';
		label: string;
	} {
		switch (intent) {
			case 'required':
				return { variant: 'required', label: 'Required' };
			case 'available':
				return { variant: 'available', label: 'Available' };
			case 'uninstall':
				return { variant: 'uninstall', label: 'Uninstall' };
			case 'availableWithoutEnrollment':
				return { variant: 'available', label: 'Available (No Enrollment)' };
			default:
				return { variant: 'neutral', label: 'Applicable' };
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function getTargetIcon(type: string): { icon: any; bgClass: string; textClass: string } {
		switch (type) {
			case '#microsoft.graph.allDevicesAssignmentTarget':
				return { icon: Monitor, bgClass: 'bg-accent-light', textClass: 'text-accent' };
			case '#microsoft.graph.allLicensedUsersAssignmentTarget':
				return { icon: Users, bgClass: 'bg-accent-light', textClass: 'text-accent' };
			case '#microsoft.graph.exclusionGroupAssignmentTarget':
				return { icon: UserMinus, bgClass: 'bg-ember-light', textClass: 'text-ember' };
			default:
				return { icon: UsersRound, bgClass: 'bg-canvas-deep', textClass: 'text-muted' };
		}
	}
</script>

<div class="border-border group flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
	<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg {targetIcon.bgClass}">
		{#if targetIcon.icon}
			{@const Icon = targetIcon.icon}
			<Icon size={18} class={targetIcon.textClass} />
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<p class="text-ink truncate text-sm font-medium">{targetName}</p>
		{#if filterName && filterType && filterType !== 'none'}
			<p class="text-muted truncate text-xs">
				Filter: {filterName} ({filterType})
			</p>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2">
		{#if isExclusion}
			<Badge variant="exclude">Excluded</Badge>
		{/if}
		<Badge variant={intentConfig.variant}>{intentConfig.label}</Badge>

		{#if onEdit || onDelete}
			<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{#if onEdit}
					<button
						type="button"
						onclick={onEdit}
						class="text-muted hover:text-accent rounded-md p-1.5 transition-colors"
						aria-label="Edit assignment"
					>
						<Pencil size={14} />
					</button>
				{/if}
				{#if onDelete}
					<button
						type="button"
						onclick={onDelete}
						class="text-muted hover:text-ember rounded-md p-1.5 transition-colors"
						aria-label="Delete assignment"
					>
						<Trash2 size={14} />
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
