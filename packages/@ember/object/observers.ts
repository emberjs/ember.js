import {
  addObserver as internalAddObserver,
  removeObserver as internalRemoveObserver,
} from '@ember/-internals/metal/lib/observer';

export const addObserver = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : internalAddObserver
) as typeof internalAddObserver;

export const removeObserver = (
  import.meta.env?.EMBER_DROP_CLASSIC_FEATURES ? undefined : internalRemoveObserver
) as typeof internalRemoveObserver;
