import { DEVICE_ACTIONS } from '$lib/utils/device-types';
import type { DeviceAction, DeviceActionInfo } from '$lib/types/device';

export { DEVICE_ACTIONS };

export function getActionInfo(action: DeviceAction): DeviceActionInfo {
	const info = DEVICE_ACTIONS.find((a) => a.action === action);
	if (!info) throw new Error(`Unknown device action: ${action}`);
	return info;
}

export function isDestructiveAction(action: DeviceAction): boolean {
	return getActionInfo(action).destructive;
}
