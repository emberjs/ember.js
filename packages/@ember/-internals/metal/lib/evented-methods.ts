import { addListener, removeListener, hasListeners, sendEvent } from './events';
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';

/*
  Standalone implementations of the deprecated `Evented` methods. They are
  shared between the `Evented` mixin and the framework classes (`Component`,
  `Route`, `EmberRouter`) that historically included it, so that the framework
  itself no longer applies the deprecated mixin.
*/

export function eventedOn(
  obj: object,
  name: string,
  target: object | Function | null,
  method?: Function | PropertyKey
): void {
  deprecateUntil(
    '`Evented#on` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  addListener(obj, name, target, method);
}

export function eventedOne(
  obj: object,
  name: string,
  target: object | Function | null,
  method?: Function | PropertyKey
): void {
  deprecateUntil(
    '`Evented#one` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  addListener(obj, name, target, method, true);
}

export function eventedTrigger(obj: object, name: string, args: any[]): void {
  deprecateUntil(
    '`Evented#trigger` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  sendEvent(obj, name, args);
}

export function eventedOff(
  obj: object,
  name: string,
  target: object | Function | null,
  method?: string | Function
): void {
  deprecateUntil(
    '`Evented#off` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  removeListener(obj, name, target, method);
}

export function eventedHas(obj: object, name: string): boolean {
  deprecateUntil(
    '`Evented#has` is deprecated. Use native JavaScript events or a dedicated event library instead.',
    DEPRECATIONS.DEPRECATE_EVENTED
  );
  return hasListeners(obj, name);
}
