/**
  Classic substate detection for the route manager. Walks the active
  transition's route hierarchy looking for a `*_<state>` or `*.<state>` route
  matching the route currently resolving (or erroring) and triggers an
  intermediate transition into it.

  Mirrors the original `defaultActionHandlers.loading` and
  `defaultActionHandlers.error` + `forEachRouteAbove` machinery that lived
  in `router_js`. Moved here because substates are a classic-interop concern,
  not a router_js responsibility.
*/

import { assert } from '@ember/debug';
import type Owner from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import type Route from '@ember/routing/route';
import type EmberRouter from '@ember/routing/router';
import type { InternalRouteInfo } from 'router_js';
import { getManagedRoute, hasClassicInterop, STATE_SYMBOL } from 'router_js';
import type { ClassicRouteBucket } from './bucket';

export type ActiveTransition = {
  isActive: boolean;
  pivotHandler?: unknown;
  trigger?(ignoreFailure: boolean, name: string, ...args: unknown[]): void;
  [STATE_SYMBOL]?: { routeInfos: InternalRouteInfo<Route>[] };
};

/**
  Finds the name of the substate route if it exists for the given route. A
  substate route is of the form `route_state`, such as `foo_loading`.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteSubstateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let managed = getManagedRoute(route);
  if (managed === undefined || !hasClassicInterop(managed.manager)) {
    return '';
  }

  let { routeName, fullRouteName, _router: router } = route;

  let substateName = `${routeName}_${state}`;
  let substateNameFull = `${fullRouteName}_${state}`;

  return routeHasBeenDefined(owner, router, substateName, substateNameFull) ? substateNameFull : '';
}

/**
  Finds the name of the state route if it exists for the given route. A state
  route is of the form `route.state`, such as `foo.loading`. Properly Handles
  `application` named routes.

  @private
  @param {Route} route
  @param {String} state
  @return {String}
*/
function findRouteStateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

  let managed = getManagedRoute(route);
  if (managed === undefined || !hasClassicInterop(managed.manager)) {
    return '';
  }

  let { routeName, fullRouteName, _router: router } = route;

  let stateName = routeName === 'application' ? state : `${routeName}.${state}`;
  let stateNameFull = fullRouteName === 'application' ? state : `${fullRouteName}.${state}`;

  return routeHasBeenDefined(owner, router, stateName, stateNameFull) ? stateNameFull : '';
}

/**
  Determines whether or not a route has been defined by checking that the route
  is in the Router's map and the owner has a registration for that route.

  @private
  @param {Owner} owner
  @param {Router} router
  @param {String} localName
  @param {String} fullName
  @return {Boolean}
*/
function routeHasBeenDefined(
  owner: Owner,
  router: any,
  localName: string,
  fullName: string
) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute =
    owner.factoryFor(`template:${localName}`) || owner.factoryFor(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
}

/**
  Fires the classic `loading` event for a slow transition. The event bubbles
  through each route's `actions.loading` handler (public API — apps intercept
  it for custom loading UI, or return `true` to keep bubbling); only if it
  bubbles unhandled does the router's default `loading` action handler
  dispatch back through `ClassicRouteManager.enterLoadingSubstate` to enter
  the substate. Scheduled by the manager's `willEnter`; no-op if the
  transition is no longer active by the time the timer fires.

  @private
  @param {ClassicRouteBucket} bucket
  @param {Transition} transition
 */
export function fireLoadingEvent(bucket: ClassicRouteBucket, transition: ActiveTransition): void {
  if (!transition.isActive) {
    return;
  }

  transition.trigger?.(true, 'loading', transition, bucket.route);
}

