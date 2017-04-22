/**
@module ember
@submodule ember-routing
*/

import {
  Service,
  readOnly
} from 'ember-runtime';

/**
   The Router service is the public API that provides component/view layer
   access to the router.

   @public
   @class RouterService
   @category ember-routing-router-service
 */
const RouterService = Service.extend({
  currentRouteName: readOnly('router.currentRouteName'),
  currentURL: readOnly('router.currentURL'),
  location: readOnly('router.location'),
  rootURL: readOnly('router.rootURL'),
  router: null,

  /**
     Transition the application into another route. The route may
     be either a single route or route path:

     See [Route.transitionTo](http://emberjs.com/api/classes/Ember.Route.html#method_transitionTo) for more info.

     @method transitionTo
     @category ember-routing-router-service
     @param {String} routeNameOrUrl the name of the route or a URL
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {Transition} the transition object associated with this
       attempted transition
     @public
   */
  transitionTo(/* routeNameOrUrl, ...models, options */) {
    return this.router.transitionTo(...arguments);
  },

  /**
     Transition into another route while replacing the current URL, if possible.
     The route may be either a single route or route path:

     See [Route.replaceWith](http://emberjs.com/api/classes/Ember.Route.html#method_replaceWith) for more info.

     @method replaceWith
     @category ember-routing-router-service
     @param {String} routeNameOrUrl the name of the route or a URL
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {Transition} the transition object associated with this
       attempted transition
     @public
   */
  replaceWith(/* routeNameOrUrl, ...models, options */) {
    return this.router.replaceWith(...arguments);
  },

  /**
     Generate a URL based on the supplied route name.

     @method urlFor
     @param {String} routeName the name of the route
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {String} the string representing the generated URL
     @public
   */
  urlFor(/* routeName, ...models, options */) {
    return this.router.generate(...arguments);
  }
});

export default RouterService;
