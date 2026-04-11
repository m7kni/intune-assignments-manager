import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	DeviceManagementScript,
	DeviceManagementScriptAssignment,
	DeviceManagementScriptDeviceState,
	DeviceManagementScriptRunSummary
} from '$lib/types/scripts';
import {
	deviceManagementScriptSchema,
	deviceManagementScriptAssignmentSchema,
	deviceManagementScriptDeviceStateSchema,
	deviceManagementScriptRunSummarySchema
} from '$lib/types/script-schemas';

// ─── API Functions ──────────────────────────────────────────────────

export async function listScripts(
	client: GraphClient
): Promise<DeviceManagementScript[]> {
	const items = await client.fetchAll<DeviceManagementScript>(
		'/deviceManagement/deviceManagementScripts'
	);

	return items.map(
		(item) => deviceManagementScriptSchema.parse(item) as DeviceManagementScript
	);
}

export async function getScript(
	client: GraphClient,
	scriptId: string
): Promise<DeviceManagementScript> {
	const response = await client.request<DeviceManagementScript>(
		`/deviceManagement/deviceManagementScripts/${scriptId}`
	);
	return deviceManagementScriptSchema.parse(response) as DeviceManagementScript;
}

export async function getScriptAssignments(
	client: GraphClient,
	scriptId: string
): Promise<DeviceManagementScriptAssignment[]> {
	const response = await client.request<
		GraphPagedResponse<DeviceManagementScriptAssignment>
	>(`/deviceManagement/deviceManagementScripts/${scriptId}/assignments`);

	return response.value.map(
		(item) =>
			deviceManagementScriptAssignmentSchema.parse(
				item
			) as DeviceManagementScriptAssignment
	);
}

export async function assignScript(
	client: GraphClient,
	scriptId: string,
	assignments: DeviceManagementScriptAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/deviceManagementScripts/${scriptId}/assign`,
		{
			method: 'POST',
			body: { deviceManagementScriptAssignments: assignments }
		}
	);
}

export async function getScriptDeviceStates(
	client: GraphClient,
	scriptId: string
): Promise<DeviceManagementScriptDeviceState[]> {
	const items = await client.fetchAll<DeviceManagementScriptDeviceState>(
		`/deviceManagement/deviceManagementScripts/${scriptId}/deviceRunStates`
	);

	return items.map(
		(item) =>
			deviceManagementScriptDeviceStateSchema.parse(
				item
			) as DeviceManagementScriptDeviceState
	);
}

export async function getScriptRunSummary(
	client: GraphClient,
	scriptId: string
): Promise<DeviceManagementScriptRunSummary> {
	const response = await client.request<DeviceManagementScriptRunSummary>(
		`/deviceManagement/deviceManagementScripts/${scriptId}/runSummary`
	);
	return deviceManagementScriptRunSummarySchema.parse(
		response
	) as DeviceManagementScriptRunSummary;
}
