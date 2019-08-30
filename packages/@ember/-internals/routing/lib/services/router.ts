import { Evented } from '@ember/-internals/runtime';
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

function cleanURL(url: string, rootURL: string) {
  if (rootURL === '/') {
    return url;
  }

  return url.substr(rootURL.length, url.length);
}

/**
   The Router service is the public API that provides access to the router.

   The immediate benefit of the Router service is that you can inject it into components,
   giving them a friendly way to initiate transitions and ask questions about the current
   global router state.

   In this example, the Router service is injected into a component to initiate a transition
   to a dedicated route:

   ```javascript
   import Component from '@glimmer/component';
   import { action } from '@ember/object';
   import { inject as service } from '@ember/service';

   export default class extends Component {
     @service router;

     @action
     next() {
       this.router.transitionTo('other.route');
     }
   }
   ```

   Like any service, it can also be injected into helpers, routes, etc.

   @public
   @extends Service
   @class RouterService
 */
export default class RouterService extends Service {
  _router!: EmberRouter;

  init() {
    super.init(...arguments);

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
  }

  /**
     Transition the application into another route. The route may
     be either a single route or route path:

     See [transitionTo](/ember/release/classes/Route/methods/transitionTo?anchor=transitionTo) for more info.

     Calling `transitionTo` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `transitionTo` on a route or `transitionToRoute` on a controller.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.

     In the following example we use the Router service to navigate to a route with a
     specific model from a Component.

     ```javascript
     import Component from '@ember/component';
     import { inject as service } from '@ember/service';

     export default Component.extend({
       router: service(),

       actions: {
         goToComments(post) {
           this.router.transitionTo('comments', post);
         }
       }
     });
     ```

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

     See [replaceWith](/ember/release/classes/Route/methods/replaceWith?anchor=replaceWith) for more info.

     Calling `replaceWith` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `replaceWith` on a route.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.

     Usage example:

     ```app/routes/application.js
     import Route from '@ember/routing/route';

     export default Route.extend({
       beforeModel() {
         if (!authorized()){
           this.replaceWith('unauthorized');
         }
       }
     });
     ```

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
    Generate a URL based on the supplied route name and optionally a model. The
    URL is returned as a string that can be used for any purpose.

    In this example, the URL for the `author.books` route for a given author
    is copied to the clipboard.

    ```app/components/copy-link.js
    import Component from '@glimmer/component';
    import { inject as service } from '@ember/service';

    export default class extends Component {
      @service router;
      @service clipboard;

      // Provided` in the template
      // { id: 'tomster', name: 'Tomster' }
      author: null,
      
      copyBooksURL() {
        if (this.author) {
          const url = this.router.urlFor('author.books', this.author);
          this.clipboard.set(url);
          // Clipboard now has /author/tomster/books
        }
      }
    }

    Just like with `transitionTo` and `replaceWith`, `urlFor` can also handle
    query parameters.

    ```app/components/copy-link.js
    import Component from '@glimmer/component';
    import { inject as service } from '@ember/service';

    export default class extends Component {
      @service router;
      @service clipboard;

      // Provided in the template
      // { id: 'tomster', name: 'Tomster' }
      author: null,
  
      copyOnlyEmberBooksURL() {
        if (this.author) {
          const url = this.router.urlFor('author.books', this.author, {
            queryParams: { filter: 'emberjs' }
          });
          this.clipboard.set(url);
          // Clipboard now has /author/tomster/books?filter=emberjs
        }
      }
    }
    ```

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

  /**
     Takes a string URL and returns a `RouteInfo` for the leafmost route represented
     by the URL. Returns `null` if the URL is not recognized. This method expects to
     receive the actual URL as seen by the browser including the app's `rootURL`.

     See [RouteInfo](/ember/release/classes/RouteInfo) for more info.

     In the following example `recognize` is used to verify if a path belongs to our
     application before transitioning to it.

     ```
     import Component from '@ember/component';
     import { inject as service } from '@ember/service';

     export default Component.extend({
       router: service(),
       path: '/',

       click() {
         if(this.router.recognize(this.path)) {
           this.router.transitionTo(this.path);
         }
       }
     });
     ```

      @method recognize
      @param {String} url
      @public
    */
  recognize(url: string) {
    assert(
      `You must pass a url that begins with the application's rootURL "${this.rootURL}"`,
      url.indexOf(this.rootURL) === 0
    );
    let internalURL = cleanURL(url, this.rootURL);
    return this._router._routerMicrolib.recognize(internalURL);
  }

