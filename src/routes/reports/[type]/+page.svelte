<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import AuthGuard from '$lib/components/ui/AuthGuard.svelte';
	import PermissionGuard from '$lib/components/ui/PermissionGuard.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import SearchInput from '$lib/components/ui/SearchInput.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ReportTable from '$lib/components/reports/ReportTable.svelte';
	import ReportSummaryBar from '$lib/components/reports/ReportSummaryBar.svelte';
	import {
		FileBarChart,
		Download,
		ArrowLeft,
		Play,
		FileSpreadsheet
	} from 'lucide-svelte';
	import { getGraphClient } from '$lib/stores/graph';
	import { toFriendlyMessage } from '$lib/graph/errors';
	import { serializeCsv } from '$lib/utils/csv';
	import { downloadCsv } from '$lib/utils/csv-download';
	import {
		REPORT_CONFIGS,
		generateAppDeploymentReport,
		generateUnassignedItemsReport,
		generateStaleDevicesReport,
		generateFailedDeploymentsReport,
		generateAssignmentCoverageReport,
		generateComplianceSummaryReport
	} from '$lib/utils/reports';
	import type { ReportType } from '$lib/types/reports';

	// ─── Report type from URL ──────────────────────────────────────────
	const reportType = $derived(page.params.type as ReportType);
	const reportConfig = $derived(REPORT_CONFIGS.find((c) => c.type === reportType));

	// ─── State ──────────────────────────────────────────────────────────
	let data = $state<Record<string, unknown>[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let generated = $state(false);
	let search = $state('');
	let sortKey = $state('');
	let sortDir = $state<'asc' | 'desc'>('asc');

	// ─── Column definitions per report type ────────────────────────────
	const columnDefs: Record<
		ReportType,
		{ key: string; label: string; sortable?: boolean; align?: 'left' | 'center' | 'right' }[]
	> = {
		appDeployment: [
			{ key: 'displayName', label: 'App Name', sortable: true },
			{ key: 'installedDeviceCount', label: 'Installed', sortable: true, align: 'right' },
			{ key: 'failedDeviceCount', label: 'Failed', sortable: true, align: 'right' },
			{
				key: 'pendingInstallDeviceCount',
				label: 'Pending',
				sortable: true,
				align: 'right'
			},
			{
				key: 'notInstalledDeviceCount',
				label: 'Not Installed',
				sortable: true,
				align: 'right'
			},
			{
				key: 'notApplicableDeviceCount',
				label: 'N/A',
				sortable: true,
				align: 'right'
			}
		],
		failedDeployments: [
			{ key: 'displayName', label: 'App Name', sortable: true },
			{ key: 'platform', label: 'Platform', sortable: true },
			{ key: 'failedDeviceCount', label: 'Failed Devices', sortable: true, align: 'right' }
		],
		unassignedItems: [
			{ key: 'displayName', label: 'Name', sortable: true },
			{ key: 'itemType', label: 'Type', sortable: true },
			{ key: 'lastModified', label: 'Last Modified', sortable: true }
		],
		staleDevices: [
			{ key: 'deviceName', label: 'Device', sortable: true },
			{ key: 'userDisplayName', label: 'User', sortable: true },
			{ key: 'operatingSystem', label: 'OS', sortable: true },
			{ key: 'osVersion', label: 'Version', sortable: true },
			{ key: 'daysSinceSync', label: 'Days Since Sync', sortable: true, align: 'right' },
			{ key: 'complianceState', label: 'Compliance', sortable: true }
		],
		assignmentCoverage: [
			{ key: 'displayName', label: 'Name', sortable: true },
			{ key: 'itemType', label: 'Type', sortable: true },
			{ key: 'assignmentCount', label: 'Assignments', sortable: true, align: 'right' },
			{ key: 'hasAllDevices', label: 'All Devices', sortable: true, align: 'center' },
			{ key: 'hasAllUsers', label: 'All Users', sortable: true, align: 'center' }
		],
		complianceSummary: [
			{ key: 'displayName', label: 'Policy Name', sortable: true },
			{ key: 'assignmentCount', label: 'Assignments', sortable: true, align: 'right' },
			{ key: 'hasAllDevices', label: 'All Devices', sortable: true, align: 'center' },
			{ key: 'hasAllUsers', label: 'All Users', sortable: true, align: 'center' }
		]
	};

	const columns = $derived(columnDefs[reportType] ?? []);

	// ─── Summary stats per report type ────────────────────────────────
	const summaryStats = $derived.by(() => {
		if (data.length === 0) return [];

		switch (reportType) {
			case 'appDeployment': {
				const totalInstalled = data.reduce(
					(sum, r) => sum + (Number(r.installedDeviceCount) || 0),
					0
				);
				const totalFailed = data.reduce(
					(sum, r) => sum + (Number(r.failedDeviceCount) || 0),
					0
				);
				const totalPending = data.reduce(
					(sum, r) => sum + (Number(r.pendingInstallDeviceCount) || 0),
					0
				);
				return [
					{ label: 'Total Apps', value: data.length },
					{ label: 'Installed', value: totalInstalled.toLocaleString(), color: 'success' as const },
					{ label: 'Failed', value: totalFailed.toLocaleString(), color: 'ember' as const },
					{ label: 'Pending', value: totalPending.toLocaleString(), color: 'warn' as const }
				];
			}
			case 'failedDeployments': {
				const totalFailed = data.reduce(
					(sum, r) => sum + (Number(r.failedDeviceCount) || 0),
					0
				);
				return [
					{
						label: 'Apps with Failures',
						value: data.length,
						color: 'ember' as const
					},
					{
						label: 'Total Failed Devices',
						value: totalFailed.toLocaleString(),
						color: 'ember' as const
					}
				];
			}
			case 'unassignedItems': {
				const apps = data.filter((r) => r.itemType === 'app').length;
				const profiles = data.filter((r) => r.itemType === 'profile').length;
				const compliance = data.filter((r) => r.itemType === 'compliance').length;
				const security = data.filter((r) => r.itemType === 'security').length;
				return [
					{ label: 'Total Unassigned', value: data.length, color: 'warn' as const },
					{ label: 'Apps', value: apps },
					{ label: 'Profiles', value: profiles },
					{ label: 'Compliance', value: compliance },
					{ label: 'Security', value: security }
				];
			}
			case 'staleDevices':
				return [
					{ label: 'Stale Devices', value: data.length, color: 'warn' as const },
					{
						label: 'Max Days',
						value: data.length > 0 ? Number(data[0].daysSinceSync) : 0,
						color: 'ember' as const
					}
				];
			case 'assignmentCoverage': {
				const noAssignments = data.filter((r) => Number(r.assignmentCount) === 0).length;
				const withAllDevices = data.filter((r) => r.hasAllDevices === true).length;
				return [
					{ label: 'Total Items', value: data.length },
					{
						label: 'No Assignments',
						value: noAssignments,
						color: 'warn' as const
					},
					{
						label: 'All Devices Target',
						value: withAllDevices,
						color: 'accent' as const
					}
				];
			}
			case 'complianceSummary': {
				const noAssignments = data.filter((r) => Number(r.assignmentCount) === 0).length;
				const withAllDevices = data.filter((r) => r.hasAllDevices === true).length;
				return [
					{ label: 'Total Policies', value: data.length },
					{
						label: 'Unassigned',
						value: noAssignments,
						color: 'warn' as const
					},
					{
						label: 'All Devices Target',
						value: withAllDevices,
						color: 'accent' as const
					}
				];
			}
			default:
				return [{ label: 'Total Items', value: data.length }];
		}
	});

	// ─── Filtered + sorted rows ────────────────────────────────────────
	const filteredRows = $derived.by(() => {
		let rows = data;

		// Text search
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			rows = rows.filter((row) =>
				Object.values(row).some(
					(val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q)
				)
			);
		}

		// Sort
		if (sortKey) {
			rows = [...rows].sort((a, b) => {
				const av = a[sortKey];
				const bv = b[sortKey];
				if (av === null || av === undefined) return 1;
				if (bv === null || bv === undefined) return -1;
				if (typeof av === 'number' && typeof bv === 'number') {
					return sortDir === 'asc' ? av - bv : bv - av;
				}
				const cmp = String(av).localeCompare(String(bv));
				return sortDir === 'asc' ? cmp : -cmp;
			});
		}

		return rows;
	});

	// ─── Generate report ───────────────────────────────────────────────
	async function generate(): Promise<void> {
		loading = true;
		error = null;
		data = [];
		generated = false;

		try {
			const client = getGraphClient();
			let result: Record<string, unknown>[];

			switch (reportType) {
				case 'appDeployment':
					result = await generateAppDeploymentReport(client);
					break;
				case 'failedDeployments':
					result = await generateFailedDeploymentsReport(client);
					break;
				case 'unassignedItems':
					result = await generateUnassignedItemsReport(client);
					break;
				case 'staleDevices':
					result = await generateStaleDevicesReport(client);
					break;
				case 'assignmentCoverage':
					result = await generateAssignmentCoverageReport(client);
					break;
				case 'complianceSummary':
					result = await generateComplianceSummaryReport(client);
					break;
				default:
					result = [];
			}

			data = result;
			generated = true;
		} catch (err) {
			error = toFriendlyMessage(err);
		} finally {
			loading = false;
		}
	}

	// ─── Sort handler ──────────────────────────────────────────────────
	function handleSort(key: string): void {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	// ─── Export to CSV ─────────────────────────────────────────────────
	function exportCsv(): void {
		if (filteredRows.length === 0) return;
		const headers = columns.map((c) => c.label);
		const rows = filteredRows.map((row) =>
			columns.map((c) => {
				const val = row[c.key];
				if (val === null || val === undefined) return '';
				if (typeof val === 'boolean') return val ? 'Yes' : 'No';
				return String(val);
			})
		);
		const csv = serializeCsv(headers, rows);
		const filename = `${reportConfig?.title.replace(/\s+/g, '-').toLowerCase() ?? 'report'}-${new Date().toISOString().slice(0, 10)}.csv`;
		downloadCsv(csv, filename);
	}

	// Reset state when report type changes
	$effect(() => {
		const _type = reportType;
		void _type;
		untrack(() => {
			data = [];
			generated = false;
			error = null;
			search = '';
			sortKey = '';
			sortDir = 'asc';
		});
	});
</script>

<AuthGuard>
	<PermissionGuard
		requiredScopes={['DeviceManagementApps.Read.All']}
		featureName="Reports"
	>
		<div class="animate-fade-in-up">
			{#snippet actions()}
				<Button variant="ghost" size="sm" href="/reports" icon={ArrowLeft}>
					All Reports
				</Button>
				{#if generated && filteredRows.length > 0}
					<Button variant="secondary" size="sm" onclick={exportCsv} icon={Download}>
						Export CSV
					</Button>
				{/if}
			{/snippet}

			<PageHeader
				title={reportConfig?.title ?? 'Report'}
				icon={FileBarChart}
				description={reportConfig?.description}
				{actions}
			/>

			{#if !generated && !loading && !error}
				<!-- Initial state: prompt to generate -->
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<div
						class="bg-accent-light flex h-16 w-16 items-center justify-center rounded-2xl"
					>
						<FileSpreadsheet size={28} class="text-accent" />
					</div>
					<h3 class="text-ink mt-4 text-base font-semibold">Ready to Generate</h3>
					<p class="text-ink-faint mt-1 max-w-sm text-sm">
						{reportConfig?.description ?? 'Click the button below to generate this report.'}
					</p>
					<div class="mt-6">
						<Button onclick={generate} icon={Play}>Generate Report</Button>
					</div>
				</div>
			{/if}

			{#if loading}
				<div class="flex flex-col items-center justify-center py-16">
					<Spinner size="lg" label="Generating report..." />
					<p class="text-muted mt-4 text-sm">This may take a moment depending on your tenant size.</p>
				</div>
			{/if}

			{#if error}
				<div class="mb-4">
					<ErrorState message={error} onretry={generate} />
				</div>
			{/if}

			{#if generated && !loading}
				{#if data.length === 0}
					<EmptyState
						icon={FileBarChart}
						title="No data found"
						description="This report returned no results for your environment."
					/>
				{:else}
					<!-- Summary stats -->
					<div class="mb-4">
						<ReportSummaryBar stats={summaryStats} />
					</div>

					<!-- Search + count -->
					<div class="mb-4 flex items-center gap-3">
						<div class="min-w-0 flex-1">
							<SearchInput placeholder="Filter results..." bind:value={search} />
						</div>
						<span class="text-muted shrink-0 text-xs">
							{filteredRows.length}{search.trim()
								? ` of ${data.length}`
								: ''} row{filteredRows.length !== 1 ? 's' : ''}
						</span>
					</div>

					<!-- Data table -->
					<ReportTable
						{columns}
						rows={filteredRows}
						{sortKey}
						{sortDir}
						onsort={handleSort}
					/>

					<!-- Re-generate button -->
					<div class="mt-4 text-center">
						<Button variant="secondary" size="sm" onclick={generate} icon={Play}>
							Regenerate
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</PermissionGuard>
</AuthGuard>
