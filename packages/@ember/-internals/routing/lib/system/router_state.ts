import Router, { ModelFor, TransitionState } from 'router_js';
import { shallowEqual } from '../utils';
import Route from './route';
import EmberRouter from './router';

export default class RouterState<R extends Route> {
  router: Router<R>;
  emberRouter: EmberRouter<R>;
  routerJsState: TransitionState<R>;
  constructor(emberRouter: EmberRouter<R>, router: Router<R>, routerJsState: TransitionState<R>) {
    this.emberRouter = emberRouter;
    this.router = router;
    this.routerJsState = routerJsState;
  }

  isActiveIntent(
    routeName: string,
    models: ModelFor<R>[],
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
