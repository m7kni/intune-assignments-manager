// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	MobileAppInstallSummary,
	IntuneReportResponse,
	AppInstallSummaryRow,
	AppDeviceInstallStatusRow,
	DeviceConfigurationDeviceStatus,
	DeviceConfigurationDeviceOverview,
	DeviceComplianceDeviceStatus,
	SettingStateDeviceSummary,
	DeviceComplianceSettingState
} from '$lib/types/status';
import {
	deviceConfigurationDeviceStatusSchema,
	deviceConfigurationDeviceOverviewSchema,
	deviceComplianceDeviceStatusSchema,
	settingStateDeviceSummarySchema,
	deviceComplianceSettingStateSchema
} from '$lib/types/status-schemas';

// Config/compliance status endpoints use v1.0
const V1 = { version: 'v1.0' as const };

// ─── Report Helpers ─────────────────────────────────────────────────

function parseReportRows<T>(response: IntuneReportResponse, mapper: Record<string, keyof T>): T[] {
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
	pageSize = 500,
	version?: 'beta' | 'v1.0'
): Promise<IntuneReportResponse> {
	const opts = version ? { method: 'POST' as const, version } : { method: 'POST' as const };
	const firstPage = await client.request<IntuneReportResponse>(endpoint, {
		...opts,
		body: { ...body, skip: 0, top: pageSize }
	});

	if (firstPage.TotalRowCount <= pageSize) return firstPage;

	// Paginate through remaining rows
	const allValues = [...firstPage.Values];
	let skip = pageSize;
	while (skip < firstPage.TotalRowCount) {
		const page = await client.request<IntuneReportResponse>(endpoint, {
			...opts,
			body: { ...body, skip, top: pageSize }
		});
		allValues.push(...page.Values);
		skip += pageSize;
	}
	return { ...firstPage, Values: allValues };
}

// ─── App Install Status (Reports API) ──────────────────────────────

export async function getAppInstallSummaries(client: GraphClient): Promise<AppInstallSummaryRow[]> {
	const response = await fetchAllReportRows(
		client,
		'/deviceManagement/reports/getAppsInstallSummaryReport',
		{
			select: [
				'ApplicationId',
				'DisplayName',
				'FailedDeviceCount',
				'InstalledDeviceCount',
				'NotInstalledDeviceCount',
				'PendingInstallDeviceCount'
			]
		}
	);
	return parseReportRows<AppInstallSummaryRow>(response, {
		ApplicationId: 'applicationId',
		DisplayName: 'displayName',
		FailedDeviceCount: 'failedDeviceCount',
		InstalledDeviceCount: 'installedDeviceCount',
		NotInstalledDeviceCount: 'notInstalledDeviceCount',
		PendingInstallDeviceCount: 'pendingInstallDeviceCount'
	});
}

export async function getAppInstallSummary(
	client: GraphClient,
	appId: string
): Promise<MobileAppInstallSummary> {
	const response = await client.request<IntuneReportResponse>(
		'/deviceManagement/reports/getAppStatusOverviewReport',
		{
			method: 'POST',
			body: {
				filter: `(ApplicationId eq '${appId}')`,
				select: [
					'ApplicationId',
					'FailedDeviceCount',
					'PendingInstallDeviceCount',
					'InstalledDeviceCount',
					'NotInstalledDeviceCount',
					'NotApplicableDeviceCount'
				],
				skip: 0,
				top: 1
			}
		}
	);

	if (response.Values.length === 0) {
		return {
			installedDeviceCount: 0,
			failedDeviceCount: 0,
			notInstalledDeviceCount: 0,
			notApplicableDeviceCount: 0,
			pendingInstallDeviceCount: 0
		};
	}

	const columns = response.Schema.map((s) => s.Column);
	const row = response.Values[0];
	const get = (col: string): number => {
		const idx = columns.indexOf(col);
		return idx >= 0 ? Number(row[idx]) || 0 : 0;
	};

	return {
		installedDeviceCount: get('InstalledDeviceCount'),
		failedDeviceCount: get('FailedDeviceCount'),
		notInstalledDeviceCount: get('NotInstalledDeviceCount'),
		notApplicableDeviceCount: get('NotApplicableDeviceCount'),
		pendingInstallDeviceCount: get('PendingInstallDeviceCount')
	};
}

// ─── Per-Device App Install Status (Reports API) ────────────────────

