import {
  addListener as originalAddListener,
  removeListener as originalRemoveListener,
  sendEvent as originalSendEvent,
} from '@ember/-internals/metal';
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';

export function addListener<Target>(
  obj: object,
  eventName: string,
  target: Target,
  method: PropertyKey | ((this: Target, ...args: any[]) => void),
  once?: boolean,
  sync?: boolean
): void;
export function addListener(
  obj: object,
  eventName: string,
  method: PropertyKey | ((...args: any[]) => void)
): void;
export function addListener(
  obj: object,
  eventName: string,
  target: object | PropertyKey | ((...args: any[]) => void) | null,
  method?: PropertyKey | ((...args: any[]) => void),
  once?: boolean,
  sync?: boolean
): void {
  deprecateUntil(
    'Importing `addListener` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalAddListener(
    obj,
    eventName,
    target as any,
    method as PropertyKey | ((...args: any[]) => void),
    once,
    sync
  );
}

export function removeListener<Target>(
  obj: object,
  eventName: string,
  target: Target,
  method: PropertyKey | ((this: Target, ...args: any[]) => void)
): void;
export function removeListener(
  obj: object,
  eventName: string,
  method: PropertyKey | ((...args: any[]) => void)
): void;
export function removeListener(
  obj: object,
  eventName: string,
  target: object | PropertyKey | ((...args: any[]) => void) | null,
  method?: PropertyKey | ((...args: any[]) => void)
): void {
  deprecateUntil(
    'Importing `removeListener` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalRemoveListener(
    obj,
    eventName,
    target as any,
    method as string | ((...args: any[]) => void)
  );
}

export const sendEvent = (...args: Parameters<typeof originalSendEvent>) => {
  deprecateUntil(
    'Importing `sendEvent` from `@ember/object/events` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return originalSendEvent(...args);
};
