declare module '@ember/routing/router-service' {
  import Evented from '@ember/object/evented';
  import Service from '@ember/service';
  import type { ModelFor, Transition } from 'router_js';
  import type Route from '@ember/routing/route';
  import EmberRouter from '@ember/routing/router';
  import type { RouteInfo, RouteInfoWithAttributes } from '@ember/routing/-internals';
  import type { RouteArgs, RouteOptions } from '@ember/routing/lib/utils';
  export const ROUTER: unique symbol;
  /**
       The Router service is the public API that provides access to the router.

       The immediate benefit of the Router service is that you can inject it into components,
       giving them a friendly way to initiate transitions and ask questions about the current
       global router state.

       In this example, the Router service is injected into a component to initiate a transition
       to a dedicated route:

       ```app/components/example.js
       import Component from '@glimmer/component';
       import { action } from '@ember/object';
       import { service } from '@ember/service';

       export default class ExampleComponent extends Component {
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
  interface RouterService extends Evented {
    on(
      eventName: 'routeWillChange' | 'routeDidChange',
      callback: (transition: Transition) => void
    ): this;
  }
  const RouterService_base: Readonly<typeof Service> &
    (new (owner?: import('@ember/-internals/owner').default | undefined) => Service) &
    import('@ember/object/mixin').default;
  class RouterService extends RouterService_base {
    [ROUTER]?: EmberRouter;
    get _router(): EmberRouter;
    willDestroy(): void;
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
    transitionTo(...args: RouteArgs): Transition;
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
    replaceWith(...args: RouteArgs): Transition;
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
    urlFor<R extends Route>(
      routeName: string,
      ...args: ModelFor<R>[] | [...ModelFor<R>[], RouteOptions]
    ): string;
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
    isActive(...args: RouteArgs): boolean;
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
    recognize(url: string): RouteInfo | null;
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
    recognizeAndLoad(url: string): Promise<RouteInfoWithAttributes>;
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
    refresh(pivotRouteName?: string): Transition;
    /**
         Name of the current route.
      
          This property represents the logical name of the route,
          which is dot separated.
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
          @type {String | null}
          @public
        */
    readonly currentRouteName: this['_router']['currentRouteName'];
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
    readonly currentURL: this['_router']['currentURL'];
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
          `hash`, `history`, `none`.
      
          See [HashLocation](/ember/release/classes/HashLocation).
          See [HistoryLocation](/ember/release/classes/HistoryLocation).
          See [NoneLocation](/ember/release/classes/NoneLocation).
      
          @property location
          @default 'hash'
          @see {Location}
          @public
        */
    readonly location: this['_router']['location'];
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
    readonly rootURL: this['_router']['rootURL'];
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
            import Component from '@glimmer/component';
            import { service } from '@ember/service';
            import { notEmpty } from '@ember/object/computed';
      
            export default class extends Component {
              @service router;
      
              @notEmpty('router.currentRoute.child') isChildRoute;
            });
          ```
      
          @property currentRoute
          @type RouteInfo
          @public
        */
    readonly currentRoute: this['_router']['currentRoute'];
  }
  export { RouterService as default, type RouteInfo, type RouteInfoWithAttributes };
}
