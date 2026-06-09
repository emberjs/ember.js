/**
  Internal barrel for the route manager API. Re-exports the public surface so
  consumers inside `@ember/-internals` can import from a single place.
*/

export { routeCapabilities, hasClassicInterop } from './api';

export type {
  RouteManager,
  RouteManagerFactory,
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
  CreateRouteArgs,
} from './api';

export { setRouteManager, getRouteManager } from './registry';
