// SPDX-License-Identifier: AGPL-3.0-only

import type { GraphClient } from './client';
import type {
	ManagedDevice,
	DeviceCompliancePolicyState,
	DeviceConfigurationState,
	DetectedApp,
	DeviceDetail,
	DeviceAction
} from '$lib/types/device';
import type { GraphPagedResponse, BatchRequestItem } from '$lib/types/graph';
import {
	managedDeviceSchema,
	deviceCompliancePolicyStateSchema,
	deviceConfigurationStateSchema,
	detectedAppSchema
} from '$lib/types/device-schemas';

// ─── Types ──────────────────────────────────────────────────────────

export interface ListDevicesOptions {
	top?: number;
	orderBy?: string;
	select?: string[];
	filter?: string;
}

interface DevicesResult {
	devices: ManagedDevice[];
	nextLink: string | null;
}

// ─── API Functions ──────────────────────────────────────────────────

export async function listDevices(
	client: GraphClient,
	options?: ListDevicesOptions
): Promise<DevicesResult> {
	const params: Record<string, string> = {};

	if (options?.top !== undefined) {
		params['$top'] = String(options.top);
	}
	if (options?.orderBy) {
		params['$orderby'] = options.orderBy;
	}
	if (options?.select?.length) {
		params['$select'] = options.select.join(',');
	}
	if (options?.filter) {
		params['$filter'] = options.filter;
	}

	const response = await client.request<GraphPagedResponse<ManagedDevice>>(
		'/deviceManagement/managedDevices',
		{ params }
	);

	const devices = response.value.map((item) => managedDeviceSchema.parse(item) as ManagedDevice);

	return {
		devices,
		nextLink: response['@odata.nextLink'] ?? null
	};
}

export async function loadMoreDevices(
	client: GraphClient,
	nextLink: string
): Promise<DevicesResult> {
	const response = await client.request<GraphPagedResponse<ManagedDevice>>(nextLink);

	const devices = response.value.map((item) => managedDeviceSchema.parse(item) as ManagedDevice);

	return {
		devices,
		nextLink: response['@odata.nextLink'] ?? null
	};
}

export async function getDevice(client: GraphClient, deviceId: string): Promise<ManagedDevice> {
	const response = await client.request<ManagedDevice>(
		`/deviceManagement/managedDevices/${deviceId}`
	);
	return managedDeviceSchema.parse(response) as ManagedDevice;
}

// ─── Device Detail (Batch) ─────────────────────────────────────────

interface BatchBody {
	value?: unknown[];
}

export async function getDeviceDetail(
	client: GraphClient,
	deviceId: string
): Promise<DeviceDetail> {
	const batchRequests: BatchRequestItem[] = [
		{
			id: 'device',
			method: 'GET',
			url: `/deviceManagement/managedDevices/${deviceId}`
		},
		{
			id: 'compliance',
			method: 'GET',
			url: `/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`
		},
		{
			id: 'config',
			method: 'GET',
			url: `/deviceManagement/managedDevices/${deviceId}/deviceConfigurationStates`
		},
		{
			id: 'apps',
			method: 'GET',
			url: `/deviceManagement/managedDevices/${deviceId}/detectedApps`
		}
	];

	const responses = await client.batch(batchRequests);

	// Find each response by id
	const deviceResp = responses.find((r) => r.id === 'device');
	const complianceResp = responses.find((r) => r.id === 'compliance');
	const configResp = responses.find((r) => r.id === 'config');
	const appsResp = responses.find((r) => r.id === 'apps');

	// Device response is required
	if (!deviceResp || deviceResp.status >= 400) {
		throw new Error(`Failed to fetch device: ${deviceResp?.status ?? 'no response'}`);
	}

	const device = managedDeviceSchema.parse(deviceResp.body) as ManagedDevice;

	// Gracefully handle failures for supplementary data
	let compliancePolicyStates: DeviceCompliancePolicyState[] = [];
	if (complianceResp && complianceResp.status < 400) {
		const body = complianceResp.body as BatchBody;
		compliancePolicyStates = (body.value ?? []).map(
			(item) => deviceCompliancePolicyStateSchema.parse(item) as DeviceCompliancePolicyState
		);
	}

	let configurationStates: DeviceConfigurationState[] = [];
	if (configResp && configResp.status < 400) {
		const body = configResp.body as BatchBody;
		configurationStates = (body.value ?? []).map(
			(item) => deviceConfigurationStateSchema.parse(item) as DeviceConfigurationState
		);
	}

	let detectedApps: DetectedApp[] = [];
	if (appsResp && appsResp.status < 400) {
		const body = appsResp.body as BatchBody;
		detectedApps = (body.value ?? []).map((item) => detectedAppSchema.parse(item) as DetectedApp);
	}

	return { device, compliancePolicyStates, configurationStates, detectedApps };
}

// ─── Individual Fetch Functions ────────────────────────────────────

export async function getDeviceCompliancePolicyStates(
	client: GraphClient,
	deviceId: string
): Promise<DeviceCompliancePolicyState[]> {
	const response = await client.request<GraphPagedResponse<DeviceCompliancePolicyState>>(
		`/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`
	);
	return response.value.map(
		(item) => deviceCompliancePolicyStateSchema.parse(item) as DeviceCompliancePolicyState
	);
}

export async function getDeviceConfigurationStates(
	client: GraphClient,
	deviceId: string
): Promise<DeviceConfigurationState[]> {
	const response = await client.request<GraphPagedResponse<DeviceConfigurationState>>(
		`/deviceManagement/managedDevices/${deviceId}/deviceConfigurationStates`
	);
	return response.value.map(
		(item) => deviceConfigurationStateSchema.parse(item) as DeviceConfigurationState
	);
}

export async function getDeviceDetectedApps(
	client: GraphClient,
	deviceId: string
): Promise<DetectedApp[]> {
	const response = await client.request<GraphPagedResponse<DetectedApp>>(
		`/deviceManagement/managedDevices/${deviceId}/detectedApps`
	);
	return response.value.map((item) => detectedAppSchema.parse(item) as DetectedApp);
}

// ─── Remote Device Actions ─────────────────────────────────────────

export async function executeDeviceAction(
	client: GraphClient,
	deviceId: string,
	action: DeviceAction
): Promise<void> {
	await client.request(`/deviceManagement/managedDevices/${deviceId}/${action}`, {
		method: 'POST',
		body: {}
	});
}
