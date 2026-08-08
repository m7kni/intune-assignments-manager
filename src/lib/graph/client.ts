// SPDX-License-Identifier: AGPL-3.0-only

import type { BatchRequestItem, BatchResponseItem, GraphPagedResponse } from '$lib/types/graph';
import { GraphApiError, RateLimitError, AuthenticationError, PermissionError } from './errors';

const GRAPH_BASE = 'https://graph.microsoft.com';
const GRAPH_BASE_URL = `${GRAPH_BASE}/beta`;
const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 20;
const DEFAULT_MAX_PAGES = 50;

// ─── Types ──────────────────────────────────────────────────────────

export type GraphApiVersion = 'beta' | 'v1.0';

export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	body?: unknown;
	headers?: Record<string, string>;
	params?: Record<string, string>;
	version?: GraphApiVersion;
}

export interface FetchAllOptions extends RequestOptions {
	maxPages?: number;
}

export interface BatchOptions {
	version?: GraphApiVersion;
}

export interface GraphClient {
	request: <T>(path: string, options?: RequestOptions) => Promise<T>;
	fetchAll: <T>(path: string, options?: FetchAllOptions) => Promise<T[]>;
	batch: (requests: BatchRequestItem[], options?: BatchOptions) => Promise<BatchResponseItem[]>;
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, params?: Record<string, string>, version?: GraphApiVersion): string {
	const baseUrl = version ? `${GRAPH_BASE}/${version}` : GRAPH_BASE_URL;
	const url = new URL(baseUrl + path);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}
	return url.toString();
}

interface GraphErrorBody {
	error?: {
		code?: string;
		message?: string;
	};
}

async function parseGraphError(
	response: Response,
	requestId: string | undefined
): Promise<GraphApiError> {
	let code = 'UnknownError';
	let message = `Graph API request failed with status ${response.status}`;

	try {
		const body = (await response.json()) as GraphErrorBody;
		if (body.error) {
			code = body.error.code ?? code;
			message = body.error.message ?? message;
		}
	} catch {
		// Response body not parseable — use defaults
	}

	if (response.status === 429) {
		const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
		return new RateLimitError({
			message,
			retryAfterSeconds: isNaN(retryAfter) ? 5 : retryAfter,
			requestId
		});
	}

	if (response.status === 401) {
		return new AuthenticationError({ message, requestId });
	}

	if (response.status === 403) {
		return new PermissionError({ message, requestId });
	}

	return new GraphApiError({
		message,
		status: response.status,
		code,
		requestId
	});
}

// ─── Factory ────────────────────────────────────────────────────────

export function createGraphClient(getAccessToken: () => Promise<string>): GraphClient {
	async function request<T>(path: string, options?: RequestOptions): Promise<T> {
		const { method = 'GET', body, headers: extraHeaders, params, version } = options ?? {};
		let lastError: GraphApiError | null = null;
		let authRetried = false;

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			const token = await getAccessToken();
			const url = buildUrl(path, params, version);

			const headers: Record<string, string> = {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				ConsistencyLevel: 'eventual',
				...extraHeaders
			};

			const response = await fetch(url, {
				method,
				headers,
				body: body !== undefined ? JSON.stringify(body) : undefined
			});

			if (response.ok) {
				if (response.status === 204) {
					return undefined as T;
				}
				return (await response.json()) as T;
			}

			const requestId = response.headers.get('x-ms-request-id') ?? undefined;
			const error = await parseGraphError(response, requestId);

			if (error instanceof RateLimitError && attempt < MAX_RETRIES - 1) {
				await sleep(error.retryAfterSeconds * 1000);
				lastError = error;
				continue;
			}

			if (error instanceof AuthenticationError && !authRetried) {
				authRetried = true;
				lastError = error;
				continue;
			}

			throw error;
		}

		throw (
			lastError ??
			new GraphApiError({
				message: 'Request failed after maximum retries',
				status: 0,
				code: 'MaxRetriesExceeded'
			})
		);
	}

	async function fetchAll<T>(path: string, options?: FetchAllOptions): Promise<T[]> {
		const { maxPages = DEFAULT_MAX_PAGES, ...requestOptions } = options ?? {};
		const items: T[] = [];

		const firstPage = await request<GraphPagedResponse<T>>(path, requestOptions);
		items.push(...firstPage.value);

		let nextLink = firstPage['@odata.nextLink'];
		let pageCount = 1;

		while (nextLink && pageCount < maxPages) {
			const token = await getAccessToken();
			const response = await fetch(nextLink, {
				headers: {
					Authorization: `Bearer ${token}`,
					ConsistencyLevel: 'eventual'
				}
			});

			if (!response.ok) {
				const requestId = response.headers.get('x-ms-request-id') ?? undefined;
				throw await parseGraphError(response, requestId);
			}

			const page = (await response.json()) as GraphPagedResponse<T>;
			items.push(...page.value);
			nextLink = page['@odata.nextLink'];
			pageCount++;
		}

		return items;
	}

	async function batch(
		requests: BatchRequestItem[],
		batchOptions?: BatchOptions
	): Promise<BatchResponseItem[]> {
		const allResponses: BatchResponseItem[] = [];
		let pendingRequests = [...requests];
		let attempt = 0;

		while (pendingRequests.length > 0 && attempt < MAX_RETRIES) {
			const chunks: BatchRequestItem[][] = [];
			for (let i = 0; i < pendingRequests.length; i += MAX_BATCH_SIZE) {
				chunks.push(pendingRequests.slice(i, i + MAX_BATCH_SIZE));
			}

			const retryItems: BatchRequestItem[] = [];
			let maxRetryAfter = 0;

			for (const chunk of chunks) {
				const result = await request<{ responses: BatchResponseItem[] }>('/$batch', {
					method: 'POST',
					body: { requests: chunk },
					version: batchOptions?.version
				});

				for (const item of result.responses) {
					if (item.status === 429) {
						const original = chunk.find((r) => r.id === item.id);
						if (original) {
							retryItems.push(original);
							const retryAfter = parseInt(item.headers?.['Retry-After'] ?? '5', 10);
							maxRetryAfter = Math.max(maxRetryAfter, isNaN(retryAfter) ? 5 : retryAfter);
						}
					} else {
						allResponses.push(item);
					}
				}
			}

			if (retryItems.length === 0) break;

			await sleep(maxRetryAfter * 1000);
			pendingRequests = retryItems;
			attempt++;
		}

		// If there are still pending items after all retries, add them as errors
		if (pendingRequests.length > 0) {
			for (const item of pendingRequests) {
				allResponses.push({
					id: item.id,
					status: 429,
					body: { error: { code: 'TooManyRequests', message: 'Rate limited after max retries' } }
				});
			}
		}

		return allResponses;
	}

	return { request, fetchAll, batch };
}
