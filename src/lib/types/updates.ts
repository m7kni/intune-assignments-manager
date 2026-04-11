import type { AssignmentTarget } from './graph';

// ─── Update Category ───────────────────────────────────────────────

export type UpdateCategory = 'updateRing' | 'featureUpdate' | 'qualityUpdate' | 'driverUpdate';

// ─── Windows Update for Business Configuration (Update Ring) ───────

export interface WindowsUpdateForBusinessConfiguration {
	id: string;
	displayName: string;
	description: string | null;
	qualityUpdatesDeferralPeriodInDays: number;
	featureUpdatesDeferralPeriodInDays: number;
	qualityUpdatesPaused: boolean;
	featureUpdatesPaused: boolean;
	deliveryOptimizationMode: string | null;
	driversExcluded: boolean;
	allowWindows11Upgrade: boolean;
	deadlineForQualityUpdatesInDays: number | null;
	deadlineForFeatureUpdatesInDays: number | null;
	engagedRestartDeadlineInDays: number | null;
	updateNotificationLevel: string | null;
	userPauseAccess: string | null;
	businessReadyUpdatesOnly: string | null;
	createdDateTime: string;
	lastModifiedDateTime: string;
	'@odata.type': string;
}

// ─── Windows Feature Update Profile ────────────────────────────────

export interface WindowsFeatureUpdateProfile {
	id: string;
	displayName: string;
	description: string | null;
	featureUpdateVersion: string;
	rolloutSettings: {
		offerStartDateTimeInUTC: string | null;
		offerEndDateTimeInUTC: string | null;
		offerIntervalInDays: number | null;
	} | null;
	endOfSupportDate: string | null;
	createdDateTime: string;
	lastModifiedDateTime: string;
}

// ─── Windows Quality Update Profile ────────────────────────────────

export interface WindowsQualityUpdateProfile {
	id: string;
	displayName: string;
	description: string | null;
	expeditedUpdateSettings: {
		qualityUpdateRelease: string | null;
		daysUntilForcedReboot: number | null;
	} | null;
	releaseDateDisplayName: string | null;
	createdDateTime: string;
	lastModifiedDateTime: string;
}

// ─── Windows Driver Update Profile ─────────────────────────────────

export interface WindowsDriverUpdateProfile {
	id: string;
	displayName: string;
	description: string | null;
	approvalType: 'manual' | 'automatic';
	deviceReporting: number;
	newUpdates: number;
	deploymentDeferralInDays: number;
	createdDateTime: string;
	lastModifiedDateTime: string;
}

// ─── Unified Update Item (for list page) ───────────────────────────

export type UpdateItem =
	| { category: 'updateRing'; data: WindowsUpdateForBusinessConfiguration }
	| { category: 'featureUpdate'; data: WindowsFeatureUpdateProfile }
	| { category: 'qualityUpdate'; data: WindowsQualityUpdateProfile }
	| { category: 'driverUpdate'; data: WindowsDriverUpdateProfile };

// ─── Assignment Types ──────────────────────────────────────────────

export interface UpdateAssignment {
	id: string;
	target: AssignmentTarget;
}

// ─── Device Status (for update rings) ──────────────────────────────

export interface UpdateRingDeviceStatus {
	id: string;
	deviceDisplayName: string;
	userName: string | null;
	status: string;
	lastReportedDateTime: string;
}