export async function getAppDeviceInstallStatuses(
	client: GraphClient,
	appId: string
): Promise<AppDeviceInstallStatusRow[]> {
	const response = await fetchAllReportRows(
		client,
		'/deviceManagement/reports/microsoft.graph.retrieveDeviceAppInstallationStatusReport',
		{
			select: [
				'DeviceName',
				'DeviceId',
				'UserName',
				'UserPrincipalName',
				'Platform',
				'AppVersion',
				'InstallState',
				'InstallStateDetail',
				'AppInstallState',
				'AppInstallStateDetails',
				'ErrorCode',
				'HexErrorCode',
				'LastModifiedDateTime'
			],
			filter: `(ApplicationId eq '${appId}')`,
			orderBy: []
		},
		50,
		'v1.0'
	);

	return parseReportRows<AppDeviceInstallStatusRow>(response, {
		DeviceName: 'deviceName',
		DeviceId: 'deviceId',
		UserName: 'userName',
		UserPrincipalName: 'userPrincipalName',
		Platform: 'platform',
		AppVersion: 'appVersion',
		InstallState: 'installState',
		InstallStateDetail: 'installStateDetail',
		AppInstallState: 'appInstallState',
		AppInstallStateDetails: 'appInstallStateDetails',
		ErrorCode: 'errorCode',
		HexErrorCode: 'hexErrorCode',
		LastModifiedDateTime: 'lastModifiedDateTime'
	});
}

// ─── Device Configuration Status ────────────────────────────────────

export async function getConfigDeviceStatuses(
	client: GraphClient,
	configId: string
): Promise<DeviceConfigurationDeviceStatus[]> {
	const items = await client.fetchAll<DeviceConfigurationDeviceStatus>(
		`/deviceManagement/deviceConfigurations/${configId}/deviceStatuses`,
		V1
	);
	return items.map(
		(item) => deviceConfigurationDeviceStatusSchema.parse(item) as DeviceConfigurationDeviceStatus
	);
}

export async function getConfigStatusOverview(
	client: GraphClient,
	configId: string
): Promise<DeviceConfigurationDeviceOverview> {
	const response = await client.request<DeviceConfigurationDeviceOverview>(
		`/deviceManagement/deviceConfigurations/${configId}/deviceStatusOverview`,
		V1
	);
	return deviceConfigurationDeviceOverviewSchema.parse(
		response
	) as DeviceConfigurationDeviceOverview;
}

// ─── Compliance Policy Status ───────────────────────────────────────

export async function getComplianceStatusOverview(
	client: GraphClient,
	policyId: string
): Promise<DeviceConfigurationDeviceOverview> {
	const response = await client.request<DeviceConfigurationDeviceOverview>(
		`/deviceManagement/deviceCompliancePolicies/${policyId}/deviceStatusOverview`,
		V1
	);
	return deviceConfigurationDeviceOverviewSchema.parse(
		response
	) as DeviceConfigurationDeviceOverview;
}

export async function getComplianceDeviceStatuses(
	client: GraphClient,
	policyId: string
): Promise<DeviceComplianceDeviceStatus[]> {
	const items = await client.fetchAll<DeviceComplianceDeviceStatus>(
		`/deviceManagement/deviceCompliancePolicies/${policyId}/deviceStatuses`,
		V1
	);
	return items.map(
		(item) => deviceComplianceDeviceStatusSchema.parse(item) as DeviceComplianceDeviceStatus
	);
}

export async function getComplianceSettingSummaries(
	client: GraphClient,
	policyId: string
): Promise<SettingStateDeviceSummary[]> {
	const response = await client.request<GraphPagedResponse<SettingStateDeviceSummary>>(
		`/deviceManagement/deviceCompliancePolicies/${policyId}/deviceSettingStateSummaries`,
		V1
	);
	return response.value.map(
		(item) => settingStateDeviceSummarySchema.parse(item) as SettingStateDeviceSummary
	);
}

export async function getComplianceSettingStates(
	client: GraphClient,
	summaryId: string
): Promise<DeviceComplianceSettingState[]> {
	const response = await client.request<GraphPagedResponse<DeviceComplianceSettingState>>(
		`/deviceManagement/deviceCompliancePolicySettingStateSummaries/${summaryId}/deviceComplianceSettingStates`,
		V1
	);
	return response.value.map(
		(item) => deviceComplianceSettingStateSchema.parse(item) as DeviceComplianceSettingState
	);
}
