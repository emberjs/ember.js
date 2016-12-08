import { assign } from 'ember-utils';
import { isEmpty } from 'ember-metal';
import { Object as EmberObject } from 'ember-runtime';

export default EmberObject.extend({
  emberRouter: null,
  routerJs: null,
  routerJsState: null,

  isActiveIntent(routeName, models, queryParams, queryParamsMustMatch) {
    let state = this.routerJsState;
    if (!this.routerJs.isActiveIntent(routeName, models, null, state)) { return false; }

    let emptyQueryParams = isEmpty(Object.keys(queryParams));

    if (queryParamsMustMatch && !emptyQueryParams) {
      let visibleQueryParams = {};
      assign(visibleQueryParams, queryParams);

      this.emberRouter._prepareQueryParams(routeName, models, visibleQueryParams);
      return shallowEqual(visibleQueryParams, state.queryParams);
    }

    return true;
  }
});

function shallowEqual(a, b) {
  let k;
  for (k in a) {
    if (a.hasOwnProperty(k) && a[k] !== b[k]) { return false; }
  }
  for (k in b) {
    if (b.hasOwnProperty(k) && a[k] !== b[k]) { return false; }
  }
  return true;
}
