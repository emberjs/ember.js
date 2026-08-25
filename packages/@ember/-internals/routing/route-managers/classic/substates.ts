/**
  Classic substate detection for the route manager. Walks the active
  transition's route hierarchy looking for a `*_<state>` or `*.<state>` route
  matching the route currently resolving (or erroring) and returns its name.
  Entering the substate is the manager's job.

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
import { hasClassicInterop, STATE_SYMBOL } from 'router_js';

// Substates are classic only. A classic route has a `foo.loading`
// sibling, and only it carries the owner and names the lookup needs.
function classicRouteFor(routeInfo: InternalRouteInfo<Route>): Route | undefined {
  const { manager, bucket } = routeInfo;

  if (manager === undefined || bucket === undefined || !hasClassicInterop(manager)) {
    return undefined;
  }

  return manager.getRoute(bucket) as Route;
}

export type ActiveTransition = {
  isActive: boolean;
  pivotBucket?: unknown;
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
function routeHasBeenDefined(owner: Owner, router: any, localName: string, fullName: string) {
  let routerHasRoute = router.hasRoute(fullName);
  let ownerHasRoute =
    owner.factoryFor(`template:${localName}`) || owner.factoryFor(`route:${localName}`);
  return routerHasRoute && ownerHasRoute;
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
export function findSubstateName(
  originRoute: Route | undefined,
  transition: ActiveTransition,
  state: 'loading' | 'error'
): string {
  const routeInfos = transition[STATE_SYMBOL]?.routeInfos ?? [];
  const pivotBucket = transition.pivotBucket;

  const originIndex =
    originRoute === undefined
      ? -1
      : routeInfos.findIndex((candidate) => candidate?.route === originRoute);
  const originRouteInfo = originIndex >= 0 ? routeInfos[originIndex] : undefined;
  const startIndex = originIndex >= 0 ? originIndex : routeInfos.length - 1;

  for (let i = startIndex; i >= 0; i--) {
    const ancestorRouteInfo = routeInfos[i];
    if (ancestorRouteInfo === undefined) continue;

    const ancestorRoute = classicRouteFor(ancestorRouteInfo);
    if (!ancestorRoute) continue;

    if (ancestorRouteInfo !== originRouteInfo) {
      const stateName = findRouteStateName(ancestorRoute, state);
      if (stateName) return stateName;
    }

    const substateName = findRouteSubstateName(ancestorRoute, state);
    if (substateName) return substateName;

    if (
      state === 'loading' &&
      pivotBucket !== undefined &&
      pivotBucket === ancestorRouteInfo.bucket
    )
      break;
  }

  return '';
}
