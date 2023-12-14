var __decorate = this && this.__decorate || function (decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
    d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
/**
 * @module @ember/routing/router-service
 */
import { getOwner } from '@ember/-internals/owner';
import Evented from '@ember/object/evented';
import { assert } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
import Service from '@ember/service';
import { consumeTag, tagFor } from '@glimmer/validator';
import EmberRouter from '@ember/routing/router';
import { extractRouteArgs, resemblesURL, shallowEqual } from './lib/utils';
export const ROUTER = Symbol('ROUTER');
function cleanURL(url, rootURL) {
  if (rootURL === '/') {
    return url;
  }
  return url.substring(rootURL.length);
}
class RouterService extends Service.extend(Evented) {
  get _router() {
    let router = this[ROUTER];
    if (router !== undefined) {
      return router;
    }
    let owner = getOwner(this);
    assert('RouterService is unexpectedly missing an owner', owner);
    let _router = owner.lookup('router:main');
    assert('ROUTER SERVICE BUG: Expected router to be an instance of EmberRouter', _router instanceof EmberRouter);
    return this[ROUTER] = _router;
  }
  willDestroy() {
    super.willDestroy();
    this[ROUTER] = undefined;
  }
  /**
     Transition the application into another route. The route may
     be either a single route or route path:
        Calling `transitionTo` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `transitionTo` on a route or `transitionToRoute` on a controller.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.
        In the following example we use the Router service to navigate to a route with a
     specific model from a Component in the first action, and in the second we trigger
     a query-params only transition.
        ```app/components/example.js
     import Component from '@glimmer/component';
     import { action } from '@ember/object';
     import { service } from '@ember/service';
        export default class extends Component {
       @service router;
          @action
       goToComments(post) {
         this.router.transitionTo('comments', post);
       }
          @action
       fetchMoreComments(latestComment) {
         this.router.transitionTo({
           queryParams: { commentsAfter: latestComment }
         });
       }
     }
     ```
        @method transitionTo
     @param {String} [routeNameOrUrl] the name of the route or a URL
     @param {...Object} [models] the model(s) or identifier(s) to be used while
       transitioning to the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters. May be supplied as the only
      parameter to trigger a query-parameter-only transition.
     @return {Transition} the transition object associated with this
       attempted transition
     @public
   */
  transitionTo(...args) {
    if (resemblesURL(args[0])) {
      // NOTE: this `args[0] as string` cast is safe and TS correctly infers it
      // in 3.6+, so it can be removed when TS is upgraded.
      return this._router._doURLTransition('transitionTo', args[0]);
    }
    let {
      routeName,
      models,
      queryParams
    } = extractRouteArgs(args);
    let transition = this._router._doTransition(routeName, models, queryParams, true);
    return transition;
  }
  /**
     Similar to `transitionTo`, but instead of adding the destination to the browser's URL history,
     it replaces the entry for the current route.
     When the user clicks the "back" button in the browser, there will be fewer steps.
     This is most commonly used to manage redirects in a way that does not cause confusing additions
     to the user's browsing history.
        Calling `replaceWith` from the Router service will cause default query parameter values to be included in the URL.
     This behavior is different from calling `replaceWith` on a route.
     See the [Router Service RFC](https://github.com/emberjs/rfcs/blob/master/text/0095-router-service.md#query-parameter-semantics) for more info.
        Usage example:
        ```app/routes/application.js
     import Route from '@ember/routing/route';
     import { service } from '@ember/service';
        export default class extends Route {
       @service router;
       beforeModel() {
         if (!authorized()){
           this.router.replaceWith('unauthorized');
         }
       }
     });
     ```
        @method replaceWith
     @param {String} routeNameOrUrl the name of the route or a URL of the desired destination
     @param {...Object} models the model(s) or identifier(s) to be used while
       transitioning to the route i.e. an object of params to pass to the destination route
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {Transition} the transition object associated with this
       attempted transition
     @public
   */
  replaceWith(...args) {
    return this.transitionTo(...args).method('replace');
  }
  /**
    Generate a URL based on the supplied route name and optionally a model. The
    URL is returned as a string that can be used for any purpose.
       In this example, the URL for the `author.books` route for a given author
    is copied to the clipboard.
       ```app/templates/application.hbs
    <CopyLink @author={{hash id="tomster" name="Tomster"}} />
    ```
       ```app/components/copy-link.js
    import Component from '@glimmer/component';
    import { service } from '@ember/service';
    import { action } from '@ember/object';
       export default class CopyLinkComponent extends Component {
      @service router;
      @service clipboard;
         @action
      copyBooksURL() {
        if (this.author) {
          const url = this.router.urlFor('author.books', this.args.author);
          this.clipboard.set(url);
          // Clipboard now has /author/tomster/books
        }
      }
    }
    ```
       Just like with `transitionTo` and `replaceWith`, `urlFor` can also handle
    query parameters.
       ```app/templates/application.hbs
    <CopyLink @author={{hash id="tomster" name="Tomster"}} />
    ```
       ```app/components/copy-link.js
    import Component from '@glimmer/component';
    import { service } from '@ember/service';
    import { action } from '@ember/object';
       export default class CopyLinkComponent extends Component {
      @service router;
      @service clipboard;
         @action
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
     @param {...Object} models the model(s) for the route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {String} the string representing the generated URL
     @public
   */
  urlFor(routeName, ...args) {
    this._router.setupRouter();
    return this._router.generate(routeName, ...args);
  }
  /**
     Returns `true` if `routeName/models/queryParams` is the active route, where `models` and `queryParams` are optional.
     See [model](api/ember/release/classes/Route/methods/model?anchor=model) and
     [queryParams](/api/ember/3.7/classes/Route/properties/queryParams?anchor=queryParams) for more information about these arguments.
        In the following example, `isActive` will return `true` if the current route is `/posts`.
        ```app/components/posts.js
     import Component from '@glimmer/component';
     import { service } from '@ember/service';
        export default class extends Component {
       @service router;
          displayComments() {
         return this.router.isActive('posts');
       }
     });
     ```
        The next example includes a dynamic segment, and will return `true` if the current route is `/posts/1`,
     assuming the post has an id of 1:
        ```app/components/posts.js
     import Component from '@glimmer/component';
     import { service } from '@ember/service';
        export default class extends Component {
       @service router;
          displayComments(post) {
         return this.router.isActive('posts', post.id);
       }
     });
     ```
        Where `post.id` is the id of a specific post, which is represented in the route as /posts/[post.id].
     If `post.id` is equal to 1, then isActive will return true if the current route is /posts/1, and false if the route is anything else.
        @method isActive
     @param {String} routeName the name of the route
     @param {...Object} models the model(s) or identifier(s) to be used when determining the active route.
     @param {Object} [options] optional hash with a queryParams property
       containing a mapping of query parameters
     @return {boolean} true if the provided routeName/models/queryParams are active
     @public
   */
  isActive(...args) {
    let {
      routeName,
      models,
      queryParams
    } = extractRouteArgs(args);
    let routerMicrolib = this._router._routerMicrolib;
    // When using isActive() in a getter, we want to entagle with the auto-tracking system
    // for example,
    // in
    // get isBarActive() {
    //   return isActive('foo.bar');
    // }
    //
    // you'd expect isBarActive to be dirtied when the route changes.
    //
    // https://github.com/emberjs/ember.js/issues/19004
    consumeTag(tagFor(this._router, 'currentURL'));
    // UNSAFE: casting `routeName as string` here encodes the existing
    // assumption but may be wrong: `extractRouteArgs` correctly returns it as
    // `string | undefined`. There may be bugs if `isActiveIntent` does
    // not correctly account for `undefined` values for `routeName`. Spoilers:
    // it *does not* account for this being `undefined`.
    if (!routerMicrolib.isActiveIntent(routeName, models)) {
      return false;
    }
    let hasQueryParams = Object.keys(queryParams).length > 0;
    if (hasQueryParams) {
      // UNSAFE: casting `routeName as string` here encodes the existing
      // assumption but may be wrong: `extractRouteArgs` correctly returns it
      // as `string | undefined`. There may be bugs if `_prepareQueryParams`
      // does not correctly account for `undefined` values for `routeName`.
      //  Spoilers: under the hood this currently uses router.js APIs which
      // *do not* account for this being `undefined`.
      let targetRouteName = routeName;
      queryParams = Object.assign({}, queryParams);
      this._router._prepareQueryParams(targetRouteName, models, queryParams, true /* fromRouterService */);
      let currentQueryParams = Object.assign({}, routerMicrolib.state.queryParams);
      this._router._prepareQueryParams(targetRouteName, models, currentQueryParams, true /* fromRouterService */);
      return shallowEqual(queryParams, currentQueryParams);
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
     import { service } from '@ember/service';
        export default class extends Component {
       @service router;
       path = '/';
          click() {
         if (this.router.recognize(this.path)) {
           this.router.transitionTo(this.path);
         }
       }
     }
     ```
         @method recognize
      @param {String} url
      @return {RouteInfo | null}
      @public
    */
  recognize(url) {
    assert(`You must pass a url that begins with the application's rootURL "${this.rootURL}"`, url.indexOf(this.rootURL) === 0);
    this._router.setupRouter();
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
      @return {RouteInfo}
      @public
   */
  recognizeAndLoad(url) {
    assert(`You must pass a url that begins with the application's rootURL "${this.rootURL}"`, url.indexOf(this.rootURL) === 0);
    this._router.setupRouter();
    let internalURL = cleanURL(url, this.rootURL);
    return this._router._routerMicrolib.recognizeAndLoad(internalURL);
  }
  /**
    You can register a listener for events emitted by this service with `.on()`:
       ```app/routes/contact-form.js
    import Route from '@ember/routing';
    import { service } from '@ember/service';
       export default class extends Route {
      @service router;
         activate() {
        this.router.on('routeWillChange', (transition) => {
          if (!transition.to.find(route => route.name === this.routeName)) {
            alert("Please save or cancel your changes.");
            transition.abort();
          }
        })
      }
    }
    ```
       @method on
    @param {String} eventName
    @param {Function} callback
    @public
  */
  /**
    You can unregister a listener for events emitted by this service with `.off()`:
       ```app/routes/contact-form.js
    import Route from '@ember/routing';
    import { service } from '@ember/service';
       export default class ContactFormRoute extends Route {
      @service router;
         callback = (transition) => {
        if (!transition.to.find(route => route.name === this.routeName)) {
          alert('Please save or cancel your changes.');
          transition.abort();
        }
      };
         activate() {
        this.router.on('routeWillChange', this.callback);
      }
         deactivate() {
        this.router.off('routeWillChange', this.callback);
      }
    }
    ```
       @method off
    @param {String} eventName
    @param {Function} callback
    @public
  */
  /**
    The `routeWillChange` event is fired at the beginning of any
    attempted transition with a `Transition` object as the sole
    argument. This action can be used for aborting, redirecting,
    or decorating the transition from the currently active routes.
       A good example is preventing navigation when a form is
    half-filled out:
       ```app/routes/contact-form.js
    import Route from '@ember/routing';
    import { service } from '@ember/service';
       export default class extends Route {
      @service router;
         activate() {
        this.router.on('routeWillChange', (transition) => {
          if (!transition.to.find(route => route.name === this.routeName)) {
            alert("Please save or cancel your changes.");
            transition.abort();
          }
        })
      }
    }
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
    import Route from '@ember/routing';
    import { service } from '@ember/service';
       export default class extends Route {
      @service router;
         activate() {
        this.router.on('routeDidChange', (transition) => {
          ga.send('pageView', {
            current: transition.to.name,
            from: transition.from.name
          });
        })
      }
    }
    ```
       `routeDidChange` will be called after any `Route`'s
    [didTransition](/ember/release/classes/Route/events/didTransition?anchor=didTransition)
    action has been fired.
    The updates of properties
    [currentURL](/ember/release/classes/RouterService/properties/currentURL?anchor=currentURL),
    [currentRouteName](/ember/release/classes/RouterService/properties/currentURL?anchor=currentRouteName)
    and
    [currentRoute](/ember/release/classes/RouterService/properties/currentURL?anchor=currentRoute)
    are completed at the time `routeDidChange` is called.
       @event routeDidChange
    @param {Transition} transition
    @public
  */
  /**
   * Refreshes all currently active routes, doing a full transition.
   * If a route name is provided and refers to a currently active route,
   * it will refresh only that route and its descendents.
   * Returns a promise that will be resolved once the refresh is complete.
   * All resetController, beforeModel, model, afterModel, redirect, and setupController
   * hooks will be called again. You will get new data from the model hook.
   *
   * @method refresh
   * @param {String} [routeName] the route to refresh (along with all child routes)
   * @return Transition
   * @public
   */
  refresh(pivotRouteName) {
    if (!pivotRouteName) {
      return this._router._routerMicrolib.refresh();
    }
    assert(`The route "${pivotRouteName}" was not found`, this._router.hasRoute(pivotRouteName));
    assert(`The route "${pivotRouteName}" is currently not active`, this.isActive(pivotRouteName));
    let owner = getOwner(this);
    assert('RouterService is unexpectedly missing an owner', owner);
    let pivotRoute = owner.lookup(`route:${pivotRouteName}`);
    return this._router._routerMicrolib.refresh(pivotRoute);
  }
}
__decorate([readOnly('_router.currentRouteName')], RouterService.prototype, "currentRouteName", void 0);
__decorate([readOnly('_router.currentURL')], RouterService.prototype, "currentURL", void 0);
__decorate([readOnly('_router.location')], RouterService.prototype, "location", void 0);
__decorate([readOnly('_router.rootURL')], RouterService.prototype, "rootURL", void 0);
__decorate([readOnly('_router.currentRoute')], RouterService.prototype, "currentRoute", void 0);
export { RouterService as default };