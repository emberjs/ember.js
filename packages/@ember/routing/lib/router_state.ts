import type { ModelFor, TransitionState } from 'router_js';
import type Router from 'router_js';
import { shallowEqual } from './utils';
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
  ) {
    this.emberRouter = emberRouter;
    this.router = router;
    this.routerJsState = routerJsState;
  }

  isActiveIntent(
    routeName: string,
    models: ModelFor<Route>[],
    queryParams?: Record<string, unknown>
  ): boolean {
    let state = this.routerJsState;
    if (!this.router.isActiveIntent(routeName, models, undefined, state)) {
      return false;
    }

    if (queryParams !== undefined && Object.keys(queryParams).length > 0) {
      let visibleQueryParams = Object.assign({}, queryParams);

      this.emberRouter._prepareQueryParams(routeName, models, visibleQueryParams);
      return shallowEqual(visibleQueryParams, state.queryParams);
    }

    return true;
  }
}
