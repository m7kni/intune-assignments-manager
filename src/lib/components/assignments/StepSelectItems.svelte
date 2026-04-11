<script lang="ts">
	import { X, Package, Search } from 'lucide-svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import MultiSelectFilter from '$lib/components/ui/MultiSelectFilter.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { getAppTypeInfo } from '$lib/utils/app-types';
	import { getProfileTypeInfo } from '$lib/utils/profile-types';
	import { getCompliancePlatformInfo } from '$lib/utils/compliance-types';
	import { getSecurityCategoryInfo } from '$lib/utils/security-types';
	import { getGraphClient } from '$lib/stores/graph';
	import { listApps, getApp } from '$lib/graph/apps';
	import { listConfigPolicies, getConfigPolicy } from '$lib/graph/configurations';
	import { listCompliancePolicies, getCompliancePolicy } from '$lib/graph/compliance';
	import { listSecurityPolicies } from '$lib/graph/security';
	import { listUpdateRings } from '$lib/graph/updates';
	import { listRemediationScripts } from '$lib/graph/remediations';
	import { listScripts } from '$lib/graph/scripts';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import type { MobileApp, ConfigurationPolicy } from '$lib/types/graph';
	import type { DeviceCompliancePolicy } from '$lib/types/compliance';
	import type { WindowsUpdateForBusinessConfiguration } from '$lib/types/updates';
	import type { DeviceHealthScript } from '$lib/types/remediation';
	import type { DeviceManagementScript } from '$lib/types/scripts';
	import {
		APP_PLATFORM_OPTIONS,
		PROFILE_PLATFORM_OPTIONS,
		PROFILE_TECHNOLOGY_OPTIONS,
		COMPLIANCE_PLATFORM_OPTIONS,
		SECURITY_CATEGORY_OPTIONS,
		deriveAppTypeOptions,
		filterApps,
		filterProfiles,
		filterCompliancePolicies,
		filterSecurityPolicies,
		type AssignmentStatus
	} from '$lib/utils/filters';

	interface Props {
		selectedApps: MobileApp[];
		selectedProfiles: ConfigurationPolicy[];
		selectedCompliancePolicies: DeviceCompliancePolicy[];
		selectedSecurityPolicies: ConfigurationPolicy[];
		selectedUpdateRings: WindowsUpdateForBusinessConfiguration[];
		selectedRemediations: DeviceHealthScript[];
		selectedScripts: DeviceManagementScript[];
		preselectedAppId: string | null;
		preselectedProfileId: string | null;
		preselectedCompliancePolicyId: string | null;
		preselectedSecurityPolicyId: string | null;
		apps: MobileApp[];
		profiles: ConfigurationPolicy[];
		compliancePolicies: DeviceCompliancePolicy[];
		securityPolicies: ConfigurationPolicy[];
		updateRings: WindowsUpdateForBusinessConfiguration[];
		remediations: DeviceHealthScript[];
		scripts: DeviceManagementScript[];
		onUpdateApps: (apps: MobileApp[]) => void;
		onUpdateProfiles: (profiles: ConfigurationPolicy[]) => void;
		onUpdateCompliancePolicies: (policies: DeviceCompliancePolicy[]) => void;
		onUpdateSecurityPolicies: (policies: ConfigurationPolicy[]) => void;
		onUpdateUpdateRings: (rings: WindowsUpdateForBusinessConfiguration[]) => void;
		onUpdateRemediations: (scripts: DeviceHealthScript[]) => void;
		onUpdateScripts: (scripts: DeviceManagementScript[]) => void;
		onAppsLoaded: (apps: MobileApp[]) => void;
		onProfilesLoaded: (profiles: ConfigurationPolicy[]) => void;
		onCompliancePoliciesLoaded: (policies: DeviceCompliancePolicy[]) => void;
		onSecurityPoliciesLoaded: (policies: ConfigurationPolicy[]) => void;
		onUpdateRingsLoaded: (rings: WindowsUpdateForBusinessConfiguration[]) => void;
		onRemediationsLoaded: (scripts: DeviceHealthScript[]) => void;
		onScriptsLoaded: (scripts: DeviceManagementScript[]) => void;
	}

	const {
		selectedApps,
		selectedProfiles,
		selectedCompliancePolicies,
		selectedSecurityPolicies,
		selectedUpdateRings,
		selectedRemediations,
		selectedScripts,
		preselectedAppId,
		preselectedProfileId,
		preselectedCompliancePolicyId,
		preselectedSecurityPolicyId,
		apps,
		profiles,
		compliancePolicies,
		securityPolicies,
		updateRings,
		remediations,
		scripts,
		onUpdateApps,
		onUpdateProfiles,
		onUpdateCompliancePolicies,
		onUpdateSecurityPolicies,
		onUpdateUpdateRings,
		onUpdateRemediations,
		onUpdateScripts,
		onAppsLoaded,
		onProfilesLoaded,
		onCompliancePoliciesLoaded,
		onSecurityPoliciesLoaded,
		onUpdateRingsLoaded,
		onRemediationsLoaded,
		onScriptsLoaded
	}: Props = $props();

	// ─── Internal State ──────────────────────────────────────────────
	let activeTab = $state<string>('apps');
	let appSearch = $state('');
	let profileSearch = $state('');
	let appPlatformFilter = $state<string[]>([]);
	let appTypeFilter = $state<string[]>([]);
	let appAssignmentStatus = $state<AssignmentStatus>('all');
	let profilePlatformFilter = $state<string[]>([]);
	let profileTechnologyFilter = $state<string[]>([]);
	let profileAssignmentStatus = $state<AssignmentStatus>('all');
	let complianceSearch = $state('');
	let compliancePlatformFilter = $state<string[]>([]);
	let complianceAssignmentStatus = $state<AssignmentStatus>('all');
	let securitySearch = $state('');
	let securityCategoryFilter = $state<string[]>([]);
	let securityAssignmentStatus = $state<AssignmentStatus>('all');
	let updateRingSearch = $state('');
	let remediationSearch = $state('');
	let scriptSearch = $state('');
	let loadingApps = $state(false);
	let loadingProfiles = $state(false);
	let loadingCompliance = $state(false);
	let loadingSecurity = $state(false);
	let loadingUpdateRings = $state(false);
	let loadingRemediations = $state(false);
	let loadingScripts = $state(false);
	let appsError = $state<string | null>(null);
	let profilesError = $state<string | null>(null);
	let complianceError = $state<string | null>(null);
	let securityError = $state<string | null>(null);
	let updateRingsError = $state<string | null>(null);
	let remediationsError = $state<string | null>(null);
	let scriptsError = $state<string | null>(null);
	let hasPreselected = $state(false);

	const tabs = [
		{ id: 'apps', label: 'Apps' },
		{ id: 'profiles', label: 'Config Profiles' },
		{ id: 'compliance', label: 'Compliance' },
		{ id: 'security', label: 'Security' },
		{ id: 'updateRings', label: 'Update Rings' },
		{ id: 'remediations', label: 'Remediations' },
		{ id: 'scripts', label: 'Scripts' }
	];

	// ─── Derived State ───────────────────────────────────────────────
	const appTypeOptions = $derived(deriveAppTypeOptions(apps));

	const filteredApps = $derived(
		filterApps(apps, {
			search: appSearch,
			platforms: appPlatformFilter,
			appTypes: appTypeFilter,
			assignmentStatus: appAssignmentStatus
		})
	);

	const filteredProfiles = $derived(
		filterProfiles(profiles, {
			search: profileSearch,
			platforms: profilePlatformFilter,
			technologies: profileTechnologyFilter,
			assignmentStatus: profileAssignmentStatus
		})
	);

	const filteredCompliance = $derived(
		filterCompliancePolicies(compliancePolicies, {
			search: complianceSearch,
			platforms: compliancePlatformFilter,
			assignmentStatus: complianceAssignmentStatus
		})
	);

	const filteredSecurity = $derived(
		filterSecurityPolicies(securityPolicies, {
			search: securitySearch,
			categories: securityCategoryFilter,
			assignmentStatus: securityAssignmentStatus
		})
	);

	const filteredUpdateRings = $derived(
		updateRings.filter((r) => {
			if (!updateRingSearch) return true;
			const q = updateRingSearch.toLowerCase();
			return r.displayName.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
		})
	);

	const filteredRemediations = $derived(
		remediations.filter((s) => {
			if (!remediationSearch) return true;
			const q = remediationSearch.toLowerCase();
			return (
				s.displayName.toLowerCase().includes(q) ||
				s.description?.toLowerCase().includes(q) ||
				s.publisher?.toLowerCase().includes(q)
			);
		})
	);

	const filteredScripts = $derived(
		scripts.filter((s) => {
			if (!scriptSearch) return true;
			const q = scriptSearch.toLowerCase();
			return (
				s.displayName.toLowerCase().includes(q) ||
				s.description?.toLowerCase().includes(q) ||
				s.fileName?.toLowerCase().includes(q)
			);
		})
	);

	const appStatusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const profileStatusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const complianceStatusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const securityStatusOptions: { id: AssignmentStatus; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'assigned', label: 'Assigned' },
		{ id: 'unassigned', label: 'Unassigned' }
	];

	const allSelected = $derived([
		...selectedApps.map((app) => ({ type: 'app' as const, id: app.id, name: app.displayName })),
		...selectedProfiles.map((profile) => ({
			type: 'profile' as const,
			id: profile.id,
			name: profile.name
		})),
		...selectedCompliancePolicies.map((policy) => ({
			type: 'compliance' as const,
			id: policy.id,
			name: policy.displayName
		})),
		...selectedSecurityPolicies.map((policy) => ({
			type: 'security' as const,
			id: policy.id,
			name: policy.name
		})),
		...selectedUpdateRings.map((ring) => ({
			type: 'updateRing' as const,
			id: ring.id,
			name: ring.displayName
		})),
		...selectedRemediations.map((script) => ({
			type: 'remediation' as const,
			id: script.id,
			name: script.displayName
		})),
		...selectedScripts.map((script) => ({
			type: 'script' as const,
			id: script.id,
			name: script.displayName
		}))
	]);

	// ─── Selection Helpers ───────────────────────────────────────────
	function isAppSelected(appId: string): boolean {
		return selectedApps.some((a) => a.id === appId);
	}

	function isProfileSelected(profileId: string): boolean {
		return selectedProfiles.some((p) => p.id === profileId);
	}

	function toggleApp(app: MobileApp): void {
		if (isAppSelected(app.id)) {
			onUpdateApps(selectedApps.filter((a) => a.id !== app.id));
		} else {
			onUpdateApps([...selectedApps, app]);
		}
	}

	function toggleProfile(profile: ConfigurationPolicy): void {
		if (isProfileSelected(profile.id)) {
			onUpdateProfiles(selectedProfiles.filter((p) => p.id !== profile.id));
		} else {
			onUpdateProfiles([...selectedProfiles, profile]);
		}
	}

	function removeApp(appId: string): void {
		onUpdateApps(selectedApps.filter((a) => a.id !== appId));
	}

	function removeProfile(profileId: string): void {
		onUpdateProfiles(selectedProfiles.filter((p) => p.id !== profileId));
	}

	function isComplianceSelected(policyId: string): boolean {
		return selectedCompliancePolicies.some((p) => p.id === policyId);
	}

	function toggleCompliance(policy: DeviceCompliancePolicy): void {
		if (isComplianceSelected(policy.id)) {
			onUpdateCompliancePolicies(selectedCompliancePolicies.filter((p) => p.id !== policy.id));
		} else {
			onUpdateCompliancePolicies([...selectedCompliancePolicies, policy]);
		}
	}

	function removeCompliance(policyId: string): void {
		onUpdateCompliancePolicies(selectedCompliancePolicies.filter((p) => p.id !== policyId));
	}

	function isSecuritySelected(policyId: string): boolean {
		return selectedSecurityPolicies.some((p) => p.id === policyId);
	}

	function toggleSecurity(policy: ConfigurationPolicy): void {
		if (isSecuritySelected(policy.id)) {
			onUpdateSecurityPolicies(selectedSecurityPolicies.filter((p) => p.id !== policy.id));
		} else {
			onUpdateSecurityPolicies([...selectedSecurityPolicies, policy]);
		}
	}

	function removeSecurity(policyId: string): void {
		onUpdateSecurityPolicies(selectedSecurityPolicies.filter((p) => p.id !== policyId));
	}

	function isUpdateRingSelected(id: string): boolean {
		return selectedUpdateRings.some((r) => r.id === id);
	}

	function toggleUpdateRing(ring: WindowsUpdateForBusinessConfiguration): void {
		if (isUpdateRingSelected(ring.id)) {
			onUpdateUpdateRings(selectedUpdateRings.filter((r) => r.id !== ring.id));
		} else {
			onUpdateUpdateRings([...selectedUpdateRings, ring]);
		}
	}

	function removeUpdateRing(id: string): void {
		onUpdateUpdateRings(selectedUpdateRings.filter((r) => r.id !== id));
	}

	function isRemediationSelected(id: string): boolean {
		return selectedRemediations.some((s) => s.id === id);
	}

	function toggleRemediation(script: DeviceHealthScript): void {
		if (isRemediationSelected(script.id)) {
			onUpdateRemediations(selectedRemediations.filter((s) => s.id !== script.id));
		} else {
			onUpdateRemediations([...selectedRemediations, script]);
		}
	}

	function removeRemediation(id: string): void {
		onUpdateRemediations(selectedRemediations.filter((s) => s.id !== id));
	}

	function isScriptSelected(id: string): boolean {
		return selectedScripts.some((s) => s.id === id);
	}

	function toggleScript(script: DeviceManagementScript): void {
		if (isScriptSelected(script.id)) {
			onUpdateScripts(selectedScripts.filter((s) => s.id !== script.id));
		} else {
			onUpdateScripts([...selectedScripts, script]);
		}
	}

	function removeScript(id: string): void {
		onUpdateScripts(selectedScripts.filter((s) => s.id !== id));
	}

	// ─── Data Fetching ───────────────────────────────────────────────
	async function fetchApps(): Promise<void> {
		loadingApps = true;
		appsError = null;
		try {
			const client = getGraphClient();
			const result = await listApps(client, { orderBy: 'displayName' });
			onAppsLoaded(result);
		} catch (err) {
			appsError = toFriendlyMessage(err);
		} finally {
			loadingApps = false;
		}
	}

	async function fetchProfiles(): Promise<void> {
		loadingProfiles = true;
		profilesError = null;
		try {
			const client = getGraphClient();
			const result = await listConfigPolicies(client);
			onProfilesLoaded(result);
		} catch (err) {
			profilesError = toFriendlyMessage(err);
		} finally {
			loadingProfiles = false;
		}
	}

	async function fetchCompliancePolicies(): Promise<void> {
		loadingCompliance = true;
		complianceError = null;
		try {
			const client = getGraphClient();
			const result = await listCompliancePolicies(client);
			onCompliancePoliciesLoaded(result);
		} catch (err) {
			complianceError = toFriendlyMessage(err);
		} finally {
			loadingCompliance = false;
		}
	}

	async function fetchSecurityPolicies(): Promise<void> {
		loadingSecurity = true;
		securityError = null;
		try {
			const client = getGraphClient();
			const result = await listSecurityPolicies(client);
			onSecurityPoliciesLoaded(result);
		} catch (err) {
			securityError = toFriendlyMessage(err);
		} finally {
			loadingSecurity = false;
		}
	}

	async function fetchUpdateRings(): Promise<void> {
		loadingUpdateRings = true;
		updateRingsError = null;
		try {
			const client = getGraphClient();
			const result = await listUpdateRings(client);
			onUpdateRingsLoaded(result);
		} catch (err) {
			updateRingsError = toFriendlyMessage(err);
		} finally {
			loadingUpdateRings = false;
		}
	}

	async function fetchRemediations(): Promise<void> {
		loadingRemediations = true;
		remediationsError = null;
		try {
			const client = getGraphClient();
			const result = await listRemediationScripts(client);
			onRemediationsLoaded(result);
		} catch (err) {
			remediationsError = toFriendlyMessage(err);
		} finally {
			loadingRemediations = false;
		}
	}

	async function fetchScripts(): Promise<void> {
		loadingScripts = true;
		scriptsError = null;
		try {
			const client = getGraphClient();
			const result = await listScripts(client);
			onScriptsLoaded(result);
		} catch (err) {
			scriptsError = toFriendlyMessage(err);
		} finally {
			loadingScripts = false;
		}
	}

	// ─── Pre-selection ───────────────────────────────────────────────
	async function handlePreselection(): Promise<void> {
		if (hasPreselected) return;
		hasPreselected = true;

		const client = getGraphClient();

		if (preselectedAppId) {
			activeTab = 'apps';
			const existing = apps.find((a) => a.id === preselectedAppId);
			if (existing) {
				if (!isAppSelected(existing.id)) {
					onUpdateApps([...selectedApps, existing]);
				}
			} else {
				try {
					const app = await getApp(client, preselectedAppId);
					if (!isAppSelected(app.id)) {
						onUpdateApps([...selectedApps, app]);
					}
				} catch {
					// Pre-selection failed silently
				}
			}
		}

		if (preselectedProfileId) {
			if (!preselectedAppId) activeTab = 'profiles';
			const existing = profiles.find((p) => p.id === preselectedProfileId);
			if (existing) {
				if (!isProfileSelected(existing.id)) {
					onUpdateProfiles([...selectedProfiles, existing]);
				}
			} else {
				try {
					const profile = await getConfigPolicy(client, preselectedProfileId);
					if (!isProfileSelected(profile.id)) {
						onUpdateProfiles([...selectedProfiles, profile]);
					}
				} catch {
					// Pre-selection failed silently
				}
			}
		}

		if (preselectedCompliancePolicyId) {
			if (!preselectedAppId && !preselectedProfileId) activeTab = 'compliance';
			const existing = compliancePolicies.find(
				(p) => p.id === preselectedCompliancePolicyId
			);
			if (existing) {
				if (!isComplianceSelected(existing.id)) {
					onUpdateCompliancePolicies([...selectedCompliancePolicies, existing]);
				}
			} else {
				try {
					const policy = await getCompliancePolicy(client, preselectedCompliancePolicyId);
					if (!isComplianceSelected(policy.id)) {
						onUpdateCompliancePolicies([...selectedCompliancePolicies, policy]);
					}
				} catch {
					// Pre-selection failed silently
				}
			}
		}

		if (preselectedSecurityPolicyId) {
			if (!preselectedAppId && !preselectedProfileId && !preselectedCompliancePolicyId)
				activeTab = 'security';
			const existing = securityPolicies.find(
				(p) => p.id === preselectedSecurityPolicyId
			);
			if (existing) {
				if (!isSecuritySelected(existing.id)) {
					onUpdateSecurityPolicies([...selectedSecurityPolicies, existing]);
				}
			} else {
				try {
					const { getConfigPolicy } = await import('$lib/graph/configurations');
					const policy = await getConfigPolicy(client, preselectedSecurityPolicyId);
					if (!isSecuritySelected(policy.id)) {
						onUpdateSecurityPolicies([...selectedSecurityPolicies, policy]);
					}
				} catch {
					// Pre-selection failed silently
				}
			}
		}
	}

	// ─── Effects ─────────────────────────────────────────────────────
	$effect(() => {
		if (apps.length === 0) {
			fetchApps();
		}
	});

	$effect(() => {
		if (profiles.length === 0) {
			fetchProfiles();
		}
	});

	$effect(() => {
		if (compliancePolicies.length === 0) {
			fetchCompliancePolicies();
		}
	});

	$effect(() => {
		if (securityPolicies.length === 0) {
			fetchSecurityPolicies();
		}
	});

	$effect(() => {
		if (updateRings.length === 0) {
			fetchUpdateRings();
		}
	});

	$effect(() => {
		if (remediations.length === 0) {
			fetchRemediations();
		}
	});

	$effect(() => {
		if (scripts.length === 0) {
			fetchScripts();
		}
	});

	$effect(() => {
		if (
			(preselectedAppId || preselectedProfileId || preselectedCompliancePolicyId || preselectedSecurityPolicyId) &&
			!hasPreselected &&
			(apps.length > 0 ||
				profiles.length > 0 ||
				compliancePolicies.length > 0 ||
				securityPolicies.length > 0 ||
				!loadingApps ||
				!loadingProfiles ||
				!loadingCompliance ||
				!loadingSecurity)
		) {
			handlePreselection();
		}
	});
