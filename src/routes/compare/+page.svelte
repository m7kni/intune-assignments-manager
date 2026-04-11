<script lang="ts">
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import PolicySelector from '$lib/components/compare/PolicySelector.svelte';
	import ComparisonSummaryBar from '$lib/components/compare/ComparisonSummaryBar.svelte';
	import SettingDiffRow from '$lib/components/compare/SettingDiffRow.svelte';
	import AssignmentDiffTable from '$lib/components/compare/AssignmentDiffTable.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { GitCompareArrows, ArrowRightLeft, Download } from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { listConfigPolicies, getConfigPolicySettings, getConfigAssignments } from '$lib/graph/configurations';
	import { listCompliancePolicies, getCompliancePolicyAssignments } from '$lib/graph/compliance';
	import { listSecurityPolicies, getSecurityPolicySettings, getConfigAssignments as getSecurityAssignments } from '$lib/graph/security';
	import {
		comparePolicySettings,
		comparePolicyAssignments,
		generateComparisonSummary
	} from '$lib/utils/policy-compare';
	import { serializeCsv } from '$lib/utils/csv';
	import { downloadCsv } from '$lib/utils/csv-download';
	import type { PolicyType, ComparisonStatus, PolicyComparisonResult } from '$lib/types/compare';

	// ─── Selection State ──────────────────────────────────────────

	const policyTypes: { id: PolicyType; label: string }[] = [
		{ id: 'configProfile', label: 'Config Profiles' },
		{ id: 'compliance', label: 'Compliance Policies' },
		{ id: 'security', label: 'Endpoint Security' }
	];

	let selectedType = $state<PolicyType>('configProfile');
	let leftPolicyId = $state<string | null>(null);
	let rightPolicyId = $state<string | null>(null);

	// ─── Policy List State ────────────────────────────────────────

	interface PolicyItem {
		id: string;
		displayName: string;
	}

	let policies = $state<PolicyItem[]>([]);
	let loadingPolicies = $state(false);
	let policyListError = $state<string | null>(null);

	// ─── Comparison State ─────────────────────────────────────────

	let result = $state<PolicyComparisonResult | null>(null);
	let comparing = $state(false);
	let compareError = $state<string | null>(null);
	let activeFilter = $state<ComparisonStatus | 'all'>('all');
	let activeTab = $state('settings');

	const resultTabs = [
		{ id: 'settings', label: 'Settings' },
		{ id: 'assignments', label: 'Assignments' }
	];

	const canCompare = $derived(
		leftPolicyId !== null &&
			rightPolicyId !== null &&
			leftPolicyId !== rightPolicyId &&
			!loadingPolicies
	);

	const filteredSettingDiffs = $derived(
		result
			? activeFilter === 'all'
				? result.settingDiffs
				: result.settingDiffs.filter((d) => d.status === activeFilter)
			: []
	);

	const filteredAssignmentDiffs = $derived(
		result
			? activeFilter === 'all'
				? result.assignmentDiffs
				: result.assignmentDiffs.filter((d) => d.status === activeFilter)
			: []
	);

	// ─── Fetch Policies ───────────────────────────────────────────

	async function fetchPolicies(): Promise<void> {
		loadingPolicies = true;
		policyListError = null;
		leftPolicyId = null;
		rightPolicyId = null;
		result = null;

		try {
			const client = getGraphClient();
			let items: PolicyItem[] = [];

			switch (selectedType) {
				case 'configProfile': {
					const configPolicies = await listConfigPolicies(client);
					items = configPolicies.map((p) => ({ id: p.id, displayName: p.name }));
					break;
				}
				case 'compliance': {
					const compliancePolicies = await listCompliancePolicies(client);
					items = compliancePolicies.map((p) => ({
						id: p.id,
						displayName: p.displayName
					}));
					break;
				}
				case 'security': {
					const securityPolicies = await listSecurityPolicies(client);
					items = securityPolicies.map((p) => ({ id: p.id, displayName: p.name }));
					break;
				}
			}

			items.sort((a, b) => a.displayName.localeCompare(b.displayName));
			policies = items;
		} catch (err) {
			policyListError = toFriendlyMessage(err);
		} finally {
			loadingPolicies = false;
		}
	}

	// ─── Run Comparison ───────────────────────────────────────────

	async function runComparison(): Promise<void> {
		if (!leftPolicyId || !rightPolicyId) return;

		comparing = true;
		compareError = null;
		result = null;
		activeFilter = 'all';

		try {
			const client = getGraphClient();
			let leftSettings: unknown[] = [];
			let rightSettings: unknown[] = [];
			let leftAssignments: Record<string, unknown>[] = [];
			let rightAssignments: Record<string, unknown>[] = [];
			let leftName = '';
			let rightName = '';

			const leftPolicy = policies.find((p) => p.id === leftPolicyId);
			const rightPolicy = policies.find((p) => p.id === rightPolicyId);
			leftName = leftPolicy?.displayName ?? leftPolicyId;
			rightName = rightPolicy?.displayName ?? rightPolicyId;

			switch (selectedType) {
				case 'configProfile': {
					const [ls, rs, la, ra] = await Promise.all([
						getConfigPolicySettings(client, leftPolicyId),
						getConfigPolicySettings(client, rightPolicyId),
						getConfigAssignments(client, leftPolicyId),
						getConfigAssignments(client, rightPolicyId)
					]);
					leftSettings = ls;
					rightSettings = rs;
					leftAssignments = la as unknown as Record<string, unknown>[];
					rightAssignments = ra as unknown as Record<string, unknown>[];
					break;
				}
				case 'compliance': {
					// Compliance policies have settings as direct properties on the object,
					// so we fetch the full policy object and use it as a single "setting"
					const [la, ra] = await Promise.all([
						getCompliancePolicyAssignments(client, leftPolicyId),
						getCompliancePolicyAssignments(client, rightPolicyId)
					]);
					leftAssignments = la as unknown as Record<string, unknown>[];
					rightAssignments = ra as unknown as Record<string, unknown>[];
					// Compliance policies don't have a separate settings endpoint;
					// their settings are properties on the policy object itself.
					// We fetch the full objects to compare.
					const [leftFull, rightFull] = await Promise.all([
						client.request<Record<string, unknown>>(
							`/deviceManagement/deviceCompliancePolicies/${leftPolicyId}`
						),
						client.request<Record<string, unknown>>(
							`/deviceManagement/deviceCompliancePolicies/${rightPolicyId}`
						)
					]);
					// Convert policy properties to settings-like array for comparison
					leftSettings = policyPropsToSettings(leftFull);
					rightSettings = policyPropsToSettings(rightFull);
					break;
				}
				case 'security': {
					const [ls, rs, la, ra] = await Promise.all([
						getSecurityPolicySettings(client, leftPolicyId),
						getSecurityPolicySettings(client, rightPolicyId),
						getSecurityAssignments(client, leftPolicyId),
						getSecurityAssignments(client, rightPolicyId)
					]);
					leftSettings = ls;
					rightSettings = rs;
					leftAssignments = la as unknown as Record<string, unknown>[];
					rightAssignments = ra as unknown as Record<string, unknown>[];
					break;
				}
			}

			const settingDiffs = comparePolicySettings(leftSettings, rightSettings);
			const assignmentDiffs = comparePolicyAssignments(leftAssignments, rightAssignments);
			const summary = generateComparisonSummary(settingDiffs, assignmentDiffs);

			result = {
				leftPolicy: { id: leftPolicyId, displayName: leftName },
				rightPolicy: { id: rightPolicyId, displayName: rightName },
				settingDiffs,
				assignmentDiffs,
				summary
			};
		} catch (err) {
			compareError = toFriendlyMessage(err);
		} finally {
			comparing = false;
		}
	}

	// ─── Helpers ──────────────────────────────────────────────────

	/** Convert compliance policy properties to a settings-like array for comparison. */
	function policyPropsToSettings(
		policy: Record<string, unknown>
	): Record<string, unknown>[] {
		const skipKeys = new Set([
			'id',
			'@odata.type',
			'@odata.context',
			'createdDateTime',
			'lastModifiedDateTime',
			'version',
			'displayName',
			'description',
			'roleScopeTagIds',
			'assignments',
			'scheduledActionsForRule'
		]);

		return Object.entries(policy)
			.filter(([key]) => !skipKeys.has(key) && !key.startsWith('@odata.'))
			.map(([key, value]) => ({
				displayName: key,
				settingDefinitionId: key,
				value
			}));
	}

	function exportCsv(): void {
		if (!result) return;

		const headers = ['Category', 'Name', 'Status', 'Left Value', 'Right Value'];
		const rows: string[][] = [];

		for (const diff of result.settingDiffs) {
			rows.push([
				'Setting',
				diff.settingName,
				diff.status,
				diff.leftValue !== null && diff.leftValue !== undefined
					? JSON.stringify(diff.leftValue)
					: '',
				diff.rightValue !== null && diff.rightValue !== undefined
					? JSON.stringify(diff.rightValue)
					: ''
			]);
		}

		for (const diff of result.assignmentDiffs) {
			rows.push([
				'Assignment',
				diff.targetDisplayName,
				diff.status,
				diff.leftAssignment ? JSON.stringify(diff.leftAssignment) : '',
				diff.rightAssignment ? JSON.stringify(diff.rightAssignment) : ''
			]);
		}

		const csv = serializeCsv(headers, rows);
		const leftName = result.leftPolicy.displayName.replace(/[^a-zA-Z0-9]/g, '_');
		const rightName = result.rightPolicy.displayName.replace(/[^a-zA-Z0-9]/g, '_');
		downloadCsv(csv, `compare_${leftName}_vs_${rightName}.csv`);
	}

	// ─── Reactive Fetch ───────────────────────────────────────────

	$effect(() => {
		// Re-fetch when policy type changes (read selectedType to track)
		void selectedType;
		fetchPolicies();
	});
