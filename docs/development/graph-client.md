---
title: Graph API Client
description: Deep dive into the Microsoft Graph API client factory, methods, error handling, and known limitations.
tags:
  - development
  - graph-api
---

# Graph API Client

The Graph API client lives in `src/lib/graph/client.ts` and is the sole interface for all Microsoft Graph communication. It is a factory function that returns three methods, all pre-configured with automatic token acquisition and retry logic.

## Overview

```typescript
import { createGraphClient, type GraphClient } from '$lib/graph/client';

const client: GraphClient = createGraphClient(getAccessToken);
```

The factory accepts a `getAccessToken` function that returns a `Promise<string>`. This decouples the client from any specific auth implementation. In practice, the app creates a singleton client via the graph store:

```typescript
// src/lib/stores/graph.ts
import { createGraphClient, type GraphClient } from '$lib/graph/client';
import { getToken } from '$lib/stores/auth.svelte';

let clientInstance: GraphClient | null = null;

export function getGraphClient(): GraphClient {
	if (clientInstance === null) {
		clientInstance = createGraphClient(getToken);
	}
	return clientInstance;
}
```

Components and Graph modules use the singleton:

```typescript
import { getGraphClient } from '$lib/stores/graph';

const client = getGraphClient();
const apps = await client.fetchAll('/deviceAppManagement/mobileApps');
```

**Base URL**: `https://graph.microsoft.com/beta` (default). Pass `version: 'v1.0'` in options to use the stable endpoint instead.

## Methods

### `request<T>(path, options?)`

Makes a single HTTP request to the Graph API.

```typescript
interface RequestOptions {
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	body?: unknown;
	headers?: Record<string, string>;
	params?: Record<string, string>;
	version?: 'beta' | 'v1.0';
}

const app = await client.request<MobileApp>(`/deviceAppManagement/mobileApps/${id}`);
```

**Retry behaviour**:

- **429 (Rate Limited)**: Retries up to 3 times total, sleeping for the duration specified in the `Retry-After` header (defaults to 5 seconds if header is missing)
- **401 (Authentication)**: Retries once — re-acquires the access token via the `getAccessToken` callback, then replays the request
- **All other errors**: Throws immediately with no retry

**HTTP 204 responses** return `undefined` (cast as `T`).

**Headers** sent on every request:

| Header             | Value              |
| ------------------ | ------------------ |
| `Authorization`    | `Bearer {token}`   |
| `Content-Type`     | `application/json` |
| `ConsistencyLevel` | `eventual`         |

The `ConsistencyLevel: eventual` header is required by several Graph API endpoints that use advanced query capabilities (e.g., `$count`, `$search`, `$filter` with `ne`).

### `fetchAll<T>(path, options?)`

Fetches all pages of a paginated Graph API response by following `@odata.nextLink`.

```typescript
interface FetchAllOptions extends RequestOptions {
	maxPages?: number; // Default: 50
}

const allApps = await client.fetchAll<MobileApp>('/deviceAppManagement/mobileApps');
```

The method:

1. Makes an initial `request<GraphPagedResponse<T>>()` call
2. Collects items from the `value` array
3. If `@odata.nextLink` is present, fetches the next page directly (raw `fetch` with auth header)
4. Repeats until there are no more pages or `maxPages` is reached

!!! tip
Set `maxPages` when you only need a sample of data (e.g., dashboard counts) to avoid fetching hundreds of pages.

### `batch(requests[], options?)`

Sends multiple Graph API requests in a single HTTP call using the `/$batch` endpoint.

```typescript
interface BatchRequestItem {
	id: string;
	method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	url: string;
	body?: unknown;
	headers?: Record<string, string>;
}

interface BatchOptions {
	version?: 'beta' | 'v1.0';
}

const requests: BatchRequestItem[] = appIds.map((id) => ({
	id,
	method: 'GET',
	url: `/deviceAppManagement/mobileApps/${id}/assignments`
}));

const responses = await client.batch(requests);

for (const response of responses) {
	if (response.status === 200) {
		// response.body contains the result
	}
}
```

**Auto-chunking**: The Graph API limits batches to 20 requests. The client automatically splits larger arrays into chunks of 20 and executes them sequentially.

**429 handling in batch responses**: Individual items within a batch can return 429. The client:

1. Collects all 429 items from the batch response
2. Waits for the longest `Retry-After` value among them
3. Re-submits only the failed items in a new batch
4. Repeats up to 3 times total
5. Any items still rate-limited after all retries are returned with a synthetic 429 response and error body

## Error Types

All errors thrown by the client extend `GraphApiError`:

```typescript
class GraphApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly requestId: string | undefined;
}
```

### `RateLimitError` (HTTP 429)

```typescript
class RateLimitError extends GraphApiError {
	readonly retryAfterSeconds: number;
}
```

Thrown when the client exhausts all retries for a 429 response. The `retryAfterSeconds` value comes from the `Retry-After` response header.

### `AuthenticationError` (HTTP 401)

```typescript
class AuthenticationError extends GraphApiError {}
```

