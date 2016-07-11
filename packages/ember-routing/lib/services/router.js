/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';

export default Service.extend({
  _routing: inject.service('-routing'),

  transitionTo(routeName, ...models) {
    let queryParams = models.pop();

    this.get('_routing').transitionTo(
      routeName,
      models,
      queryParams
    );
  },

  replaceWith(routeName, ...models) {
    let queryParams = models.pop();
    let shouldReplace = true;

    this.get('_routing').transitionTo(
      routeName,
      models,
      queryParams,
      shouldReplace
    );
  },

  isActive(routeName, ...models) {
  },

  isActiveTarget(routeName, ...models) {
  },

  urlFor(routeName, models, queryParams) {
    return this.get('_routing').generateUrl(
      routeName,
      models,
      queryParams
    );
  }
});