</script>

<AuthGuard>
	<div class="animate-fade-in-up">
		<PageHeader
			title="Policy Comparison"
			icon={GitCompareArrows}
			description="Compare settings and assignments between two policies side by side"
		/>

		<!-- Selection Panel -->
		<div class="panel mb-6">
			<!-- Policy Type Selector -->
			<div class="mb-4">
				<label
					class="text-ink-faint mb-1.5 block text-xs font-medium uppercase tracking-wide"
					for="policy-type"
				>
					Policy Type
				</label>
				<select
					id="policy-type"
					bind:value={selectedType}
					class="border-border bg-surface text-ink focus:border-accent focus:ring-accent w-full max-w-xs rounded-xl border px-3 py-2.5 text-sm transition-colors focus:ring-1"
				>
					{#each policyTypes as pt (pt.id)}
						<option value={pt.id}>{pt.label}</option>
					{/each}
				</select>
			</div>

			{#if policyListError}
				<div class="mb-4">
					<ErrorState message={policyListError} onretry={fetchPolicies} />
				</div>
			{/if}

			{#if loadingPolicies}
				<div class="flex items-center justify-center py-8">
					<Spinner label="Loading policies..." />
				</div>
			{:else}
				<!-- Side-by-Side Selectors -->
				<div class="grid gap-4 md:grid-cols-2">
					<PolicySelector
						{policies}
						selected={leftPolicyId}
						label="Left Policy"
						onselect={(id) => (leftPolicyId = id)}
					/>
					<PolicySelector
						{policies}
						selected={rightPolicyId}
						label="Right Policy"
						onselect={(id) => (rightPolicyId = id)}
					/>
				</div>

				{#if leftPolicyId && rightPolicyId && leftPolicyId === rightPolicyId}
					<p class="text-warn mt-3 text-sm">
						Please select two different policies to compare.
					</p>
				{/if}

				<!-- Compare Button -->
				<div class="mt-4">
					<Button
						variant="primary"
						icon={ArrowRightLeft}
						disabled={!canCompare}
						loading={comparing}
						onclick={runComparison}
					>
						{comparing ? 'Comparing...' : 'Compare Policies'}
					</Button>
				</div>
			{/if}
		</div>

		<!-- Comparison Error -->
		{#if compareError}
			<div class="mb-4">
				<ErrorState message={compareError} onretry={runComparison} />
			</div>
		{/if}

		<!-- Comparing spinner -->
		{#if comparing}
			<div class="panel flex items-center justify-center py-12">
				<Spinner label="Fetching and comparing policies..." />
			</div>
		{/if}

		<!-- Results -->
		{#if result}
			<div class="animate-fade-in-up space-y-4">
				<!-- Header with policy names and export -->
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="text-ink text-sm">
						<span class="font-semibold">{result.leftPolicy.displayName}</span>
						<span class="text-muted mx-2">vs</span>
						<span class="font-semibold">{result.rightPolicy.displayName}</span>
					</div>
					<Button variant="secondary" size="sm" icon={Download} onclick={exportCsv}>
						Export CSV
					</Button>
				</div>

				<!-- Summary Bar -->
				<ComparisonSummaryBar
					summary={result.summary}
					{activeFilter}
					onfilter={(f) => (activeFilter = f)}
				/>

				<!-- Tabs for Settings vs Assignments -->
				<Tabs tabs={resultTabs} active={activeTab} onchange={(id) => (activeTab = id)} />

				{#if activeTab === 'settings'}
					<div class="panel overflow-clip p-0">
						{#if filteredSettingDiffs.length === 0}
							<p class="text-muted py-8 text-center text-sm">
								No settings match the current filter.
							</p>
						{:else}
							<div class="overflow-x-auto">
								<table class="w-full text-left">
									<thead>
										<tr class="border-border border-b">
											<th
												class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
											>
												Setting
											</th>
											<th
												class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
											>
												{result.leftPolicy.displayName}
											</th>
											<th
												class="text-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
											>
												{result.rightPolicy.displayName}
											</th>
										</tr>
									</thead>
									<tbody>
										{#each filteredSettingDiffs as diff, i (`${diff.settingDefinitionId ?? diff.settingName}-${i}`)}
											<SettingDiffRow {diff} />
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{:else}
					<div class="panel overflow-clip p-0">
						<AssignmentDiffTable diffs={filteredAssignmentDiffs} />
					</div>
				{/if}
			</div>
		{/if}
	</div>
</AuthGuard>
