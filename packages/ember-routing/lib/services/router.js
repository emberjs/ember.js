/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import { readOnly } from 'ember-runtime/computed/computed_macros';
import { get } from 'ember-metal/property_get';
import RouterDSL from '../system/dsl';

const RouterService = Service.extend({
  currentRouteName: readOnly('router.currentRouteName'),
  currentURL: readOnly('router.location.path'),
  location: readOnly('router.location'),
  rootUrL: readOnly('router.rootURL'),

  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    See [Route.transitionTo](http://emberjs.com/api/classes/Ember.Route.html#method_transitionTo) for more info.

    @method transitionTo
    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used while
      transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @return {Transition} the transition object associated with this
      attempted transition
    @public
  */
  transitionTo() {
    let router = get(this, 'router');

    router.transitionTo(...arguments);
  },

  replaceWith() {
    let router = get(this, 'router');

    router.replaceWith(...arguments);
  },

  isActive() {
    let router = get(this, 'router');

    return router.isActive(...arguments);
  },

  isActiveTarget() {
    let router = get(this, 'router');

    return router.isActiveTarget(...arguments);
  },

  urlFor() {
    let router = get(this, 'router');

    return router.generate(...arguments);
  }
});

RouterService.map = RouterDSL.map;

export default RouterService;