  /**
    Takes a string URL and returns a promise that resolves to a
    `RouteInfoWithAttributes` for the leafmost route represented by the URL.
    The promise rejects if the URL is not recognized or an unhandled exception
    is encountered. This method expects to receive the actual URL as seen by
    the browser including the app's `rootURL`.

      @method recognizeAndLoad
      @param {String} url
      @public
   */
  recognizeAndLoad(url: string) {
    assert(
      `You must pass a url that begins with the application's rootURL "${this.rootURL}"`,
      url.indexOf(this.rootURL) === 0
    );
    let internalURL = cleanURL(url, this.rootURL);
    return this._router._routerMicrolib.recognizeAndLoad(internalURL);
  }

  /**
    The `routeWillChange` event is fired at the beginning of any
    attempted transition with a `Transition` object as the sole
    argument. This action can be used for aborting, redirecting,
    or decorating the transition from the currently active routes.

    A good example is preventing navigation when a form is
    half-filled out:

    ```app/routes/contact-form.js
    import { inject as service } from '@ember/service';

    export default Route.extend({
      router: service('router'),
      init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
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
    @public
  */

  /**
    The `routeDidChange` event only fires once a transition has settled.
    This includes aborts and error substates. Like the `routeWillChange` event
    it receives a Transition as the sole argument.

    A good example is sending some analytics when the route has transitioned:

    ```app/routes/contact-form.js
    import { inject as service } from '@ember/service';

    export default Route.extend({
      router: service('router'),
      init() {
        this._super(...arguments);
        this.router.on('routeDidChange', (transition) => {
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
    @public
  */
}

RouterService.reopen(Evented, {
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
    The `location` property returns what implementation of the `location` API
    your application is using, which determines what type of URL is being used.

    See [Location](/ember/release/classes/Location) for more information.

    To force a particular `location` API implementation to be used in your
    application you can set a location type on your `config/environment`.
    For example, to set the `history` type:

    ```config/environment.js
    'use strict';

    module.exports = function(environment) {
      let ENV = {
        modulePrefix: 'router-service',
        environment,
        rootURL: '/',
        locationType: 'history',
        ...
      }
    }
    ```

    The following location types are available by default:
    `auto`, `hash`, `history`, `none`.

    See [HashLocation](/ember/release/classes/HashLocation).
    See [HistoryLocation](/ember/release/classes/HistoryLocation).
    See [NoneLocation](/ember/release/classes/NoneLocation).
    See [AutoLocation](/ember/release/classes/AutoLocation).

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

    If you change the `rootURL` in your environment configuration
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

  /**
    The `currentRoute` property contains metadata about the current leaf route.
    It returns a `RouteInfo` object that has information like the route name,
    params, query params and more.

    See [RouteInfo](/ember/release/classes/RouteInfo) for more info.

    This property is guaranteed to change whenever a route transition
    happens (even when that transition only changes parameters
    and doesn't change the active route).

    Usage example:
    ```app/components/header.js
      import Component from '@ember/component';
      import { inject as service } from '@ember/service';
      import { computed } from '@ember/object';

      export default Component.extend({
        router: service(),

        isChildRoute: computed.notEmpty('router.currentRoute.child')
      });
    ```

     @property currentRoute
     @type RouteInfo
     @public
   */
  currentRoute: readOnly('_router.currentRoute'),
});
