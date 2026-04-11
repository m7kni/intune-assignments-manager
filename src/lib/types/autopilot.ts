import type { AssignmentTarget } from './graph';

// ─── Autopilot Device Types ───────────────────────────────────────

export type AutopilotEnrollmentState =
	| 'unknown'
	| 'enrolled'
	| 'pendingReset'
	| 'failed'
	| 'notContacted'
	| 'blocked';

export type AutopilotProfileAssignmentStatus =
	| 'unknown'
	| 'assignedInSync'
	| 'assignedOutOfSync'
	| 'assignedUnkownSyncState'
	| 'notAssigned'
	| 'pending'
	| 'failed';

export interface AutopilotDevice {
	id: string;
	groupTag: string | null;
	serialNumber: string;
	manufacturer: string | null;
	model: string | null;
	enrollmentState: AutopilotEnrollmentState;
	lastContactedDateTime: string | null;
	deploymentProfileAssignmentStatus: AutopilotProfileAssignmentStatus;
	deploymentProfileAssignmentDetailedStatus: string | null;
	purchaseOrderIdentifier: string | null;
	addressableUserName: string | null;
}

// ─── Autopilot Deployment Profile Types ───────────────────────────

export interface OutOfBoxExperienceSettings {
	hidePrivacySettings: boolean;
	hideEULA: boolean;
	userType: string;
	hideEscapeLink: boolean;
	deviceUsageType: string;
	skipKeyboardSelectionPage: boolean;
	hideChangeAccountOption: boolean;
}

export interface AutopilotDeploymentProfile {
	id: string;
	displayName: string;
	description: string | null;
	deviceNameTemplate: string | null;
	language: string | null;
	preprovisioningAllowed: boolean;
	outOfBoxExperienceSettings: OutOfBoxExperienceSettings | null;
	createdDateTime: string;
	lastModifiedDateTime: string;
}

// ─── Autopilot Deployment Profile Assignment Types ────────────────

export interface AutopilotDeploymentProfileAssignment {
	id: string;
	target: AssignmentTarget;
}
