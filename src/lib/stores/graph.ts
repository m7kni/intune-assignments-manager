// SPDX-License-Identifier: AGPL-3.0-only

import { createGraphClient, type GraphClient } from '$lib/graph/client';
import { getToken } from '$lib/stores/auth.svelte';

let clientInstance: GraphClient | null = null;

export function getGraphClient(): GraphClient {
	if (clientInstance === null) {
		clientInstance = createGraphClient(getToken);
	}
	return clientInstance;
}
