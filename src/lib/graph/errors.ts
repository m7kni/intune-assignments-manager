// SPDX-License-Identifier: AGPL-3.0-only

export class GraphApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly requestId: string | undefined;

	constructor(params: { message: string; status: number; code: string; requestId?: string }) {
		super(params.message);
		this.name = 'GraphApiError';
		this.status = params.status;
		this.code = params.code;
		this.requestId = params.requestId;
	}
}

export class RateLimitError extends GraphApiError {
	readonly retryAfterSeconds: number;

	constructor(params: { message: string; retryAfterSeconds: number; requestId?: string }) {
		super({
			message: params.message,
			status: 429,
			code: 'TooManyRequests',
			requestId: params.requestId
		});
		this.name = 'RateLimitError';
		this.retryAfterSeconds = params.retryAfterSeconds;
	}
}

export class AuthenticationError extends GraphApiError {
	constructor(params: { message: string; requestId?: string }) {
		super({
			message: params.message,
			status: 401,
			code: 'Unauthenticated',
			requestId: params.requestId
		});
		this.name = 'AuthenticationError';
	}
}

export class PermissionError extends GraphApiError {
	constructor(params: { message: string; requestId?: string }) {
		super({
			message: params.message,
			status: 403,
			code: 'Forbidden',
			requestId: params.requestId
		});
		this.name = 'PermissionError';
	}
}

export function notifyGraphError(error: unknown): void {
	// Lazy import to avoid circular dependency at module load time
	import('$lib/stores/notifications.svelte').then(({ notifyError }) => {
		const message = toFriendlyMessage(error);
		notifyError('Graph API Error', message);
	});
}

export function toFriendlyMessage(error: unknown): string {
	if (error instanceof RateLimitError) {
		return `Microsoft Graph is rate limiting requests. Please wait ${error.retryAfterSeconds} seconds and try again.`;
	}
	if (error instanceof AuthenticationError) {
		return 'Your session has expired. Please sign in again.';
	}
	if (error instanceof PermissionError) {
		return 'You do not have permission to perform this action. Ensure your account has the required Intune admin roles.';
	}
	if (error instanceof GraphApiError) {
		return `Microsoft Graph API error: ${error.message} (${error.code})`;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return 'An unexpected error occurred.';
}
