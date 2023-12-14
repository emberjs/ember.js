declare module '@ember/routing/lib/router_state' {
  import type { ModelFor, TransitionState } from 'router_js';
  import type Router from 'router_js';
  import type Route from '@ember/routing/route';
  import type EmberRouter from '@ember/routing/router';
  export default class RouterState {
    router: Router<Route>;
    emberRouter: EmberRouter;
    routerJsState: TransitionState<Route>;
    constructor(
      emberRouter: EmberRouter,
      router: Router<Route>,
      routerJsState: TransitionState<Route>
    );
    isActiveIntent(
      routeName: string,
      models: ModelFor<Route>[],
      queryParams?: Record<string, unknown>
    ): boolean;
  }
}
