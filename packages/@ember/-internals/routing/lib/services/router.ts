import { Evented } from '@ember/-internals/runtime';
import { EMBER_ROUTING_ROUTER_SERVICE } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
import Service from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { Transition } from 'router_js';
import EmberRouter from '../system/router';
import { extractRouteArgs, resemblesURL, shallowEqual } from '../utils';

let freezeRouteInfo: Function;
if (DEBUG) {
  freezeRouteInfo = (transition: Transition) => {
    if (transition.from !== null && !Object.isFrozen(transition.from)) {
      Object.freeze(transition.from);
    }

    if (transition.to !== null && !Object.isFrozen(transition.to)) {
      Object.freeze(transition.to);
    }
  };
}

/**
   The Router service is the public API that provides access to the router.

   The immediate benefit of the Router service is that you can inject it into components,
   giving them a friendly way to initiate transitions and ask questions about the current
   global router state.

   In this example, the Router service is injected into a component to initiate a transition
   to a dedicated route:
   ```javascript
   import Component from '@ember/component';
   import { inject as service } from '@ember/service';

   export default Component.extend({
     router: service(),

     actions: {
       next() {
         this.get('router').transitionTo('other.route');
       }
     }
   });
   ```

   Like any service, it can also be injected into helpers, routes, etc.

   @public
   @class RouterService
 */
export default class RouterService extends Service {
  _router!: EmberRouter;

  /**
     Transition the application into another route. The route may
     be either a single route or route path:

     See [transitionTo](/api/ember/release/classes/Route/methods/transitionTo?anchor=transitionTo) for more info.

     Calling `transitionTo` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `transitionTo` on a route or `transitionToRoute` on a controller.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.

     @method transitionTo
     @param {String} routeNameOrUrl the name of the route or a URL
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {Transition} the transition object associated with this
       attempted transition
     @public
   */
  transitionTo(...args: string[]) {
    if (resemblesURL(args[0])) {
      return this._router._doURLTransition('transitionTo', args[0]);
    }

    let { routeName, models, queryParams } = extractRouteArgs(args);

    let transition = this._router._doTransition(routeName, models, queryParams, true);
    transition['_keepDefaultQueryParamValues'] = true;

    return transition;
  }

  /**
     Transition into another route while replacing the current URL, if possible.
     The route may be either a single route or route path:

     See [replaceWith](/api/ember/release/classes/Route/methods/replaceWith?anchor=replaceWith) for more info.

     Calling `replaceWith` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `replaceWith` on a route.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.

     @method replaceWith
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
    return this.transitionTo(...arguments).method('replace');
  }

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
  urlFor(routeName: string, ...args: any[]) {
    return this._router.generate(routeName, ...args);
  }

  /**
     Determines whether a route is active.

     @method isActive
     @param {String} routeName the name of the route
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {boolean} true if the provided routeName/models/queryParams are active
     @public
   */
  isActive(...args: any[]) {
    let { routeName, models, queryParams } = extractRouteArgs(args);
    let routerMicrolib = this._router._routerMicrolib;

    if (!routerMicrolib.isActiveIntent(routeName, models)) {
      return false;
    }
    let hasQueryParams = Object.keys(queryParams).length > 0;

    if (hasQueryParams) {
      this._router._prepareQueryParams(
        routeName,
        models,
        queryParams,
        true /* fromRouterService */
      );
      return shallowEqual(queryParams, routerMicrolib.state!.queryParams);
    }

    return true;
  }
}

RouterService.reopen({
  /**
     Name of the current route.

     This property represents the logical name of the route,
     which is comma separated.
     For the following router:

     ```app/router.js
     Router.map(function() {
       this.route('about');
       this.route('blog', function () {
         this.route('post', { path: ':post_id' });
       });
     });
     ```

     It will return:

     * `index` when you visit `/`
     * `about` when you visit `/about`
     * `blog.index` when you visit `/blog`
     * `blog.post` when you visit `/blog/some-post-id`

     @property currentRouteName
     @type String
     @public
   */
  currentRouteName: readOnly('_router.currentRouteName'),

  /**
     Current URL for the application.

    This property represents the URL path for this route.
    For the following router:

     ```app/router.js
     Router.map(function() {
       this.route('about');
       this.route('blog', function () {
         this.route('post', { path: ':post_id' });
       });
     });
     ```

     It will return:

     * `/` when you visit `/`
     * `/about` when you visit `/about`
     * `/blog` when you visit `/blog`
     * `/blog/some-post-id` when you visit `/blog/some-post-id`

     @property currentURL
     @type String
     @public
   */
  currentURL: readOnly('_router.currentURL'),

  /**
    The `location` property determines the type of URL's that your
    application will use.
    The following location types are currently available:
    * `auto`
    * `hash`
    * `history`
    * `none`

    @property location
    @default 'hash'
    @see {Location}
    @public
  */
  location: readOnly('_router.location'),

  /**
    The `rootURL` property represents the URL of the root of
    the application, '/' by default.
    This prefix is assumed on all routes defined on this app.

    IF you change the `rootURL` in your environment configuration
    like so:

    ```config/environment.js
    'use strict';

    module.exports = function(environment) {
      let ENV = {
        modulePrefix: 'router-service',
        environment,
        rootURL: '/my-root',
      …
      }
    ]
    ```

    This property will return `/my-root`.

    @property rootURL
    @default '/'
    @public
  */
  rootURL: readOnly('_router.rootURL'),
});

