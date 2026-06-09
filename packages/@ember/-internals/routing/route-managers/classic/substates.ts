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
import type { InternalRouteInfo } from 'router_js';
import { STATE_SYMBOL } from 'router_js';
import type { ClassicRouteBucket } from './bucket';

type ActiveTransition = {
  isActive: boolean;
  pivotHandler?: unknown;
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
export function findRouteSubstateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

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
export function findRouteStateName(route: Route, state: string) {
  let owner = getOwner(route);
  assert('Route is unexpectedly missing an owner', owner);

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
export function routeHasBeenDefined(
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
  Look up the `loading` substate (if any) for the route in `bucket` and
  trigger an intermediate transition into it. No-op if the transition is no
  longer active or no matching substate exists.

  @private
  @param {ClassicRouteBucket} bucket
  @param {Transition} transition
 */
export function enterLoadingSubstate(
  bucket: ClassicRouteBucket,
  transition: ActiveTransition
): void {
  if (!transition.isActive) {
    return;
  }

  const substateName = findSubstateName(bucket.route, transition, 'loading');
  if (substateName) {
    bucket.route._router.intermediateTransitionTo(substateName);
  }
}

/**
  Look up the `error` substate (if any) for the route in `bucket` and
  trigger an intermediate transition into it. Returns `true` if a substate
  was entered (and the error should be considered handled), `false`
  otherwise.

  Unlike `enterLoadingSubstate`, this passes the `error` along to the
  intermediate transition so the error route's `model` hook receives it.

  @private
  @param {ClassicRouteBucket} bucket
  @param {Transition} transition
  @param {unknown} error the error that triggered this substate transition
 */
export function enterErrorSubstate(
  bucket: ClassicRouteBucket,
  transition: ActiveTransition,
  error: unknown
): boolean {
  const substateName = findSubstateName(bucket.route, transition, 'error');
  if (!substateName) {
    return false;
  }

  bucket.route._router.intermediateTransitionTo(substateName, error);
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
  - The walk stops at the transition's pivot route.

  @private
  @param {Route} originRoute the route currently resolving (or erroring)
  @param {Transition} transition the active transition
  @param {String} state the substate to look for, e.g. `loading` or `error`
 */
function findSubstateName(
  originRoute: Route,
  transition: ActiveTransition,
  state: 'loading' | 'error'
): string {
  const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
  const pivotHandler = transition.pivotHandler;

  let originRouteInfo: InternalRouteInfo<Route> | undefined;
  for (const candidate of routeInfos) {
    if (candidate?.route === originRoute) {
      originRouteInfo = candidate;
      break;
    }
  }
  const originIndex = originRouteInfo ? routeInfos.indexOf(originRouteInfo) : -1;
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

    if (pivotHandler === ancestorRoute) break;
  }

  return '';
}
