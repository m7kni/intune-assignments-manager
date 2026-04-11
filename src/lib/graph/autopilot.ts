import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	AutopilotDevice,
	AutopilotDeploymentProfile,
	AutopilotDeploymentProfileAssignment
} from '$lib/types/autopilot';
import {
	autopilotDeviceSchema,
	autopilotDeploymentProfileSchema,
	autopilotDeploymentProfileAssignmentSchema
} from '$lib/types/autopilot-schemas';

// ─── Autopilot Device Functions ───────────────────────────────────

export async function listAutopilotDevices(
	client: GraphClient
): Promise<AutopilotDevice[]> {
	const items = await client.fetchAll<AutopilotDevice>(
		'/deviceManagement/windowsAutopilotDeviceIdentities'
	);

	return items.map(
		(item) => autopilotDeviceSchema.parse(item) as AutopilotDevice
	);
}

export async function getAutopilotDevice(
	client: GraphClient,
	deviceId: string
): Promise<AutopilotDevice> {
	const response = await client.request<AutopilotDevice>(
		`/deviceManagement/windowsAutopilotDeviceIdentities/${deviceId}`
	);
	return autopilotDeviceSchema.parse(response) as AutopilotDevice;
}

// ─── Deployment Profile Functions ─────────────────────────────────

export async function listDeploymentProfiles(
	client: GraphClient
): Promise<AutopilotDeploymentProfile[]> {
	const items = await client.fetchAll<AutopilotDeploymentProfile>(
		'/deviceManagement/windowsAutopilotDeploymentProfiles'
	);

	return items.map(
		(item) => autopilotDeploymentProfileSchema.parse(item) as AutopilotDeploymentProfile
	);
}

export async function getDeploymentProfile(
	client: GraphClient,
	profileId: string
): Promise<AutopilotDeploymentProfile> {
	const response = await client.request<AutopilotDeploymentProfile>(
		`/deviceManagement/windowsAutopilotDeploymentProfiles/${profileId}`
	);
	return autopilotDeploymentProfileSchema.parse(response) as AutopilotDeploymentProfile;
}

export async function getDeploymentProfileAssignments(
	client: GraphClient,
	profileId: string
): Promise<AutopilotDeploymentProfileAssignment[]> {
	const response = await client.request<
		GraphPagedResponse<AutopilotDeploymentProfileAssignment>
	>(
		`/deviceManagement/windowsAutopilotDeploymentProfiles/${profileId}/assignments`
	);

	return response.value.map(
		(item) =>
			autopilotDeploymentProfileAssignmentSchema.parse(
				item
			) as AutopilotDeploymentProfileAssignment
	);
}

export async function assignDeploymentProfile(
	client: GraphClient,
	profileId: string,
	assignments: AutopilotDeploymentProfileAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/windowsAutopilotDeploymentProfiles/${profileId}/assign`,
		{
			method: 'POST',
			body: { assignments }
		}
	);
}

// ─── Device Property Update ───────────────────────────────────────

export interface UpdateAutopilotDeviceProperties {
	userPrincipalName?: string;
	groupTag?: string;
	displayName?: string;
}

export async function updateAutopilotDeviceProperties(
	client: GraphClient,
	deviceId: string,
	properties: UpdateAutopilotDeviceProperties
): Promise<void> {
	await client.request(
		`/deviceManagement/windowsAutopilotDeviceIdentities/${deviceId}/updateDeviceProperties`,
		{
			method: 'POST',
			body: properties
		}
	);
}
