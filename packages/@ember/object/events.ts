import {
  addListener as originalAddListener,
  removeListener as originalRemoveListener,
  sendEvent as originalSendEvent,
} from '@ember/-internals/metal';
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';

export const addListener = (...args: Parameters<typeof originalAddListener>) => {
  deprecateUntil(
    'Importing `addListener` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalAddListener(...args);
};

export const removeListener = (...args: Parameters<typeof originalRemoveListener>) => {
  deprecateUntil(
    'Importing `removeListener` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalRemoveListener(...args);
};

export const sendEvent = (...args: Parameters<typeof originalSendEvent>) => {
  deprecateUntil(
    'Importing `sendEvent` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalSendEvent(...args);
};