</script>

<!-- Tabs with animated underline -->
<div class="mb-4">
	<Tabs {tabs} active={activeTab} onchange={(id) => (activeTab = id)} />
</div>

<!-- Selected Items Chips -->
{#if allSelected.length > 0}
	<div class="mb-3 flex flex-wrap gap-2">
		{#each allSelected as chip (chip.type + chip.id)}
			<span
				class="bg-accent-light text-accent inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
			>
				{chip.name}
				<button
					type="button"
					class="hover:bg-accent/10 ml-0.5 rounded-full p-0.5 transition-colors"
					aria-label="Remove {chip.name}"
					onclick={() => {
						if (chip.type === 'app') removeApp(chip.id);
						else if (chip.type === 'compliance') removeCompliance(chip.id);
						else if (chip.type === 'security') removeSecurity(chip.id);
						else if (chip.type === 'updateRing') removeUpdateRing(chip.id);
						else if (chip.type === 'remediation') removeRemediation(chip.id);
						else if (chip.type === 'script') removeScript(chip.id);
						else removeProfile(chip.id);
					}}
				>
					<X size={14} />
				</button>
			</span>
		{/each}
	</div>
{/if}

<!-- Tab Panels -->
{#if activeTab === 'apps'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput placeholder="Search apps by name..." bind:value={appSearch} />
		</div>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<MultiSelectFilter
				label="Platform"
				options={APP_PLATFORM_OPTIONS}
				bind:selected={appPlatformFilter}
			/>
			<MultiSelectFilter label="App Type" options={appTypeOptions} bind:selected={appTypeFilter} />
			<div class="flex gap-1" role="radiogroup" aria-label="Assignment status">
				{#each appStatusOptions as option (option.id)}
					<button
						type="button"
						role="radio"
						aria-checked={appAssignmentStatus === option.id}
						onclick={() => (appAssignmentStatus = option.id)}
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {appAssignmentStatus ===
						option.id
							? 'border-accent bg-accent text-white'
							: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		{#if appsError}
			<div class="mb-4">
				<ErrorState message={appsError} onretry={fetchApps} />
			</div>
		{/if}

		{#if loadingApps}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<Skeleton width="1.125rem" height="1.125rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredApps.length === 0 && appSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No apps match your search"
				description="Try a different search term or clear your filter."
			/>
		{:else if apps.length === 0 && !appsError}
			<EmptyState
				icon={Package}
				title="No applications found"
				description="Your Intune tenant doesn't have any mobile apps configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredApps as app (app.id)}
					{@const typeInfo = getAppTypeInfo(app['@odata.type'])}
					{@const Icon = typeInfo.icon}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isAppSelected(app.id)}
							onchange={() => toggleApp(app)}
						/>
						<Icon size={18} class="text-muted shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{app.displayName}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{typeInfo.label}
								{#if app.publisher}
									&middot; {app.publisher}
								{/if}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'profiles'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput placeholder="Search profiles by name..." bind:value={profileSearch} />
		</div>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<MultiSelectFilter
				label="Platform"
				options={PROFILE_PLATFORM_OPTIONS}
				bind:selected={profilePlatformFilter}
			/>
			<MultiSelectFilter
				label="Technology"
				options={PROFILE_TECHNOLOGY_OPTIONS}
				bind:selected={profileTechnologyFilter}
			/>
			<div class="flex gap-1" role="radiogroup" aria-label="Assignment status">
				{#each profileStatusOptions as option (option.id)}
					<button
						type="button"
						role="radio"
						aria-checked={profileAssignmentStatus === option.id}
						onclick={() => (profileAssignmentStatus = option.id)}
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {profileAssignmentStatus ===
						option.id
							? 'border-accent bg-accent text-white'
							: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		{#if profilesError}
			<div class="mb-4">
				<ErrorState message={profilesError} onretry={fetchProfiles} />
			</div>
		{/if}

		{#if loadingProfiles}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<Skeleton width="1.125rem" height="1.125rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredProfiles.length === 0 && profileSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No profiles match your search"
				description="Try a different search term or clear your filter."
			/>
		{:else if profiles.length === 0 && !profilesError}
			<EmptyState
				icon={Package}
				title="No configuration profiles found"
				description="Your Intune tenant doesn't have any configuration policies configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredProfiles as profile (profile.id)}
					{@const typeInfo = getProfileTypeInfo(profile.platforms, profile.technologies)}
					{@const Icon = typeInfo.icon}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isProfileSelected(profile.id)}
							onchange={() => toggleProfile(profile)}
						/>
						<Icon size={18} class="text-muted shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{profile.name}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{typeInfo.label}
								&middot; {profile.settingCount} setting{profile.settingCount !== 1 ? 's' : ''}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'compliance'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput
				placeholder="Search compliance policies by name..."
				bind:value={complianceSearch}
			/>
		</div>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<MultiSelectFilter
				label="Platform"
				options={COMPLIANCE_PLATFORM_OPTIONS}
				bind:selected={compliancePlatformFilter}
			/>
			<div class="flex gap-1" role="radiogroup" aria-label="Assignment status">
				{#each complianceStatusOptions as option (option.id)}
					<button
						type="button"
						role="radio"
						aria-checked={complianceAssignmentStatus === option.id}
						onclick={() => (complianceAssignmentStatus = option.id)}
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {complianceAssignmentStatus ===
						option.id
							? 'border-accent bg-accent text-white'
							: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		{#if complianceError}
			<div class="mb-4">
				<ErrorState message={complianceError} onretry={fetchCompliancePolicies} />
			</div>
		{/if}

		{#if loadingCompliance}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<Skeleton width="1.125rem" height="1.125rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredCompliance.length === 0 && complianceSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No policies match your search"
				description="Try a different search term or clear your filter."
			/>
		{:else if compliancePolicies.length === 0 && !complianceError}
			<EmptyState
				icon={Package}
				title="No compliance policies found"
				description="Your Intune tenant doesn't have any compliance policies configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredCompliance as policy (policy.id)}
					{@const platformInfo = getCompliancePlatformInfo(policy['@odata.type'])}
					{@const Icon = platformInfo.icon}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isComplianceSelected(policy.id)}
							onchange={() => toggleCompliance(policy)}
						/>
						<Icon size={18} class="text-muted shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{policy.displayName}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{platformInfo.label}
								&middot; v{policy.version}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'security'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput
				placeholder="Search endpoint security policies by name..."
				bind:value={securitySearch}
			/>
		</div>
		<div class="mb-3 flex flex-wrap items-center gap-2">
			<MultiSelectFilter
				label="Category"
				options={SECURITY_CATEGORY_OPTIONS}
				bind:selected={securityCategoryFilter}
			/>
			<div class="flex gap-1" role="radiogroup" aria-label="Assignment status">
				{#each securityStatusOptions as option (option.id)}
					<button
						type="button"
						role="radio"
						aria-checked={securityAssignmentStatus === option.id}
						onclick={() => (securityAssignmentStatus = option.id)}
						class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {securityAssignmentStatus ===
						option.id
							? 'border-accent bg-accent text-white'
							: 'border-border text-ink-faint hover:border-accent hover:text-accent'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		{#if securityError}
			<div class="mb-4">
				<ErrorState message={securityError} onretry={fetchSecurityPolicies} />
			</div>
		{/if}

		{#if loadingSecurity}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<Skeleton width="1.125rem" height="1.125rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredSecurity.length === 0 && securitySearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No policies match your search"
				description="Try a different search term or clear your filter."
			/>
		{:else if securityPolicies.length === 0 && !securityError}
			<EmptyState
				icon={Package}
				title="No endpoint security policies found"
				description="Your Intune tenant doesn't have any endpoint security policies configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredSecurity as policy (policy.id)}
					{@const categoryInfo = getSecurityCategoryInfo(policy.templateReference?.templateFamily ?? '')}
					{@const Icon = categoryInfo?.icon ?? Package}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isSecuritySelected(policy.id)}
							onchange={() => toggleSecurity(policy)}
						/>
						<Icon size={18} class="text-muted shrink-0" />
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{policy.name}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{categoryInfo?.label ?? 'Endpoint Security'}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'updateRings'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput
				placeholder="Search update rings by name..."
				bind:value={updateRingSearch}
			/>
		</div>

		{#if updateRingsError}
			<div class="mb-4">
				<ErrorState message={updateRingsError} onretry={fetchUpdateRings} />
			</div>
		{/if}

		{#if loadingUpdateRings}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _, i (i)}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredUpdateRings.length === 0 && updateRingSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No update rings match your search"
				description="Try a different search term."
			/>
		{:else if updateRings.length === 0 && !updateRingsError}
			<EmptyState
				icon={Package}
				title="No update rings found"
				description="Your Intune tenant doesn't have any Windows update rings configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredUpdateRings as ring (ring.id)}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isUpdateRingSelected(ring.id)}
							onchange={() => toggleUpdateRing(ring)}
						/>
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{ring.displayName}
							</p>
							<p class="text-ink-faint truncate text-xs">
								Quality: {ring.qualityUpdatesDeferralPeriodInDays ?? 0}d, Feature: {ring.featureUpdatesDeferralPeriodInDays ?? 0}d
								{#if ring.qualityUpdatesPaused || ring.featureUpdatesPaused}
									<span class="text-warning ml-1">Paused</span>
								{/if}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'remediations'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput
				placeholder="Search remediation scripts by name..."
				bind:value={remediationSearch}
			/>
		</div>

		{#if remediationsError}
			<div class="mb-4">
				<ErrorState message={remediationsError} onretry={fetchRemediations} />
			</div>
		{/if}

		{#if loadingRemediations}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _, i (i)}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredRemediations.length === 0 && remediationSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No scripts match your search"
				description="Try a different search term."
			/>
		{:else if remediations.length === 0 && !remediationsError}
			<EmptyState
				icon={Package}
				title="No remediation scripts found"
				description="Your Intune tenant doesn't have any proactive remediation scripts configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredRemediations as script (script.id)}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isRemediationSelected(script.id)}
							onchange={() => toggleRemediation(script)}
						/>
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{script.displayName}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{script.publisher ?? 'No publisher'}
								{#if script.isGlobalScript}
									<span class="bg-accent-light text-accent ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium">Global</span>
								{/if}
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{:else if activeTab === 'scripts'}
	<div role="tabpanel">
		<div class="mb-3">
			<SearchInput
				placeholder="Search platform scripts by name..."
				bind:value={scriptSearch}
			/>
		</div>

		{#if scriptsError}
			<div class="mb-4">
				<ErrorState message={scriptsError} onretry={fetchScripts} />
			</div>
		{/if}

		{#if loadingScripts}
			<div class="border-border space-y-2 rounded-lg border p-2">
				{#each Array(6) as _, i (i)}
					<div class="flex items-center gap-3 px-2 py-2">
						<Skeleton width="1rem" height="1rem" rounded="sm" />
						<div class="flex-1 space-y-1">
							<Skeleton width="50%" height="0.875rem" />
							<Skeleton width="30%" height="0.625rem" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredScripts.length === 0 && scriptSearch.trim() !== ''}
			<EmptyState
				icon={Search}
				title="No scripts match your search"
				description="Try a different search term."
			/>
		{:else if scripts.length === 0 && !scriptsError}
			<EmptyState
				icon={Package}
				title="No platform scripts found"
				description="Your Intune tenant doesn't have any device management scripts configured."
			/>
		{:else}
			<div class="border-border max-h-96 overflow-y-auto rounded-lg border">
				{#each filteredScripts as script (script.id)}
					<label
						class="border-border hover:bg-canvas flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
					>
						<input
							type="checkbox"
							class="accent-accent h-4 w-4 rounded"
							checked={isScriptSelected(script.id)}
							onchange={() => toggleScript(script)}
						/>
						<div class="min-w-0 flex-1">
							<p class="text-ink truncate text-sm font-medium">
								{script.displayName}
							</p>
							<p class="text-ink-faint truncate text-xs">
								{script.fileName ?? ''}
								<span class="ml-1">{script.runAsAccount === 'system' ? 'System' : 'User'}</span>
							</p>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{/if}
