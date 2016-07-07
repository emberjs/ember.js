/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';

export default Service.extend({
  _routing: Ember.inject.service('-routing'),

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
