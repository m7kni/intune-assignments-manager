<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Upload } from 'lucide-svelte';
	import { page } from '$app/state';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Stepper from '$lib/components/ui/Stepper.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import StepSelectItems from '$lib/components/assignments/StepSelectItems.svelte';
	import StepSelectGroups from '$lib/components/assignments/StepSelectGroups.svelte';
	import StepConfigure from '$lib/components/assignments/StepConfigure.svelte';
	import StepReview from '$lib/components/assignments/StepReview.svelte';
	import StepResults from '$lib/components/assignments/StepResults.svelte';
	import CsvImportDialog from '$lib/components/csv/CsvImportDialog.svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { getApp } from '$lib/graph/apps';
	import { getConfigPolicy } from '$lib/graph/configurations';
	import { notifySuccess, notifyWarning, notifyError } from '$lib/stores/notifications.svelte';
	import { executeBulkAssignment } from '$lib/graph/execute';
	import type { ValidatedImportRow } from '$lib/utils/csv-assignments';
	import {
		WIZARD_STEPS,
		createDefaultWizardState,
		type WizardState,
		type GroupTarget,
		type FilterConfig,
		type AssignmentConflict,
		type AssignmentResult,
		type BulkProgress,
		type ConflictChoice
	} from '$lib/types/wizard';
	import type { MobileApp, ConfigurationPolicy, AssignmentIntent } from '$lib/types/graph';
	import type { DeviceCompliancePolicy } from '$lib/types/compliance';
	import { getCompliancePolicy } from '$lib/graph/compliance';

	// ─── CSV Import ───────────────────────────────────────────────
	let importDialogOpen = $state(false);

	// ─── Confirmation Dialog ──────────────────────────────────────
	let confirmDialogOpen = $state(false);

	// ─── Wizard State ──────────────────────────────────────────────
	let wizard: WizardState = $state(createDefaultWizardState());
	let currentStepIndex = $state(0);
	let conflicts: AssignmentConflict[] = $state([]);
	let executionProgress: BulkProgress | null = $state(null);
	let executionResults: AssignmentResult[] = $state([]);
	let executing = $state(false);
	let executionError: string | null = $state(null);

	// Lifted data caches (survive back-navigation)
	let cachedApps: MobileApp[] = $state([]);
	let cachedProfiles: ConfigurationPolicy[] = $state([]);
	let cachedCompliancePolicies: DeviceCompliancePolicy[] = $state([]);
	let cachedSecurityPolicies: ConfigurationPolicy[] = $state([]);

	// ─── URL Param Pre-selection ───────────────────────────────────
	const preselectedAppId = page.url.searchParams.get('appId');
	const preselectedProfileId = page.url.searchParams.get('profileId');
	const preselectedCompliancePolicyId = page.url.searchParams.get('compliancePolicyId');
	const preselectedSecurityPolicyId = page.url.searchParams.get('securityPolicyId');

	// ─── Step Validation ───────────────────────────────────────────
	const canProceed = $derived.by(() => {
		switch (currentStepIndex) {
			case 0:
				return (
					wizard.selectedApps.length > 0 ||
					wizard.selectedProfiles.length > 0 ||
					wizard.selectedCompliancePolicies.length > 0 ||
					wizard.selectedSecurityPolicies.length > 0
				);
			case 1:
				return wizard.selectedGroups.length > 0;
			case 2:
				return true;
			case 3:
				return true;
			default:
				return false;
		}
	});

	const nextLabel = $derived.by(() => {
		switch (currentStepIndex) {
			case 2:
				return 'Review Changes';
			case 3:
				return 'Apply Assignments';
			default:
				return 'Next';
		}
	});

	const totalSelected = $derived(
		wizard.selectedApps.length +
			wizard.selectedProfiles.length +
			wizard.selectedCompliancePolicies.length +
			wizard.selectedSecurityPolicies.length
	);

	// Step transition direction
	let direction = $state<'forward' | 'back'>('forward');

	// ─── Navigation ────────────────────────────────────────────────
	function goNext(): void {
		if (!canProceed || currentStepIndex >= WIZARD_STEPS.length - 1) return;

		if (currentStepIndex === 3) {
			// Show confirmation dialog before applying
			confirmDialogOpen = true;
			return;
		}

		direction = 'forward';
		currentStepIndex++;
	}

	function goBack(): void {
		if (currentStepIndex > 0) {
			direction = 'back';
			currentStepIndex--;
		}
	}

	function handleConfirmApply() {
		confirmDialogOpen = false;
		executeAssignments();
	}

	function resetWizard(): void {
		wizard = createDefaultWizardState();
		currentStepIndex = 0;
		conflicts = [];
		executionProgress = null;
		executionResults = [];
		executing = false;
		executionError = null;
	}

	// ─── State Update Callbacks ────────────────────────────────────
	function updateApps(apps: MobileApp[]): void {
		wizard.selectedApps = apps;
	}

	function updateProfiles(profiles: ConfigurationPolicy[]): void {
		wizard.selectedProfiles = profiles;
	}

	function updateCompliancePolicies(policies: DeviceCompliancePolicy[]): void {
		wizard.selectedCompliancePolicies = policies;
	}

	function updateSecurityPolicies(policies: ConfigurationPolicy[]): void {
		wizard.selectedSecurityPolicies = policies;
	}

	function updateGroups(groups: GroupTarget[]): void {
		wizard.selectedGroups = groups;
	}

	function updateExclusionGroups(groups: GroupTarget[]): void {
		wizard.exclusionGroups = groups;
	}

	function updateIntent(intent: AssignmentIntent): void {
		wizard.intent = intent;
	}

	function updateFilter(config: FilterConfig | null): void {
		wizard.filterConfig = config;
	}

	function updateConflicts(c: AssignmentConflict[]): void {
		conflicts = c;
	}

	// ─── Execution ─────────────────────────────────────────────────
	async function executeAssignments(): Promise<void> {
		currentStepIndex = 4;
		executing = true;
		executionError = null;
		executionResults = [];
		executionProgress = null;

		const items = [
			...wizard.selectedApps.map((a) => ({
				kind: 'app' as const,
				id: a.id,
				displayName: a.displayName
			})),
			...wizard.selectedProfiles.map((p) => ({
				kind: 'profile' as const,
				id: p.id,
				displayName: p.name
			})),
			...wizard.selectedCompliancePolicies.map((p) => ({
				kind: 'compliance' as const,
				id: p.id,
				displayName: p.displayName
			})),
			...wizard.selectedSecurityPolicies.map((p) => ({
				kind: 'security' as const,
				id: p.id,
				displayName: p.name
			}))
		];

		const conflictChoices: ConflictChoice[] = conflicts.map((c) => ({
			itemId: c.itemId,
			targetKey: c.targetKey,
			resolution: c.resolution
		}));

		try {
			const result = await executeBulkAssignment({
				client: getGraphClient(),
				items,
				groups: wizard.selectedGroups,
				exclusionGroups: wizard.exclusionGroups,
				intent: wizard.intent,
				filter: wizard.filterConfig,
				conflicts: conflictChoices,
				onProgress: (p) => {
					executionProgress = p;
				}
			});
			executionResults = result.results;

			const successCount = result.results.filter((r) => r.status === 'success').length;
			const errorCount = result.results.filter((r) => r.status === 'error').length;

			if (errorCount === 0) {
				notifySuccess(
					'Assignments applied',
					`${successCount} item${successCount !== 1 ? 's' : ''} assigned successfully`
				);
			} else if (successCount > 0) {
				notifyWarning('Partial success', `${successCount} succeeded, ${errorCount} failed`);
			} else {
				notifyError('Assignment failed', 'All assignments failed. Check the results for details.');
			}
		} catch (err) {
			executionError = toFriendlyMessage(err);
			notifyError('Assignment failed', executionError);
		} finally {
			executing = false;
		}
	}

	function retryFailed(): void {
		executeAssignments();
	}

	// ─── CSV Import Handler ───────────────────────────────────────
	async function handleImport(rows: ValidatedImportRow[]): Promise<void> {
		importDialogOpen = false;
		const client = getGraphClient();

		try {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const itemMap = new Map<string, ValidatedImportRow[]>();
			for (const row of rows) {
				const key = row.resolvedItemId;
				if (!itemMap.has(key)) itemMap.set(key, []);
				itemMap.get(key)!.push(row);
			}

			const apps: MobileApp[] = [];
			const profiles: ConfigurationPolicy[] = [];
			const compliancePolicies: DeviceCompliancePolicy[] = [];
			const securityPolicies: ConfigurationPolicy[] = [];

			for (const [itemId, itemRows] of itemMap) {
				const itemType = itemRows[0].itemType;
				if (itemType === 'app') {
					apps.push(await getApp(client, itemId));
				} else if (itemType === 'compliance') {
					compliancePolicies.push(await getCompliancePolicy(client, itemId));
				} else if (itemType === 'security') {
					securityPolicies.push(await getConfigPolicy(client, itemId));
				} else {
					profiles.push(await getConfigPolicy(client, itemId));
				}
			}

			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const groupMap = new Map<string, GroupTarget>();
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const exclusionMap = new Map<string, GroupTarget>();

			for (const row of rows) {
				if (row.targetType === 'allDevices') {
					groupMap.set('allDevices', { type: 'allDevices', displayName: 'All Devices' });
				} else if (row.targetType === 'allUsers') {
					groupMap.set('allUsers', { type: 'allUsers', displayName: 'All Users' });
				} else if (row.targetType === 'group') {
					groupMap.set(row.resolvedGroupId, {
						type: 'group',
						groupId: row.resolvedGroupId,
						displayName: row.groupName || row.resolvedGroupId
					});
				} else if (row.targetType === 'exclusion') {
					exclusionMap.set(row.resolvedGroupId, {
						type: 'group',
						groupId: row.resolvedGroupId,
						displayName: row.groupName || row.resolvedGroupId
					});
				}
			}

			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const intentCounts = new Map<string, number>();
			for (const row of rows) {
				const intent = row.intent || 'required';
				intentCounts.set(intent, (intentCounts.get(intent) ?? 0) + 1);
			}
			let bestIntent: AssignmentIntent = 'required';
			let bestCount = 0;
			for (const [intent, count] of intentCounts) {
				if (count > bestCount) {
					bestIntent = intent as AssignmentIntent;
					bestCount = count;
				}
			}

			let filterConfig: FilterConfig | null = null;
			const filtersUsed = rows.filter((r) => r.resolvedFilterId);
			if (filtersUsed.length > 0) {
				const firstFilter = filtersUsed[0];
				const allSame = filtersUsed.every(
					(r) => r.resolvedFilterId === firstFilter.resolvedFilterId
				);
				if (allSame && firstFilter.resolvedFilterId) {
					filterConfig = {
						filterId: firstFilter.resolvedFilterId,
						filterName: firstFilter.filterName,
						filterType: (firstFilter.filterMode as 'include' | 'exclude') || 'include'
					};
				}
			}

			wizard = {
				selectedApps: apps,
				selectedProfiles: profiles,
				selectedCompliancePolicies: compliancePolicies,
				selectedSecurityPolicies: securityPolicies,
				selectedGroups: Array.from(groupMap.values()),
				exclusionGroups: Array.from(exclusionMap.values()),
				intent: bestIntent,
				filterConfig,
				replaceMode: false,
				replaceConfig: {
					appIntents: [],
					policyInclusions: false,
					policyExclusions: false
				}
			};

			currentStepIndex = 3;
			notifySuccess(
				'CSV imported',
				`Loaded ${rows.length} assignment${rows.length !== 1 ? 's' : ''} — review before applying.`
			);
		} catch (err) {
			notifyError('Import failed', toFriendlyMessage(err));
		}
	}
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<div class="mb-6 flex items-start justify-between">
			<PageHeader
				title="Bulk Assign"
				description="Assign multiple apps and profiles to groups simultaneously."
			/>
			<Button variant="secondary" icon={Upload} onclick={() => (importDialogOpen = true)}>
				Import CSV
			</Button>
		</div>

		<CsvImportDialog
			open={importDialogOpen}
			onClose={() => (importDialogOpen = false)}
			onImport={handleImport}
		/>

		<ConfirmDialog
			open={confirmDialogOpen}
			title="Apply Assignments"
			message="This will apply the configured assignments to all selected items and groups. This action cannot be easily undone."
			confirmLabel="Apply Assignments"
			onConfirm={handleConfirmApply}
			onCancel={() => (confirmDialogOpen = false)}
		/>

		{#if currentStepIndex < 4}
			<div class="mb-6">
				<Stepper steps={WIZARD_STEPS} {currentStepIndex} />
			</div>
		{/if}

		<!-- Step content with direction-aware transition -->
		{#key currentStepIndex}
			<div class="panel mb-6" in:fly={{ x: direction === 'forward' ? 30 : -30, duration: 200 }}>
				{#if currentStepIndex === 0}
					<StepSelectItems
						selectedApps={wizard.selectedApps}
						selectedProfiles={wizard.selectedProfiles}
						selectedCompliancePolicies={wizard.selectedCompliancePolicies}
						selectedSecurityPolicies={wizard.selectedSecurityPolicies}
						{preselectedAppId}
						{preselectedProfileId}
						preselectedCompliancePolicyId={preselectedCompliancePolicyId}
						preselectedSecurityPolicyId={preselectedSecurityPolicyId}
						apps={cachedApps}
						profiles={cachedProfiles}
						compliancePolicies={cachedCompliancePolicies}
						securityPolicies={cachedSecurityPolicies}
						onUpdateApps={updateApps}
						onUpdateProfiles={updateProfiles}
						onUpdateCompliancePolicies={updateCompliancePolicies}
						onUpdateSecurityPolicies={updateSecurityPolicies}
						onAppsLoaded={(apps) => (cachedApps = apps)}
						onProfilesLoaded={(profiles) => (cachedProfiles = profiles)}
						onCompliancePoliciesLoaded={(policies) => (cachedCompliancePolicies = policies)}
						onSecurityPoliciesLoaded={(policies) => (cachedSecurityPolicies = policies)}
					/>
				{:else if currentStepIndex === 1}
					<StepSelectGroups
						selectedGroups={wizard.selectedGroups}
						exclusionGroups={wizard.exclusionGroups}
						onUpdateGroups={updateGroups}
						onUpdateExclusionGroups={updateExclusionGroups}
					/>
				{:else if currentStepIndex === 2}
					<StepConfigure
						intent={wizard.intent}
						filterConfig={wizard.filterConfig}
						selectedApps={wizard.selectedApps}
						selectedProfiles={wizard.selectedProfiles}
						selectedCompliancePolicies={wizard.selectedCompliancePolicies}
						selectedSecurityPolicies={wizard.selectedSecurityPolicies}
						selectedGroups={wizard.selectedGroups}
						onUpdateIntent={updateIntent}
						onUpdateFilter={updateFilter}
					/>
				{:else if currentStepIndex === 3}
					<StepReview {wizard} {conflicts} onUpdateConflicts={updateConflicts} />
				{:else if currentStepIndex === 4}
					<StepResults
						progress={executionProgress}
						results={executionResults}
						{executing}
						{executionError}
						onRetry={retryFailed}
						onReset={resetWizard}
					/>
				{/if}
			</div>
		{/key}

		{#if currentStepIndex < 4}
			<div class="flex items-center justify-between">
				<Button variant="secondary" onclick={goBack} disabled={currentStepIndex === 0}>Back</Button>

				<div class="flex items-center gap-3">
					{#if totalSelected > 0 && currentStepIndex === 0}
						<span class="text-muted text-xs"
							>{totalSelected} item{totalSelected !== 1 ? 's' : ''} selected</span
						>
					{/if}
					<Button
						variant={currentStepIndex === 3 ? 'primary' : 'primary'}
						onclick={goNext}
						disabled={!canProceed}
					>
						{nextLabel}
					</Button>
				</div>
			</div>
		{/if}
	</div>
</AuthGuard>
