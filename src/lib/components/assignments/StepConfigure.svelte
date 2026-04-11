<script lang="ts">
	import { untrack } from 'svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { ensureFiltersLoaded } from '$lib/stores/filter-cache';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type {
		AssignmentIntent,
		AssignmentFilter,
		MobileApp,
		ConfigurationPolicy
	} from '$lib/types/graph';
	import type { DeviceCompliancePolicy } from '$lib/types/compliance';
	import type { ReplaceConfig } from '$lib/types/wizard';
	import { Info } from 'lucide-svelte';

	interface FilterConfig {
		filterId: string;
		filterName: string;
		filterType: 'include' | 'exclude';
	}

	interface GroupTarget {
		type: 'group' | 'allDevices' | 'allUsers';
		groupId?: string;
		displayName: string;
	}

	interface Props {
		intent: AssignmentIntent;
		filterConfig: FilterConfig | null;
		selectedApps: MobileApp[];
		selectedProfiles: ConfigurationPolicy[];
		selectedCompliancePolicies: DeviceCompliancePolicy[];
		selectedSecurityPolicies: ConfigurationPolicy[];
		selectedGroups: GroupTarget[];
		onUpdateIntent: (intent: AssignmentIntent) => void;
		onUpdateFilter: (config: FilterConfig | null) => void;
		replaceMode: boolean;
		replaceConfig: ReplaceConfig;
		onUpdateReplaceMode: (enabled: boolean) => void;
		onUpdateReplaceConfig: (config: ReplaceConfig) => void;
	}

	const {
		intent,
		filterConfig,
		selectedApps,
		selectedProfiles,
		selectedCompliancePolicies,
		selectedSecurityPolicies,
		selectedGroups,
		onUpdateIntent,
		onUpdateFilter,
		replaceMode,
		replaceConfig,
		onUpdateReplaceMode,
		onUpdateReplaceConfig
	}: Props = $props();

	// ─── Intent options ────────────────────────────────────────────────

	const intentOptions: {
		value: AssignmentIntent;
		label: string;
		description: string;
		badgeVariant: 'required' | 'available' | 'uninstall';
	}[] = [
		{
			value: 'required',
			label: 'Required',
			description: 'App must be installed on targeted devices',
			badgeVariant: 'required'
		},
		{
			value: 'available',
			label: 'Available',
			description: 'App appears in Company Portal for users to install',
			badgeVariant: 'available'
		},
		{
			value: 'availableWithoutEnrollment',
			label: 'Available (No Enrollment)',
			description: 'Available without device enrollment required',
			badgeVariant: 'available'
		},
		{
			value: 'uninstall',
			label: 'Uninstall',
			description: 'App will be removed from targeted devices',
			badgeVariant: 'uninstall'
		}
	];

	// ─── Filter state ──────────────────────────────────────────────────

	let filterEnabled = $state(untrack(() => filterConfig !== null));
	let filters = $state<AssignmentFilter[]>([]);
	let filtersLoading = $state(false);
	let filtersError = $state<string | null>(null);
	let selectedFilterId = $state(untrack(() => filterConfig?.filterId ?? ''));
	let selectedFilterType = $state<'include' | 'exclude'>(
		untrack(() => filterConfig?.filterType ?? 'include')
	);

	async function loadFilters(): Promise<void> {
		filtersLoading = true;
		filtersError = null;
		try {
			filters = await ensureFiltersLoaded(getGraphClient());
		} catch (err) {
			filtersError = toFriendlyMessage(err);
		} finally {
			filtersLoading = false;
		}
	}

	function handleFilterToggle(): void {
		filterEnabled = !filterEnabled;
		if (filterEnabled) {
			loadFilters();
		} else {
			selectedFilterId = '';
			selectedFilterType = 'include';
			onUpdateFilter(null);
		}
	}

	function handleFilterSelection(filterId: string): void {
		selectedFilterId = filterId;
		emitFilterUpdate();
	}

	function handleFilterTypeChange(type: 'include' | 'exclude'): void {
		selectedFilterType = type;
		emitFilterUpdate();
	}

	function emitFilterUpdate(): void {
		if (!selectedFilterId) return;
		const filter = filters.find((f) => f.id === selectedFilterId);
		if (!filter) return;
		onUpdateFilter({
			filterId: filter.id,
			filterName: filter.displayName,
			filterType: selectedFilterType
		});
	}

	// ─── Replace mode ──────────────────────────────────────────────────

	const hasApps = $derived(selectedApps.length > 0);
	const hasPolicies = $derived(
		selectedProfiles.length > 0 ||
			selectedCompliancePolicies.length > 0 ||
			selectedSecurityPolicies.length > 0
	);

	const allAppIntents: { value: AssignmentIntent; label: string }[] = [
		{ value: 'required', label: 'Required' },
		{ value: 'available', label: 'Available' },
		{ value: 'availableWithoutEnrollment', label: 'Available (No Enrollment)' },
		{ value: 'uninstall', label: 'Uninstall' }
	];

	function handleReplaceModeToggle(): void {
		const newEnabled = !replaceMode;
		onUpdateReplaceMode(newEnabled);
		if (newEnabled) {
			// Pre-check the current wizard intent for apps, and inclusions for policies
			onUpdateReplaceConfig({
				appIntents: hasApps ? [intent] : [],
				policyInclusions: hasPolicies,
				policyExclusions: false
			});
		} else {
			onUpdateReplaceConfig({
				appIntents: [],
				policyInclusions: false,
				policyExclusions: false
			});
		}
	}

	function toggleReplaceIntent(intentValue: AssignmentIntent): void {
		const current = replaceConfig.appIntents;
		const updated = current.includes(intentValue)
			? current.filter((i) => i !== intentValue)
			: [...current, intentValue];
		onUpdateReplaceConfig({ ...replaceConfig, appIntents: updated });
	}

	function toggleReplaceInclusions(): void {
		onUpdateReplaceConfig({
			...replaceConfig,
			policyInclusions: !replaceConfig.policyInclusions
		});
	}

	function toggleReplaceExclusions(): void {
		onUpdateReplaceConfig({
			...replaceConfig,
			policyExclusions: !replaceConfig.policyExclusions
		});
	}

	// ─── Preview text derivation ───────────────────────────────────────

	const intentLabel = $derived(intentOptions.find((o) => o.value === intent)?.label ?? 'Required');

	const intentBadgeVariant = $derived(
		intentOptions.find((o) => o.value === intent)?.badgeVariant ?? 'required'
	);

	const appCount = $derived(selectedApps.length);
	const profileCount = $derived(selectedProfiles.length);
	const complianceCount = $derived(selectedCompliancePolicies.length);
	const securityCount = $derived(selectedSecurityPolicies.length);
	const groupCount = $derived(selectedGroups.length);

	const previewParts = $derived.by(() => {
		const parts: string[] = [];
		if (appCount > 0) {
			parts.push(`${appCount} app${appCount !== 1 ? 's' : ''}`);
		}
		if (profileCount > 0) {
			parts.push(`${profileCount} profile${profileCount !== 1 ? 's' : ''}`);
		}
		if (complianceCount > 0) {
			parts.push(
				`${complianceCount} compliance polic${complianceCount !== 1 ? 'ies' : 'y'}`
			);
		}
		if (securityCount > 0) {
			parts.push(
				`${securityCount} security polic${securityCount !== 1 ? 'ies' : 'y'}`
			);
		}
		return parts.join(' and ');
	});

	const groupLabel = $derived(`${groupCount} group${groupCount !== 1 ? 's' : ''}`);
