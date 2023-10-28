import type { InternalOwner } from './index';

export type OwnerTrackerCallback = (owner: InternalOwner) => void;

let ownerTrackerCallback: OwnerTrackerCallback | undefined;

export function setupOwnerTracker(callback: OwnerTrackerCallback) {
  ownerTrackerCallback = callback;
}

export function trackOwner(owner: InternalOwner) {
  if (ownerTrackerCallback) {
    ownerTrackerCallback(owner);
  }
}
