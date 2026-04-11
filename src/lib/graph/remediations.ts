import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	DeviceHealthScript,
	DeviceHealthScriptAssignment,
	DeviceHealthScriptDeviceState,
	DeviceHealthScriptRunSummary
} from '$lib/types/remediation';
import {
	deviceHealthScriptSchema,
	deviceHealthScriptAssignmentSchema,
	deviceHealthScriptDeviceStateSchema,
	deviceHealthScriptRunSummarySchema
} from '$lib/types/remediation-schemas';

// ─── API Functions ──────────────────────────────────────────────────

export async function listRemediationScripts(
	client: GraphClient
): Promise<DeviceHealthScript[]> {
	const items = await client.fetchAll<DeviceHealthScript>(
		'/deviceManagement/deviceHealthScripts'
	);

	return items.map(
		(item) => deviceHealthScriptSchema.parse(item) as DeviceHealthScript
	);
}

export async function getRemediationScript(
	client: GraphClient,
	scriptId: string
): Promise<DeviceHealthScript> {
	const response = await client.request<DeviceHealthScript>(
		`/deviceManagement/deviceHealthScripts/${scriptId}`
	);
	return deviceHealthScriptSchema.parse(response) as DeviceHealthScript;
}

export async function getRemediationAssignments(
	client: GraphClient,
	scriptId: string
): Promise<DeviceHealthScriptAssignment[]> {
	const response = await client.request<
		GraphPagedResponse<DeviceHealthScriptAssignment>
	>(`/deviceManagement/deviceHealthScripts/${scriptId}/assignments`);

	return response.value.map(
		(item) =>
			deviceHealthScriptAssignmentSchema.parse(item) as DeviceHealthScriptAssignment
	);
}

export async function assignRemediation(
	client: GraphClient,
	scriptId: string,
	assignments: DeviceHealthScriptAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/deviceHealthScripts/${scriptId}/assign`,
		{
			method: 'POST',
			body: { deviceHealthScriptAssignments: assignments }
		}
	);
}

export async function getRemediationDeviceStates(
	client: GraphClient,
	scriptId: string
): Promise<DeviceHealthScriptDeviceState[]> {
	const items = await client.fetchAll<DeviceHealthScriptDeviceState>(
		`/deviceManagement/deviceHealthScripts/${scriptId}/deviceRunStates`,
		{
			params: {
				$expand: 'managedDevice($select=id,deviceName)'
			}
		}
	);

	return items.map(
		(item) =>
			deviceHealthScriptDeviceStateSchema.parse(item) as DeviceHealthScriptDeviceState
	);
}

export async function getRemediationRunSummary(
	client: GraphClient,
	scriptId: string
): Promise<DeviceHealthScriptRunSummary> {
	const response = await client.request<DeviceHealthScriptRunSummary>(
		`/deviceManagement/deviceHealthScripts/${scriptId}/runSummary`
	);
	return deviceHealthScriptRunSummarySchema.parse(response) as DeviceHealthScriptRunSummary;
}
