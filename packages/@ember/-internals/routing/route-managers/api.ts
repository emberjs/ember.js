/**
  Route Manager API. The contract lives in `router_js` (so it has no upward
  dependency on `@ember/routing`); this module re-exports it for `@ember`-layer
  consumers and defines `RouteManagerFactory`, which is `@ember`-specific
  because it references `Owner`.
*/

import type Owner from '@ember/owner';
import type { RouteManager } from 'router_js';

export { routeCapabilities, hasClassicInterop } from 'router_js';
export type {
  RouteManager,
  RouteManagerWithClassicInterop,
  RouteStateBucket,
  RouteCapabilities,
  RouteCapabilitiesVersions,
  NavigationState,
  NavigationActions,
  AsyncNavigationState,
  ClassicInteropArgs,
  WillEnterState,
  EnterState,
  DidEnterState,
  WillExitState,
  ExitState,
  DidExitState,
  ClassicWillEnterState,
  ClassicEnterState,
  ClassicDidEnterState,
  ClassicWillExitState,
  ClassicExitState,
  ClassicDidExitState,
  CreateRouteArgs,
} from 'router_js';

/**
  Factory function the user passes to `setRouteManager`. The router calls it
  once per owner and caches the result.
 */
export type RouteManagerFactory<O extends Owner = Owner, M extends RouteManager = RouteManager> = (
  owner: O
) => M;