Thrown after one re-auth attempt fails. Indicates the token is expired or revoked.

### `PermissionError` (HTTP 403)

```typescript
class PermissionError extends GraphApiError {}
```

Thrown when the authenticated user lacks the required permissions. Map this to a consent prompt in the UI.

### `toFriendlyMessage(error)`

Utility function that converts any error into a user-facing string:

```typescript
import { toFriendlyMessage } from '$lib/graph/errors';

try {
	await client.request('/some/endpoint');
} catch (err) {
	const message = toFriendlyMessage(err);
	// "Microsoft Graph is rate limiting requests. Please wait 5 seconds..."
	// "Your session has expired. Please sign in again."
	// "You do not have permission to perform this action..."
}
```

### `notifyGraphError(error)`

Convenience function that converts the error to a friendly message and dispatches it to the toast notification system:

```typescript
import { notifyGraphError } from '$lib/graph/errors';

try {
	await client.request('/some/endpoint');
} catch (err) {
	notifyGraphError(err);
}
```

## Version Override

Most endpoints use the `beta` API version. Some endpoints only work correctly on `v1.0`:

```typescript
// Use v1.0 for a specific request
const result = await client.request('/some/endpoint', {
	version: 'v1.0'
});

// Use v1.0 for batch requests
const responses = await client.batch(requests, {
	version: 'v1.0'
});
```

## Batching Details

The `POST /$batch` request format sent to Graph:

```json
{
	"requests": [
		{
			"id": "1",
			"method": "GET",
			"url": "/deviceAppManagement/mobileApps/abc-123/assignments"
		},
		{
			"id": "2",
			"method": "GET",
			"url": "/deviceAppManagement/mobileApps/def-456/assignments"
		}
	]
}
```

The response contains a `responses` array with per-request status codes and bodies:

```json
{
    "responses": [
        {
            "id": "1",
            "status": 200,
            "body": {
                "value": [...]
            }
        },
        {
            "id": "2",
            "status": 404,
            "body": {
                "error": {
                    "code": "NotFound",
                    "message": "Resource not found"
                }
            }
        }
    ]
}
```

!!! note
Batch responses may arrive in a different order than the requests. Always match responses to requests using the `id` field.

## Graph API Modules

Domain-specific Graph operations are organized into separate modules in `src/lib/graph/`:

| Module         | File                | Purpose                                               |
| -------------- | ------------------- | ----------------------------------------------------- |
| Apps           | `apps.ts`           | Mobile app queries, assignment reads/writes           |
| Configurations | `configurations.ts` | Configuration policy queries, assignment reads/writes |
| Groups         | `groups.ts`         | Azure AD group search                                 |
| Audit          | `audit.ts`          | Intune audit event queries                            |
| Execute        | `execute.ts`        | Three-phase bulk assignment orchestration             |
| Merge          | `merge.ts`          | Assignment merge logic and conflict detection         |
| Filters        | `filters.ts`        | Assignment filter queries                             |
| Status         | `status.ts`         | Reports API for install/deployment status             |

## Known API Limitations

!!! warning "Broken endpoints"
Several traditional Graph API endpoints for app install status are **broken or removed** in both `beta` and `v1.0`:

    - `/mobileApps/{id}/installSummary` — returns 400 "Resource not found"
    - `/mobileApps/{id}/deviceStatuses` — returns 400 "Resource not found"
    - `$expand=installSummary` on mobileApps — "Could not find a property"

### Working alternative: Reports API

Use the Intune Reports API (`POST /deviceManagement/reports/{reportName}`) instead:

| Endpoint                           | Use                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `getAppsInstallSummaryReport`      | All apps install counts (FailedDeviceCount, InstalledDeviceCount, etc.) |
| `getAppStatusOverviewReport`       | Single app summary (requires `filter: "(ApplicationId eq 'xxx')"`)      |
| `getFailedMobileAppsReport`        | All apps with failure counts                                            |
| `getFailedMobileAppsSummaryReport` | Count of failed apps (returns single `Count` value)                     |

The Reports API returns data in a tabular format:

```json
{
	"TotalRowCount": 408,
	"Schema": [
		{ "Column": "ApplicationId", "PropertyType": "String" },
		{ "Column": "DisplayName", "PropertyType": "String" },
		{ "Column": "FailedDeviceCount", "PropertyType": "String" }
	],
	"Values": [
		["app-id-1", "My App", "0"],
		["app-id-2", "Other App", "3"]
	]
}
```

See `src/lib/graph/status.ts` for the implementation.

### Other known issues

- **Settings Catalog profiles** (`configurationPolicies`): The `deviceStatusOverview` endpoint returns 404. The Reports API config profile endpoints all return 500 errors.
- **Server-side filtering on Reports API**: Filters like `(FailedDeviceCount gt 0)` fail with a type mismatch — the API internally treats numeric columns as `String` type.
- **Per-device install status**: `getDeviceInstallStatusReport` and `getDeviceInstallStatusByAppReport` both return "Resource not found".
