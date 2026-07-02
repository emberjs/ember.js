export { default } from './lib/router';
export {
  default as InternalTransition,
  logAbort,
  STATE_SYMBOL,
  PARAMS_SYMBOL,
  QUERY_PARAMS_SYMBOL,
} from './lib/transition';

export type { PublicTransition as Transition } from './lib/transition';

export { default as TransitionState, TransitionError } from './lib/transition-state';
export {
  default as InternalRouteInfo,
  type BaseRoute,
  type RouteInfo,
  type RouteInfoWithAttributes,
  type ModelFor,
} from './lib/route-info';

export { throwIfAborted } from './lib/transition-aborted-error';

export { routeCapabilities, hasClassicInterop } from './lib/route-manager';
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
  CreateRouteArgs,
} from './lib/route-manager';
