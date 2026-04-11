import type { GraphClient } from './client';
import type { GraphPagedResponse } from '$lib/types/graph';
import type {
	WindowsUpdateForBusinessConfiguration,
	WindowsFeatureUpdateProfile,
	WindowsQualityUpdateProfile,
	WindowsDriverUpdateProfile,
	UpdateAssignment,
	UpdateRingDeviceStatus
} from '$lib/types/updates';
import {
	windowsUpdateForBusinessConfigurationSchema,
	windowsFeatureUpdateProfileSchema,
	windowsQualityUpdateProfileSchema,
	windowsDriverUpdateProfileSchema,
	updateAssignmentSchema
} from '$lib/types/update-schemas';

// ─── Update Rings ──────────────────────────────────────────────────

export async function listUpdateRings(
	client: GraphClient
): Promise<WindowsUpdateForBusinessConfiguration[]> {
	const items = await client.fetchAll<WindowsUpdateForBusinessConfiguration>(
		'/deviceManagement/deviceConfigurations',
		{
			params: {
				$filter:
					"isof('microsoft.graph.windowsUpdateForBusinessConfiguration')"
			}
		}
	);

	return items.map(
		(item) =>
			windowsUpdateForBusinessConfigurationSchema.parse(
				item
			) as WindowsUpdateForBusinessConfiguration
	);
}

export async function getUpdateRing(
	client: GraphClient,
	id: string
): Promise<WindowsUpdateForBusinessConfiguration> {
	const response = await client.request<WindowsUpdateForBusinessConfiguration>(
		`/deviceManagement/deviceConfigurations/${id}`
	);
	return windowsUpdateForBusinessConfigurationSchema.parse(
		response
	) as WindowsUpdateForBusinessConfiguration;
}

export async function getUpdateRingAssignments(
	client: GraphClient,
	id: string
): Promise<UpdateAssignment[]> {
	const response = await client.request<GraphPagedResponse<UpdateAssignment>>(
		`/deviceManagement/deviceConfigurations/${id}/assignments`
	);
	return response.value.map(
		(item) => updateAssignmentSchema.parse(item) as UpdateAssignment
	);
}

export async function assignUpdateRing(
	client: GraphClient,
	id: string,
	assignments: UpdateAssignment[]
): Promise<void> {
	await client.request(`/deviceManagement/deviceConfigurations/${id}/assign`, {
		method: 'POST',
		body: { assignments }
	});
}

export async function getUpdateRingDeviceStatuses(
	client: GraphClient,
	id: string
): Promise<UpdateRingDeviceStatus[]> {
	const response = await client.request<GraphPagedResponse<UpdateRingDeviceStatus>>(
		`/deviceManagement/deviceConfigurations/${id}/deviceStatuses`
	);
	return response.value;
}

// ─── Feature Update Profiles ───────────────────────────────────────

export async function listFeatureUpdateProfiles(
	client: GraphClient
): Promise<WindowsFeatureUpdateProfile[]> {
	const items = await client.fetchAll<WindowsFeatureUpdateProfile>(
		'/deviceManagement/windowsFeatureUpdateProfiles'
	);

	return items.map(
		(item) =>
			windowsFeatureUpdateProfileSchema.parse(item) as WindowsFeatureUpdateProfile
	);
}

export async function getFeatureUpdateProfile(
	client: GraphClient,
	id: string
): Promise<WindowsFeatureUpdateProfile> {
	const response = await client.request<WindowsFeatureUpdateProfile>(
		`/deviceManagement/windowsFeatureUpdateProfiles/${id}`
	);
	return windowsFeatureUpdateProfileSchema.parse(response) as WindowsFeatureUpdateProfile;
}

export async function getFeatureUpdateAssignments(
	client: GraphClient,
	id: string
): Promise<UpdateAssignment[]> {
	const response = await client.request<GraphPagedResponse<UpdateAssignment>>(
		`/deviceManagement/windowsFeatureUpdateProfiles/${id}/assignments`
	);
	return response.value.map(
		(item) => updateAssignmentSchema.parse(item) as UpdateAssignment
	);
}

export async function assignFeatureUpdate(
	client: GraphClient,
	id: string,
	assignments: UpdateAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/windowsFeatureUpdateProfiles/${id}/assignments`,
		{
			method: 'POST',
			body: { assignments }
		}
	);
}

// ─── Quality Update Profiles ───────────────────────────────────────

export async function listQualityUpdateProfiles(
	client: GraphClient
): Promise<WindowsQualityUpdateProfile[]> {
	const items = await client.fetchAll<WindowsQualityUpdateProfile>(
		'/deviceManagement/windowsQualityUpdateProfiles'
	);

	return items.map(
		(item) =>
			windowsQualityUpdateProfileSchema.parse(item) as WindowsQualityUpdateProfile
	);
}

export async function getQualityUpdateProfile(
	client: GraphClient,
	id: string
): Promise<WindowsQualityUpdateProfile> {
	const response = await client.request<WindowsQualityUpdateProfile>(
		`/deviceManagement/windowsQualityUpdateProfiles/${id}`
	);
	return windowsQualityUpdateProfileSchema.parse(
		response
	) as WindowsQualityUpdateProfile;
}

export async function getQualityUpdateAssignments(
	client: GraphClient,
	id: string
): Promise<UpdateAssignment[]> {
	const response = await client.request<GraphPagedResponse<UpdateAssignment>>(
		`/deviceManagement/windowsQualityUpdateProfiles/${id}/assignments`
	);
	return response.value.map(
		(item) => updateAssignmentSchema.parse(item) as UpdateAssignment
	);
}

export async function assignQualityUpdate(
	client: GraphClient,
	id: string,
	assignments: UpdateAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/windowsQualityUpdateProfiles/${id}/assignments`,
		{
			method: 'POST',
			body: { assignments }
		}
	);
}

// ─── Driver Update Profiles ────────────────────────────────────────

export async function listDriverUpdateProfiles(
	client: GraphClient
): Promise<WindowsDriverUpdateProfile[]> {
	const items = await client.fetchAll<WindowsDriverUpdateProfile>(
		'/deviceManagement/windowsDriverUpdateProfiles'
	);

	return items.map(
		(item) =>
			windowsDriverUpdateProfileSchema.parse(item) as WindowsDriverUpdateProfile
	);
}

export async function getDriverUpdateProfile(
	client: GraphClient,
	id: string
): Promise<WindowsDriverUpdateProfile> {
	const response = await client.request<WindowsDriverUpdateProfile>(
		`/deviceManagement/windowsDriverUpdateProfiles/${id}`
	);
	return windowsDriverUpdateProfileSchema.parse(
		response
	) as WindowsDriverUpdateProfile;
}

export async function getDriverUpdateAssignments(
	client: GraphClient,
	id: string
): Promise<UpdateAssignment[]> {
	const response = await client.request<GraphPagedResponse<UpdateAssignment>>(
		`/deviceManagement/windowsDriverUpdateProfiles/${id}/assignments`
	);
	return response.value.map(
		(item) => updateAssignmentSchema.parse(item) as UpdateAssignment
	);
}

export async function assignDriverUpdate(
	client: GraphClient,
	id: string,
	assignments: UpdateAssignment[]
): Promise<void> {
	await client.request(
		`/deviceManagement/windowsDriverUpdateProfiles/${id}/assignments`,
		{
			method: 'POST',
			body: { assignments }
		}
	);
}
