import { addObserver, flushAsyncObservers } from '@ember/-internals/metal/lib/observer';

/*
  The controller-query-params system's only entry points into the observer
  machinery, isolated here so builds can sever the dependency (by swapping
  this module for no-ops) once a query-params implementation that does not
  observe controller properties exists. See RFC #1169 for the direction.
*/

export function observeControllerQueryParam(controller: unknown, prop: string): void {
  addObserver(
    controller as object,
    `${prop}.[]`,
    controller as object,
    (controller as { _qpChanged: (controller: unknown, prop: string) => void })._qpChanged,
    false
  );
}

export function flushQueryParamObservers(): void {
  flushAsyncObservers(false);
}
