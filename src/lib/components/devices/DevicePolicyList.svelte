<!-- SPDX-License-Identifier: AGPL-3.0-only -->
<script lang="ts">
	import type { DeviceCompliancePolicyState, DeviceConfigurationState } from '$lib/types/device';
	import { getPolicyStateInfo } from '$lib/utils/device-types';
	import Badge from '$lib/components/ui/Badge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { ChevronRight, ShieldCheck, Settings } from 'lucide-svelte';

	interface Props {
		policies: (DeviceCompliancePolicyState | DeviceConfigurationState)[];
		type: 'compliance' | 'configuration';
		emptyMessage: string;
	}

	const { policies, type, emptyMessage }: Props = $props();

	const expandedIds = new SvelteSet<string>();

	function toggleExpanded(id: string): void {
		if (expandedIds.has(id)) {
			expandedIds.delete(id);
		} else {
			expandedIds.add(id);
		}
	}

	function getPolicyId(
		policy: DeviceCompliancePolicyState | DeviceConfigurationState,
		index: number
	): string {
		return `${policy.id ?? 'policy'}-${index}`;
	}

	function isConfigPolicy(
		policy: DeviceCompliancePolicyState | DeviceConfigurationState
	): policy is DeviceConfigurationState {
		return 'platformType' in policy;
	}
</script>

{#if policies.length === 0}
	<EmptyState
		icon={type === 'compliance' ? ShieldCheck : Settings}
		title={emptyMessage}
		description="No {type} policies are currently applied to this device."
	/>
{:else}
	<div class="panel overflow-clip p-0">
		<!-- Header -->
		<div
			class="border-border bg-surface/95 sticky top-12 z-10 grid grid-cols-12 gap-2 border-b px-4 py-2 text-[10px] font-semibold tracking-wider uppercase"
		>
			<div class="text-muted col-span-6 sm:col-span-5">Policy Name</div>
			<div class="text-muted col-span-3 sm:col-span-3 text-center">Status</div>
			{#if type === 'configuration'}
				<div class="text-muted col-span-2 hidden sm:block">Platform</div>
			{/if}
			<div class="text-muted col-span-3 sm:col-span-2 text-right">Settings</div>
		</div>

		{#each policies as policy, i (getPolicyId(policy, i))}
			{@const policyId = getPolicyId(policy, i)}
			{@const stateInfo = getPolicyStateInfo(policy.state)}
			{@const isExpanded = expandedIds.has(policyId)}
			{@const hasSettings = policy.settingStates.length > 0}

			<!-- Policy row -->
			<button
				class="border-border hover:bg-accent-subtle grid w-full grid-cols-12 items-center gap-2 border-b px-4 py-3 text-left transition-colors {hasSettings
					? 'cursor-pointer'
					: 'cursor-default'}"
				onclick={() => hasSettings && toggleExpanded(policyId)}
				disabled={!hasSettings}
			>
				<div class="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0">
					{#if hasSettings}
						<ChevronRight
							size={14}
							class="text-muted shrink-0 transition-transform {isExpanded ? 'rotate-90' : ''}"
						/>
					{:else}
						<div class="w-3.5 shrink-0"></div>
					{/if}
					<span class="text-ink truncate text-sm font-medium">
						{policy.displayName ?? 'Unknown Policy'}
					</span>
				</div>
				<div class="col-span-3 sm:col-span-3 flex justify-center">
					<Badge variant={stateInfo.variant} dot>
						{stateInfo.label}
					</Badge>
				</div>
				{#if type === 'configuration' && isConfigPolicy(policy)}
					<div class="col-span-2 hidden sm:block">
						{#if policy.platformType}
							<Badge variant="outline">{policy.platformType}</Badge>
						{/if}
					</div>
				{/if}
				<div class="text-ink-faint col-span-3 sm:col-span-2 text-right text-sm">
					{policy.settingCount}
				</div>
			</button>

			<!-- Expanded settings -->
			{#if isExpanded && hasSettings}
				<div class="border-border bg-canvas border-b px-4 py-3">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-muted text-[10px] font-semibold tracking-wider uppercase">
								<th class="pb-2 text-left font-semibold">Setting</th>
								<th class="pb-2 text-center font-semibold">State</th>
								<th class="hidden pb-2 text-left font-semibold sm:table-cell"> Value </th>
								<th class="hidden pb-2 text-left font-semibold md:table-cell"> Error </th>
							</tr>
						</thead>
						<tbody>
							{#each policy.settingStates as setting, si (si)}
								{@const settingStateInfo = getPolicyStateInfo(setting.state)}
								<tr class="border-border border-t">
									<td class="text-ink py-2 pr-4">
										{setting.settingName ?? 'Unknown Setting'}
									</td>
									<td class="py-2 text-center">
										<Badge variant={settingStateInfo.variant}>
											{settingStateInfo.label}
										</Badge>
									</td>
									<td class="text-ink-faint hidden py-2 font-mono text-xs sm:table-cell">
										{setting.currentValue ?? '—'}
									</td>
									<td class="text-ember hidden py-2 text-xs md:table-cell">
										{setting.errorDescription ?? ''}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/each}
	</div>
{/if}
