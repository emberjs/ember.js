import { assign } from '@ember/polyfills';
import Router, { TransitionState } from 'router_js';
import { shallowEqual } from '../utils';
import Route from './route';
import EmberRouter, { QueryParam } from './router';

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
    models: {}[],
    queryParams: QueryParam,
    queryParamsMustMatch?: boolean
  ) {
    let state = this.routerJsState;
    if (!this.router.isActiveIntent(routeName, models, undefined, state)) {
      return false;
    }

    if (queryParamsMustMatch && Object.keys(queryParams).length > 0) {
      let visibleQueryParams = assign({}, queryParams);

      this.emberRouter._prepareQueryParams(routeName, models, visibleQueryParams);
      return shallowEqual(visibleQueryParams, state.queryParams);
    }

    return true;
  }
}
