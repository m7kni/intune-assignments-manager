import type { GraphClient } from './client';
import type { BatchRequestItem } from '$lib/types/graph';
import type { DeviceAction, BulkActionProgress, ActionResult } from '$lib/types/device';

interface BatchResponseBody {
	error?: {
		code?: string;
		message?: string;
	};
}

/**
 * Execute a single device action via Graph API.
 */
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

/**
 * Execute a device action on multiple devices using the Graph batch API.
 * Chunks into batches of 20 (Graph batch limit), tracks progress via callback,
 * and handles 429/5xx errors with retry.
 */
export async function executeBulkDeviceActions(
	client: GraphClient,
	devices: { id: string; deviceName: string }[],
	action: DeviceAction,
	onProgress?: (progress: BulkActionProgress) => void
): Promise<BulkActionProgress> {
	const BATCH_SIZE = 20;
	const MAX_RETRIES = 3;

	const progress: BulkActionProgress = {
		total: devices.length,
		completed: 0,
		succeeded: 0,
		failed: 0,
		results: []
	};

	// Build a lookup for device names by id
	const deviceNameMap = new Map(devices.map((d) => [d.id, d.deviceName]));

	// Chunk the devices
	const chunks: { id: string; deviceName: string }[][] = [];
	for (let i = 0; i < devices.length; i += BATCH_SIZE) {
		chunks.push(devices.slice(i, i + BATCH_SIZE));
	}

	for (const chunk of chunks) {
		let pendingDevices = [...chunk];
		let attempt = 0;

		while (pendingDevices.length > 0 && attempt < MAX_RETRIES) {
			const batchRequests: BatchRequestItem[] = pendingDevices.map((device) => ({
				id: device.id,
				method: 'POST' as const,
				url: `/deviceManagement/managedDevices/${device.id}/${action}`,
				body: {},
				headers: { 'Content-Type': 'application/json' }
			}));

			try {
				const responses = await client.batch(batchRequests);

				const retryDevices: { id: string; deviceName: string }[] = [];

				for (const resp of responses) {
					const deviceName = deviceNameMap.get(resp.id) ?? resp.id;

					if (resp.status >= 200 && resp.status < 300) {
						// Success (200, 204, etc.)
						const result: ActionResult = {
							deviceId: resp.id,
							deviceName,
							action,
							status: 'success'
						};
						progress.results.push(result);
						progress.completed++;
						progress.succeeded++;
					} else if (resp.status >= 500 && attempt < MAX_RETRIES - 1) {
						// Server error — retry
						const device = pendingDevices.find((d) => d.id === resp.id);
						if (device) retryDevices.push(device);
					} else {
						// Client error or final retry failure
						const body = resp.body as BatchResponseBody | undefined;
						const errorMessage =
							body?.error?.message ?? `HTTP ${resp.status}`;
						const result: ActionResult = {
							deviceId: resp.id,
							deviceName,
							action,
							status: 'error',
							error: errorMessage
						};
						progress.results.push(result);
						progress.completed++;
						progress.failed++;
					}
				}

				pendingDevices = retryDevices;
			} catch (err) {
				// Entire batch request failed — mark all remaining as failed
				for (const device of pendingDevices) {
					const result: ActionResult = {
						deviceId: device.id,
						deviceName: device.deviceName,
						action,
						status: 'error',
						error: err instanceof Error ? err.message : 'Unknown error'
					};
					progress.results.push(result);
					progress.completed++;
					progress.failed++;
				}
				pendingDevices = [];
			}

			attempt++;

			// Small delay before retry to avoid hammering the API
			if (pendingDevices.length > 0 && attempt < MAX_RETRIES) {
				await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
			}
		}

		// Any devices still pending after max retries
		for (const device of pendingDevices) {
			const result: ActionResult = {
				deviceId: device.id,
				deviceName: device.deviceName,
				action,
				status: 'error',
				error: 'Max retries exceeded'
			};
			progress.results.push(result);
			progress.completed++;
			progress.failed++;
		}

		onProgress?.({ ...progress, results: [...progress.results] });
	}

	return progress;
}
