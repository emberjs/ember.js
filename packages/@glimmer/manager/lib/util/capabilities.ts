import { DEBUG } from '@glimmer/env';
import { _WeakSet } from '@glimmer/util';
import { Capabilities } from '@glimmer/interfaces';

export const FROM_CAPABILITIES = DEBUG ? new _WeakSet() : undefined;

export function buildCapabilities<T extends object>(capabilities: T): T & Capabilities {
  if (DEBUG) {
    FROM_CAPABILITIES!.add(capabilities);
    Object.freeze(capabilities);
  }

  return capabilities as T & Capabilities;
}
