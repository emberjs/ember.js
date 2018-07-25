import { assign } from '@ember/polyfills';
import { shallowEqual } from '../utils';

export default class RouterState {
  constructor(emberRouter = null, routerJsState = null) {
    this.emberRouter = emberRouter;
    this.routerJsState = routerJsState;
  }

  isActiveIntent(routeName, models, queryParams, queryParamsMustMatch) {
    let state = this.routerJsState;
    if (!this.emberRouter._isActiveIntent(routeName, models, null, state)) {
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
