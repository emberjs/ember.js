/**
@module ember
@submodule ember-routing
*/

import {
  Service,
  readOnly
} from 'ember-runtime';
import {
  get,
  isEmpty
} from 'ember-metal';
import { assign } from 'ember-utils';
import RouterDSL from '../system/dsl';


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
  currentState: readOnly('router.currentState'),
  location: readOnly('router.location'),
  rootURL: readOnly('router.rootURL'),
  router: null,

  /**
     Transition the application into another route. The route may
     be either a single route or route path:

     See [Route.transitionTo](https://emberjs.com/api/classes/Ember.Route.html#method_transitionTo) for more info.

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

     See [Route.replaceWith](https://emberjs.com/api/classes/Ember.Route.html#method_replaceWith) for more info.

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
  },

  /**
     Determines whether a route is active.

     @method urlFor
     @param {String} routeName the name of the route
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {String} the string representing the generated URL
     @public
   */
  isActive(/* routeName, ...models, options */) {
    if (!this.router.isActive(...arguments)) { return false; }
debugger;
    let { routeName, models, queryParams } = this._extractArguments(...arguments);
    let emptyQueryParams = Object.keys(queryParams).length;

    if (!emptyQueryParams) {
      let visibleQueryParams = {};
      assign(visibleQueryParams, queryParams);

      this.router._prepareQueryParams(routeName, models, visibleQueryParams);
      return shallowEqual(visibleQueryParams, queryParams);
    }

    return true;
  },

  _extractArguments(...args) {
    let routeName;
    let models;
    let possibleQueryParams = args[args.length - 1];
    let queryParams = {};

    if (possibleQueryParams && possibleQueryParams.hasOwnProperty('queryParams')) {
      queryParams = args.pop().queryParams;
    }

    routeName = args.shift();
    models = args;

    return { routeName, models, queryParams };
  }
});

export default RouterService;