/**
  Look up the `loading` substate (if any) for the route that is loading
  slowly and trigger an intermediate transition into it. No-op if the
  transition is no longer active or no matching substate exists.

  Reached via `ClassicRouteManager.enterLoadingSubstate`, which the router's
  default `loading` action handler dispatches to through the classic-interop
  contract once the loading event has bubbled unhandled.

  @private
  @param {EmberRouter} router
  @param {Route|undefined} originRoute the route whose model is slow;
    `undefined` when that route was never created (the walk then starts at
    the transition's leaf)
  @param {Transition} transition
 */
export function enterLoadingSubstate(
  router: EmberRouter,
  originRoute: Route | undefined,
  transition: ActiveTransition
): void {
  if (!transition.isActive) {
    return;
  }

  const substateName = findSubstateName(originRoute, transition, 'loading');
  if (substateName) {
    router.intermediateTransitionTo(substateName);
  }
}

/**
  Look up the `error` substate (if any) for the route that errored and
  trigger an intermediate transition into it, passing the error along so the
  error route's `model` hook receives it. Returns `true` if a substate was
  entered (and the error should be considered handled), `false` otherwise.

  Reached via `ClassicRouteManager.enterErrorSubstate`, which the router's
  default `error` action handler dispatches to through the classic-interop
  contract once the error has bubbled unhandled above the application route.

  @private
  @param {EmberRouter} router
  @param {Route|undefined} originRoute the route that errored; `undefined`
    when the erroring route never got created (the walk then starts at the
    transition's leaf)
  @param {Transition} transition
  @param {Error} error the error that triggered this substate transition
 */
export function enterErrorSubstate(
  router: EmberRouter,
  originRoute: Route | undefined,
  transition: ActiveTransition,
  error: Error
): boolean {
  const substateName = findSubstateName(originRoute, transition, 'error');
  if (!substateName) {
    return false;
  }

  // Mark the error handled before transitioning so it is not re-raised
  // after the substate has taken over rendering it.
  router._markErrorAsHandled(error);
  router.intermediateTransitionTo(substateName, error);
  return true;
}

/**
  Walk up from the route currently being resolved (or erroring) through the
  transition's route hierarchy, returning the name of the closest matching
  `*_<state>` or `*.<state>` substate, or an empty string if none is
  defined.

  Rules:
  - For the originating route itself, only the substate form
    (`foo_loading` / `foo_error`) is considered. The state form
    (`foo.loading` / `foo.error`) is conceptually a child route and is
    "below" where we are, so it should not be entered.
  - For ancestor routes, both forms are considered.
  - A `loading` walk stops at the transition's pivot route; an `error` walk
    does not. This matches the classic router's asymmetry: loading substates
    never appear above the pivot, but an error can be handled arbitrarily
    far up.

  @private
  @param {Route|undefined} originRoute the route currently resolving (or
    erroring); when `undefined` the walk starts at the transition's leaf and
    considers both substate forms everywhere
  @param {Transition} transition the active transition
  @param {String} state the substate to look for, e.g. `loading` or `error`
 */
function findSubstateName(
  originRoute: Route | undefined,
  transition: ActiveTransition,
  state: 'loading' | 'error'
): string {
  const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
  const pivotHandler = transition.pivotHandler;

  const originIndex =
    originRoute === undefined
      ? -1
      : routeInfos.findIndex((candidate) => candidate?.route === originRoute);
  const originRouteInfo = originIndex >= 0 ? routeInfos[originIndex] : undefined;
  const startIndex = originIndex >= 0 ? originIndex : routeInfos.length - 1;

  for (let i = startIndex; i >= 0; i--) {
    const ancestorRouteInfo = routeInfos[i];
    const ancestorRoute = ancestorRouteInfo?.route;
    if (!ancestorRoute) continue;

    if (ancestorRouteInfo !== originRouteInfo) {
      const stateName = findRouteStateName(ancestorRoute, state);
      if (stateName) return stateName;
    }

    const substateName = findRouteSubstateName(ancestorRoute, state);
    if (substateName) return substateName;

    if (state === 'loading' && pivotHandler === ancestorRoute) break;
  }

  return '';
}
