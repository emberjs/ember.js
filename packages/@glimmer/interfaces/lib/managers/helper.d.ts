import type { Arguments } from '../runtime.js';
import type { Capabilities } from './capabilities.js';

export interface HelperCapabilitiesVersions {
  '3.23': {
    hasValue?: boolean;
    hasDestroyable?: boolean;
  };
}

export interface HelperCapabilities extends Capabilities {
  hasValue: boolean;
  hasDestroyable: boolean;
  hasScheduledEffect: boolean;
}

export interface HelperManager<HelperStateBucket> {
  capabilities: HelperCapabilities;

  createHelper(definition: object, args: Arguments): HelperStateBucket;

  getDebugName?(definition: object): string;
}

export interface HelperManagerWithValue<HelperStateBucket>
  extends HelperManager<HelperStateBucket> {
  getValue(bucket: HelperStateBucket): unknown;
}

export interface HelperManagerWithDestroyable<HelperStateBucket>
  extends HelperManager<HelperStateBucket> {
  getDestroyable(bucket: HelperStateBucket): object;
}
