import type Controller from '@ember/controller';
import type Route from '@ember/routing/route';

export class ClassicRouteBucket {
  // Cached invokable returned from getInvokable.
  invokable: object | undefined = undefined;

  // Cached wrapper definition returned from getRouteWrapper. Stable across
  // re-renders for outlet identity stability.
  wrapper: object | undefined = undefined;

  // Resolved controller for the route, eagerly populated during willEnter
  // so the outlet can curry @controller before the model resolves.
  controller: Controller | undefined = undefined;

  // Runloop timer for the pending loading-substate transition scheduled
  // during willEnter. Per-bucket so concurrent routes track their own
  // timers and didEnter can cancel the right one.
  loadingSubstateTimer: unknown = null;

  constructor(public route: Route) {}
}
