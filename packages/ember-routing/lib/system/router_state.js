import { assign } from 'ember-utils';
import { shallowEqual } from '../utils';

export default class RouterState {
  constructor(emberRouter = null, routerJs = null, routerJsState = null) {
    this.emberRouter = emberRouter;
    this.routerJs = routerJs;
    this.routerJsState = routerJsState;
  }

  isActiveIntent(routeName, models, queryParams, queryParamsMustMatch) {
    let state = this.routerJsState;
    if (!this.routerJs.isActiveIntent(routeName, models, null, state)) {
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