if (EMBER_ROUTING_ROUTER_SERVICE) {
  const cleanURL = function(url: string, rootURL: string) {
    if (rootURL === '/') {
      return url;
    }

    return url.substr(rootURL.length, url.length);
  };

  RouterService.reopen(Evented, {
    init() {
      this._super(...arguments);
      this._router.on('routeWillChange', (transition: Transition) => {
        if (DEBUG) {
          freezeRouteInfo(transition);
        }
        this.trigger('routeWillChange', transition);
      });

      this._router.on('routeDidChange', (transition: Transition) => {
        if (DEBUG) {
          freezeRouteInfo(transition);
        }

        this.trigger('routeDidChange', transition);
      });
    },

    /**
     A RouteInfo that represents the current leaf route.
     It is guaranteed to change whenever a route transition
     happens (even when that transition only changes parameters
     and doesn't change the active route)

     @property currentRoute
     @type RouteInfo
     @category ember-routing-router-service
     @public
   */
    currentRoute: readOnly('_router.currentRoute'),

    /**
     Takes a string URL and returns a `RouteInfo` for the leafmost route represented
     by the URL. Returns `null` if the URL is not recognized. This method expects to
     receive the actual URL as seen by the browser including the app's `rootURL`.

      @method recognize
      @param {String} url
      @category ember-routing-router-service
      @public
    */
    recognize(url: string) {
      assert(
        `You must pass a url that begins with the application's rootURL "${this.rootURL}"`,
        url.indexOf(this.rootURL) === 0
      );
      let internalURL = cleanURL(url, this.rootURL);
      return this._router._routerMicrolib.recognize(internalURL);
    },

    /**
      Takes a string URL and returns a promise that resolves to a
      `RouteInfoWithAttributes` for the leafmost route represented by the URL.
      The promise rejects if the URL is not recognized or an unhandled exception
      is encountered. This method expects to receive the actual URL as seen by
      the browser including the app's `rootURL`.

        @method recognizeAndLoad
        @param {String} url
        @category ember-routing-router-service
        @public
     */
    recognizeAndLoad(url: string) {
      assert(
        `You must pass a url that begins with the application's rootURL "${this.rootURL}"`,
        url.indexOf(this.rootURL) === 0
      );
      let internalURL = cleanURL(url, this.rootURL);
      return this._router._routerMicrolib.recognizeAndLoad(internalURL);
    },
    /**
      The `routeWillChange` event is fired at the beginning of any
      attempted transition with a `Transition` object as the sole
      argument. This action can be used for aborting, redirecting,
      or decorating the transition from the currently active routes.

      A good example is preventing navigation when a form is
      half-filled out:

      ```app/routes/contact-form.js
      import {inject as service} from '@ember/service';

      export default Route.extend({
        router: service('router'),
        init() {
          this._super(...arguments);
          this.router.on('routeWillUpdate', (transition) => {
            if (!transition.to.find(route => route.name === this.routeName)) {
              alert("Please save or cancel your changes.");
              transition.abort();
            }
          })
        }
      });
      ```

      The `routeWillChange` event fires whenever a new route is chosen as the desired target of a transition. This includes `transitionTo`, `replaceWith`, all redirection for any reason including error handling, and abort. Aborting implies changing the desired target back to where you already were. Once a transition has completed, `routeDidChange` fires.

      @event routeWillChange
      @param {Transition} transition
      @category ember-routing-router-service
      @public
    */

    /**
      The `routeDidChange` event only fires once a transition has settled.
      This includes aborts and error substates. Like the `routeWillChange` event
      it receives a Transition as the sole argument.

      A good example is sending some analytics when the route has transitioned:

      ```app/routes/contact-form.js
      import {inject as service} from '@ember/service';

      export default Route.extend({
        router: service('router'),
        init() {
          this._super(...arguments);
          this.router.on('routeDidUpdate', (transition) => {
            ga.send('pageView', {
              current: transition.to.name,
              from: transition.from.name
            });
          })
        }
      });
      ```

      @event routeDidChange
      @param {Transition} transition
      @category ember-routing-router-service
      @public
    */
  });
}
