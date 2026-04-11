import type { GraphClient } from '$lib/graph/client';
import type { IntuneReportResponse } from '$lib/types/status';
import type {
	AppDeploymentReportItem,
	UnassignedItem,
	StaleDevice,
	FailedDeploymentItem,
	AssignmentCoverageItem,
	ReportConfig
} from '$lib/types/reports';
import type { BatchRequestItem } from '$lib/types/graph';
import { listApps } from '$lib/graph/apps';
import { listConfigPolicies } from '$lib/graph/configurations';
import { listCompliancePolicies } from '$lib/graph/compliance';
import { listSecurityPolicies } from '$lib/graph/security';

// ─── Report Configs ─────────────────────────────────────────────────

export const REPORT_CONFIGS: ReportConfig[] = [
	{
		type: 'appDeployment',
		title: 'App Deployment Status',
		description: 'View install counts across all deployed apps including installed, failed, and pending devices.',
		icon: 'BarChart3'
	},
	{
		type: 'failedDeployments',
		title: 'Failed Deployments',
		description: 'Identify apps with failed installations to prioritize troubleshooting efforts.',
		icon: 'AlertTriangle'
	},
	{
		type: 'unassignedItems',
		title: 'Unassigned Items',
		description: 'Find apps, profiles, and policies that have no assignments and may need attention.',
		icon: 'PackageX'
	},
	{
		type: 'staleDevices',
		title: 'Stale Devices',
		description: 'Discover devices that have not synced recently and may need remediation or cleanup.',
		icon: 'Clock'
	},
	{
		type: 'assignmentCoverage',
		title: 'Assignment Coverage',
		description: 'Analyze assignment breadth across apps, profiles, and policies to identify coverage gaps.',
		icon: 'Target'
	},
	{
		type: 'complianceSummary',
		title: 'Compliance Summary',
		description: 'Overview of compliance policy assignments and their coverage across your environment.',
		icon: 'ShieldCheck'
	}
];

// ─── Report Helpers ─────────────────────────────────────────────────

function parseReportRows<T>(
	response: IntuneReportResponse,
	mapper: Record<string, keyof T>
): T[] {
	const columns = response.Schema.map((s) => s.Column);
	return response.Values.map((row) => {
		const obj: Record<string, unknown> = {};
		for (const [reportCol, typedKey] of Object.entries(mapper)) {
			const idx = columns.indexOf(reportCol);
			if (idx >= 0) obj[typedKey as string] = row[idx];
		}
		return obj as T;
	});
}

async function fetchAllReportRows(
	client: GraphClient,
	endpoint: string,
	body: Record<string, unknown>,
	pageSize = 500
): Promise<IntuneReportResponse> {
	const firstPage = await client.request<IntuneReportResponse>(endpoint, {
		method: 'POST',
		body: { ...body, skip: 0, top: pageSize }
	});

	if (firstPage.TotalRowCount <= pageSize) return firstPage;

	const allValues = [...firstPage.Values];
	let skip = pageSize;
	while (skip < firstPage.TotalRowCount) {
		const page = await client.request<IntuneReportResponse>(endpoint, {
			method: 'POST',
			body: { ...body, skip, top: pageSize }
		});
		allValues.push(...page.Values);
		skip += pageSize;
	}
	return { ...firstPage, Values: allValues };
}

// ─── Report Generators ──────────────────────────────────────────────

export async function generateAppDeploymentReport(
	client: GraphClient
): Promise<AppDeploymentReportItem[]> {
	const response = await fetchAllReportRows(
		client,
		'/deviceManagement/reports/getAppsInstallSummaryReport',
		{
			select: [
				'ApplicationId',
				'DisplayName',
				'Platform',
				'InstalledDeviceCount',
				'FailedDeviceCount',
				'PendingInstallDeviceCount',
				'NotApplicableDeviceCount',
				'NotInstalledDeviceCount'
			]
		}
	);

	return parseReportRows<AppDeploymentReportItem>(response, {
		ApplicationId: 'applicationId',
		DisplayName: 'displayName',
		Platform: 'platform',
		InstalledDeviceCount: 'installedDeviceCount',
		FailedDeviceCount: 'failedDeviceCount',
		PendingInstallDeviceCount: 'pendingInstallDeviceCount',
		NotApplicableDeviceCount: 'notApplicableDeviceCount',
		NotInstalledDeviceCount: 'notInstalledDeviceCount'
	});
}

export async function generateUnassignedItemsReport(
	client: GraphClient
): Promise<UnassignedItem[]> {
	const [apps, profiles, compliance, security] = await Promise.all([
		listApps(client),
		listConfigPolicies(client),
		listCompliancePolicies(client),
		listSecurityPolicies(client)
	]);

	const items: UnassignedItem[] = [];

	for (const app of apps) {
		if (!app.isAssigned) {
			items.push({
				id: app.id,
				displayName: app.displayName,
				itemType: 'app'
			});
		}
	}

	for (const profile of profiles) {
		if (!profile.isAssigned) {
			items.push({
				id: profile.id,
				displayName: profile.name,
				itemType: 'profile'
			});
		}
	}

	for (const policy of compliance) {
		if (!policy.isAssigned) {
			items.push({
				id: policy.id,
				displayName: policy.displayName,
				itemType: 'compliance',
				lastModified: policy.lastModifiedDateTime
			});
		}
	}

	for (const policy of security) {
		if (!policy.isAssigned) {
			items.push({
				id: policy.id,
				displayName: policy.name,
				itemType: 'security'
			});
		}
	}

	return items;
}

