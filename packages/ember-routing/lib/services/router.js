/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';

export default Service.extend({
  _routing: inject.service('-routing'),

  transitionTo(routeName, models, queryParams) {
    this.get('_routing').transitionTo(
      routeName,
      models,
      queryParams
    );
  },

  replaceWith(routeName, models, queryParams) {
    let shouldReplace = true;

    this.get('_routing').transitionTo(
      routeName,
      models,
      queryParams,
      shouldReplace
    );
  },

  isActive(routeName, models, queryParams) {
  },

  isActiveTarget(routeName, models, queryParams) {
  },

  urlFor(routeName, models, queryParams) {
    return this.get('_routing').generateUrl(
      routeName,
      models,
      queryParams
    );
  }
});
