export { default as LinkTo } from '@ember/-internals/glimmer/lib/components/link-to';

export { routeCapabilities } from '@ember/-internals/routing/route-managers/api';
export { setRouteManager } from '@ember/-internals/routing/route-managers/registry';

export type {
  RouteManager,
  RouteManagerFactory,
  RouteStateBucket,
  RouteCapabilities,
  RouteCapabilitiesVersions,
  NavigationState,
  NavigationActions,
  AsyncNavigationState,
  WillEnterState,
  EnterState,
  DidEnterState,
  WillExitState,
  ExitState,
  DidExitState,
  CreateRouteArgs,
} from '@ember/-internals/routing/route-managers/api';