export async function generateStaleDevicesReport(
	client: GraphClient,
	staleDays: number = 30
): Promise<StaleDevice[]> {
	const devices = await client.fetchAll<{
		id: string;
		deviceName: string;
		userDisplayName: string | null;
		operatingSystem: string;
		osVersion: string | null;
		lastSyncDateTime: string | null;
		complianceState: string;
	}>('/deviceManagement/managedDevices', {
		params: {
			$select:
				'id,deviceName,userDisplayName,operatingSystem,osVersion,lastSyncDateTime,complianceState'
		}
	});

	const now = Date.now();
	const threshold = staleDays * 24 * 60 * 60 * 1000;

	const stale: StaleDevice[] = [];
	for (const device of devices) {
		if (!device.lastSyncDateTime) continue;
		const lastSync = new Date(device.lastSyncDateTime).getTime();
		const diff = now - lastSync;
		if (diff >= threshold) {
			stale.push({
				id: device.id,
				deviceName: device.deviceName,
				userDisplayName: device.userDisplayName ?? undefined,
				operatingSystem: device.operatingSystem,
				osVersion: device.osVersion ?? '',
				lastSyncDateTime: device.lastSyncDateTime,
				daysSinceSync: Math.floor(diff / (24 * 60 * 60 * 1000)),
				complianceState: device.complianceState
			});
		}
	}

	stale.sort((a, b) => b.daysSinceSync - a.daysSinceSync);
	return stale;
}

export async function generateFailedDeploymentsReport(
	client: GraphClient
): Promise<FailedDeploymentItem[]> {
	const response = await fetchAllReportRows(
		client,
		'/deviceManagement/reports/getFailedMobileAppsReport',
		{
			select: ['ApplicationId', 'DisplayName', 'Platform', 'FailedDeviceCount']
		}
	);

	return parseReportRows<FailedDeploymentItem>(response, {
		ApplicationId: 'applicationId',
		DisplayName: 'displayName',
		Platform: 'platform',
		FailedDeviceCount: 'failedDeviceCount'
	});
}

export async function generateAssignmentCoverageReport(
	client: GraphClient
): Promise<AssignmentCoverageItem[]> {
	const [apps, profiles, compliance] = await Promise.all([
		listApps(client),
		listConfigPolicies(client),
		listCompliancePolicies(client)
	]);

	const items: { id: string; displayName: string; itemType: string; assignmentUrl: string }[] =
		[];

	for (const app of apps) {
		items.push({
			id: app.id,
			displayName: app.displayName,
			itemType: 'App',
			assignmentUrl: `/deviceAppManagement/mobileApps/${app.id}/assignments`
		});
	}

	for (const profile of profiles) {
		items.push({
			id: profile.id,
			displayName: profile.name,
			itemType: 'Profile',
			assignmentUrl: `/deviceManagement/configurationPolicies/${profile.id}/assignments`
		});
	}

	for (const policy of compliance) {
		items.push({
			id: policy.id,
			displayName: policy.displayName,
			itemType: 'Compliance',
			assignmentUrl: `/deviceManagement/deviceCompliancePolicies/${policy.id}/assignments`
		});
	}

	// Batch-fetch assignments for all items
	const batchRequests: BatchRequestItem[] = items.map((item, idx) => ({
		id: String(idx),
		method: 'GET' as const,
		url: item.assignmentUrl
	}));

	const responses = await client.batch(batchRequests);

	const results: AssignmentCoverageItem[] = [];
	for (const item of items) {
		const idx = items.indexOf(item);
		const resp = responses.find((r) => r.id === String(idx));
		let assignmentCount = 0;
		let hasAllDevices = false;
		let hasAllUsers = false;

		if (resp && resp.status < 400) {
			const body = resp.body as { value?: { target?: { '@odata.type': string } }[] };
			const assignments = body.value ?? [];
			assignmentCount = assignments.length;
			for (const assignment of assignments) {
				const targetType = assignment.target?.['@odata.type'] ?? '';
				if (targetType.includes('allDevicesAssignmentTarget')) hasAllDevices = true;
				if (targetType.includes('allLicensedUsersAssignmentTarget')) hasAllUsers = true;
			}
		}

		results.push({
			id: item.id,
			displayName: item.displayName,
			itemType: item.itemType,
			assignmentCount,
			hasAllDevices,
			hasAllUsers
		});
	}

	return results;
}

export async function generateComplianceSummaryReport(
	client: GraphClient
): Promise<AssignmentCoverageItem[]> {
	const policies = await listCompliancePolicies(client);

	const batchRequests: BatchRequestItem[] = policies.map((policy, idx) => ({
		id: String(idx),
		method: 'GET' as const,
		url: `/deviceManagement/deviceCompliancePolicies/${policy.id}/assignments`
	}));

	const responses = await client.batch(batchRequests);

	const results: AssignmentCoverageItem[] = [];
	for (let i = 0; i < policies.length; i++) {
		const policy = policies[i];
		const resp = responses.find((r) => r.id === String(i));
		let assignmentCount = 0;
		let hasAllDevices = false;
		let hasAllUsers = false;

		if (resp && resp.status < 400) {
			const body = resp.body as { value?: { target?: { '@odata.type': string } }[] };
			const assignments = body.value ?? [];
			assignmentCount = assignments.length;
			for (const assignment of assignments) {
				const targetType = assignment.target?.['@odata.type'] ?? '';
				if (targetType.includes('allDevicesAssignmentTarget')) hasAllDevices = true;
				if (targetType.includes('allLicensedUsersAssignmentTarget')) hasAllUsers = true;
			}
		}

		results.push({
			id: policy.id,
			displayName: policy.displayName,
			itemType: 'Compliance',
			assignmentCount,
			hasAllDevices,
			hasAllUsers
		});
	}

	return results;
}
