declare module '@ember/routing/lib/routing-service' {
  /**
    @module ember
    */
  import Service from '@ember/service';
  import type { ModelFor } from 'router_js';
  import type Route from '@ember/routing/route';
  import EmberRouter from '@ember/routing/router';
  import type { RouterState } from '@ember/routing/-internals';
  import { ROUTER } from '@ember/routing/router-service';
  /**
      The Routing service is used by LinkTo, and provides facilities for
      the component/view layer to interact with the router.

      This is a private service for internal usage only. For public usage,
      refer to the `Router` service.

      @private
      @class RoutingService
    */
  export default class RoutingService<R extends Route> extends Service {
    targetState: EmberRouter['targetState'];
    currentState: EmberRouter['currentState'];
    currentRouteName: EmberRouter['currentRouteName'];
    currentPath: EmberRouter['currentPath'];
    [ROUTER]?: EmberRouter;
    get router(): EmberRouter;
    hasRoute(routeName: string): boolean;
    transitionTo(
      routeName: string,
      models: ModelFor<R>[],
      queryParams: Record<string, unknown>,
      shouldReplace: boolean
    ): import('router_js').Transition;
    normalizeQueryParams(
      routeName: string,
      models: ModelFor<R>[],
      queryParams: Record<string, unknown>
    ): void;
    _generateURL(
      routeName: string,
      models: ModelFor<R>[],
      queryParams: Record<string, unknown>
    ): string;
    generateURL(
      routeName: string,
      models: ModelFor<R>[],
      queryParams: Record<string, unknown>
    ): string | undefined;
    isActiveForRoute(
      contexts: ModelFor<R>[],
      queryParams: Record<string, unknown> | undefined,
      routeName: string,
      routerState: RouterState
    ): boolean;
  }
}
