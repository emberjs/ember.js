import { assign } from '@ember/polyfills';
import Router from 'router_js';
import { shallowEqual } from '../utils';
import EmberRouter, { QueryParam } from './router';

export default class RouterState {
  router: Router;
  emberRouter: EmberRouter;
  routerJsState: null | any;
  constructor(emberRouter: EmberRouter, router: Router, routerJsState: null | any) {
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
