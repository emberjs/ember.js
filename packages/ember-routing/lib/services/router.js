/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import RouteInfo from '../system/route_info';
import alias from

export default Service.extend({
  router: null,
  currentRoute: null, // RouteInfo
  currentRouteName: Ember.computed.alias('currentRoute.name'),
  currentURL: Ember.computed('currentRoute', {
    // serialized string
  }),

  // CURRENT API
  location: null,
  rootURL: null,
  map() {
  },
  willTransition() {
  },
  didTransition() {
  },

  // NEW API
  transitionTo(routeName, [models], queryParams) {
  },
  replaceWith(routeName, [models], queryParams) {
  },

  isActive(routeName, [models], queryParams) {
  },

  url() {
  }
});