</script>

<div class="space-y-6">
	<!-- Replace mode toggle -->
	<div>
		<h3 class="text-ink mb-3 text-sm font-semibold">Assignment Mode</h3>

		<div class="flex items-center gap-3">
			<Toggle
				checked={replaceMode}
				onchange={() => handleReplaceModeToggle()}
				label="Replace existing assignments"
			/>
			<span class="text-ink text-sm">Replace existing assignments</span>
		</div>

		{#if replaceMode}
			<p class="text-muted mt-2 text-xs">
				Existing assignments in the selected categories will be removed and replaced with the
				assignments configured below.
			</p>

			<div class="mt-3 space-y-4">
				{#if hasApps}
					<div>
						<p class="text-ink mb-2 text-xs font-medium">Replace app assignments by intent:</p>
						<div class="flex flex-wrap gap-3">
							{#each allAppIntents as opt (opt.value)}
								<label class="flex cursor-pointer items-center gap-1.5">
									<input
										type="checkbox"
										checked={replaceConfig.appIntents.includes(opt.value)}
										onchange={() => toggleReplaceIntent(opt.value)}
										class="accent-accent h-3.5 w-3.5"
									/>
									<span class="text-ink text-sm">{opt.label}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				{#if hasPolicies}
					<div>
						<p class="text-ink mb-2 text-xs font-medium">Replace policy assignments:</p>
						<div class="flex flex-wrap gap-3">
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="checkbox"
									checked={replaceConfig.policyInclusions}
									onchange={() => toggleReplaceInclusions()}
									class="accent-accent h-3.5 w-3.5"
								/>
								<span class="text-ink text-sm">Inclusion assignments</span>
							</label>
							<label class="flex cursor-pointer items-center gap-1.5">
								<input
									type="checkbox"
									checked={replaceConfig.policyExclusions}
									onchange={() => toggleReplaceExclusions()}
									class="accent-accent h-3.5 w-3.5"
								/>
								<span class="text-ink text-sm">Exclusion assignments</span>
							</label>
						</div>
					</div>
				{/if}
			</div>

			<div class="divider mt-4"></div>
		{/if}
	</div>

	<!-- Intent selector -->
	<div>
		<h3 class="text-ink mb-3 text-sm font-semibold">Assignment Intent</h3>
		<div class="space-y-3">
			{#each intentOptions as option (option.value)}
				{@const isSelected = intent === option.value}
				<label
					class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors {isSelected
						? 'border-accent bg-accent-light ring-accent ring-1'
						: 'border-border bg-surface hover:bg-canvas'}"
				>
					<input
						type="radio"
						name="intent"
						value={option.value}
						checked={isSelected}
						onchange={() => onUpdateIntent(option.value)}
						class="sr-only"
					/>
					<span
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 {isSelected
							? 'border-accent'
							: 'border-muted'}"
					>
						{#if isSelected}
							<span class="bg-accent h-2 w-2 rounded-full"></span>
						{/if}
					</span>
					<div class="min-w-0">
						<span class="text-ink text-sm font-medium">{option.label}</span>
						<p class="text-muted text-xs">{option.description}</p>
					</div>
				</label>
			{/each}
		</div>
	</div>

	<!-- Info callout for profiles/compliance/security -->
	{#if selectedProfiles.length > 0 || selectedCompliancePolicies.length > 0 || selectedSecurityPolicies.length > 0}
		<div class="panel-inset border-accent flex items-start gap-3 border-l-2">
			<Info size={16} class="text-accent mt-0.5 shrink-0" />
			<p class="text-ink-light text-sm">
				Intent applies to apps only. Configuration profiles, compliance policies, and endpoint
				security policies are always applied to targeted groups.
			</p>
		</div>
	{/if}

	<!-- Assignment filter section -->
	<div>
		<div class="divider mb-4"></div>
		<h3 class="text-ink mb-3 text-sm font-semibold">Assignment Filter</h3>

		<div class="flex items-center gap-3">
			<Toggle
				checked={filterEnabled}
				onchange={() => handleFilterToggle()}
				label="Apply an assignment filter"
			/>
			<span class="text-ink text-sm">Apply an assignment filter</span>
		</div>

		{#if filterEnabled}
			<div class="mt-3 space-y-3">
				{#if filtersLoading}
					<div class="flex justify-center py-4">
						<Spinner size="sm" label="Loading filters" />
					</div>
				{:else if filtersError}
					<div class="panel-inset border-ember border-l-2">
						<p class="text-ember text-sm">{filtersError}</p>
					</div>
				{:else}
					<select
						value={selectedFilterId}
						onchange={(e) => handleFilterSelection(e.currentTarget.value)}
						class="border-border bg-surface text-ink w-full rounded-lg border px-3 py-2 text-sm"
					>
						<option value="" disabled>Select a filter...</option>
						{#each filters as filter (filter.id)}
							<option value={filter.id}>{filter.displayName}</option>
						{/each}
					</select>

					{#if selectedFilterId}
						<div class="flex items-center gap-4">
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="filterType"
									value="include"
									checked={selectedFilterType === 'include'}
									onchange={() => handleFilterTypeChange('include')}
									class="border-border text-accent accent-accent h-4 w-4"
								/>
								<span class="text-ink text-sm">Include devices matching filter</span>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="filterType"
									value="exclude"
									checked={selectedFilterType === 'exclude'}
									onchange={() => handleFilterTypeChange('exclude')}
									class="border-border text-accent accent-accent h-4 w-4"
								/>
								<span class="text-ink text-sm">Exclude devices matching filter</span>
							</label>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Preview text -->
	{#if previewParts && groupCount > 0}
		<div class="panel-inset">
			<p class="text-ink text-sm">
				You are assigning {previewParts} to {groupLabel} as
				<Badge variant={intentBadgeVariant}>{intentLabel}</Badge>
			</p>
		</div>
	{/if}
</div>
