/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';

export default Service.extend({
  _routing: inject.service('-routing'),

  // NEW API
  transitionTo(routeName, ...models, queryParams, shouldReplace) {
    this.get('_routing').transitionto(
      routeName,
      models,
      queryParams,
      shouldReplace
    );
  },

  replaceWith(routeName, ...models, queryParams) {
  },

  isActive(routeName, ...models, queryParams) {
  },

  isActiveTarget(routeName, ...models, queryParams) {
  },

  urlFor(routeName, ...models, queryParams) {
    return this.get('_routing').generateUrl(
      routeName,
      models,
      queryParams
    );
  }
});
