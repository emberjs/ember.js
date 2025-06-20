import { getOwner } from '@ember/-internals/owner'; // This is imported from -internals to avoid circularity
import { computed, get } from '@ember/object';
import { FrameworkObject } from '@ember/object/-internals';
import { inject as metalInject } from '@ember/-internals/metal';
import type { DecoratorPropertyDescriptor, ElementDescriptor } from '@ember/-internals/metal';
import type { RouteArgs } from '@ember/routing/-internals';
import type { Transition } from 'router_js';

export type ControllerQueryParamType = 'boolean' | 'number' | 'array' | 'string';
export type ControllerQueryParam =
  | string
  | Record<string, { type: ControllerQueryParamType }>
  | Record<string, string>;

const MODEL = Symbol('MODEL');

/**
@module @ember/controller
*/

// NOTE: This doesn't actually extend EmberObject.
/**
  @class Controller
  @extends EmberObject
  @public
*/
class Controller<T = unknown> extends FrameworkObject.extend({
  concatenatedProperties: ['queryParams'],
}) {
  /**
   This property is updated to various different callback functions depending on
   the current "state" of the backing route. It is used by
   `Controller.prototype._qpChanged`.

   The methods backing each state can be found in the `Route.prototype._qp` computed
   property return value (the `.states` property). The current values are listed here for
   the sanity of future travelers:

   * `inactive` - This state is used when this controller instance is not part of the active
     route hierarchy. Set in `Route.prototype._reset` (a `router.js` microlib hook) and
     `Route.prototype.actions.finalizeQueryParamChange`.
   * `active` - This state is used when this controller instance is part of the active
     route hierarchy. Set in `Route.prototype.actions.finalizeQueryParamChange`.
   * `allowOverrides` - This state is used in `Route.prototype.setup` (`route.js` microlib hook).

    @method _qpDelegate
    @private
  */
  /** @internal */
  declare _qpDelegate: unknown; // Set by route

  /* ducktype as a controller */
  isController = true;

  declare namespace: unknown;

  /**
   The object to which actions from the view should be sent.

   For example, when a Handlebars template uses the `{{action}}` helper,
   it will attempt to send the action to the view's controller's `target`.

   By default, the value of the target property is set to the router, and
   is injected when a controller is instantiated. This injection is applied
   as part of the application's initialization process. In most cases the
   `target` property will automatically be set to the logical consumer of
   actions for the controller.

   @property target
   @default null
   @public
   */
  declare target: unknown;

  init(properties: object | undefined) {
    super.init(properties);
    let owner = getOwner(this);
    if (owner) {
      this.namespace = owner.lookup('application:main');
      this.target = owner.lookup('router:main');
    }
  }

  declare [MODEL]: T;

  @computed
  get model() {
    return this[MODEL]!;
  }

  set model(value: T) {
    this[MODEL] = value;
  }

  /**
   Defines which query parameters the controller accepts.
   If you give the names `['category','page']` it will bind
   the values of these query parameters to the variables
   `this.category` and `this.page`.

   By default, query parameters are parsed as strings. This
   may cause unexpected behavior if a query parameter is used with `toggleProperty`,
   because the initial value set for `param=false` will be the string `"false"`, which is truthy.

   To avoid this, you may specify that the query parameter should be parsed as a boolean
   by using the following verbose form with a `type` property:
   ```javascript
     queryParams: [{
       category: {
         type: 'boolean'
       }
     }]
   ```
   Available values for the `type` parameter are `'boolean'`, `'number'`, `'array'`, and `'string'`.
   If query param type is not specified, it will default to `'string'`.

   @for Ember.Controller
   @property queryParams
   @public
   */
  declare queryParams: Readonly<Array<ControllerQueryParam>>;

  /**
   During `Route#setup` observers are created to invoke this method
   when any of the query params declared in `Controller#queryParams` property
   are changed.

   When invoked this method uses the currently active query param update delegate
   (see `Controller.prototype._qpDelegate` for details) and invokes it with
   the QP key/value being changed.

    @method _qpChanged
    @private
  */
  _qpChanged(controller: any, _prop: string) {
    let dotIndex = _prop.indexOf('.[]');
    let prop = dotIndex === -1 ? _prop : _prop.slice(0, dotIndex);

    let delegate = controller._qpDelegate;
    let value = get(controller, prop);
    delegate(prop, value);
  }

  /**
   Transition the application into another route. The route may
   be either a single route or route path:

   ```javascript
   aController.transitionToRoute('blogPosts');
   aController.transitionToRoute('blogPosts.recentEntries');
   ```

   Optionally supply a model for the route in question. The model
   will be serialized into the URL using the `serialize` hook of
   the route:

   ```javascript
   aController.transitionToRoute('blogPost', aPost);
   ```

   If a literal is passed (such as a number or a string), it will
   be treated as an identifier instead. In this case, the `model`
   hook of the route will be triggered:

   ```javascript
   aController.transitionToRoute('blogPost', 1);
   ```

   Multiple models will be applied last to first recursively up the
   route tree.

   ```app/router.js
   Router.map(function() {
     this.route('blogPost', { path: ':blogPostId' }, function() {
       this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
     });
   });
   ```

   ```javascript
   aController.transitionToRoute('blogComment', aPost, aComment);
   aController.transitionToRoute('blogComment', 1, 13);
   ```

   It is also possible to pass a URL (a string that starts with a
   `/`).

   ```javascript
   aController.transitionToRoute('/');
   aController.transitionToRoute('/blog/post/1/comment/13');
   aController.transitionToRoute('/blog/posts?sort=title');
   ```

   An options hash with a `queryParams` property may be provided as
   the final argument to add query parameters to the destination URL.

   ```javascript
   aController.transitionToRoute('blogPost', 1, {
     queryParams: { showComments: 'true' }
   });

   // if you just want to transition the query parameters without changing the route
   aController.transitionToRoute({ queryParams: { sort: 'date' } });
   ```

   See also [replaceRoute](/ember/release/classes/Ember.Controller/methods/replaceRoute?anchor=replaceRoute).

   @for Ember.Controller
   @method transitionToRoute
   @deprecated Use transitionTo from the Router service instead.
   @param {String} [name] the name of the route or a URL
   @param {...Object} models the model(s) or identifier(s) to be used
     while transitioning to the route.
   @param {Object} [options] optional hash with a queryParams property
     containing a mapping of query parameters
   @return {Transition} the transition object associated with this
     attempted transition
   @public
   */
  declare transitionToRoute: (...args: RouteArgs) => Transition;

  /**
   Transition into another route while replacing the current URL, if possible.
   This will replace the current history entry instead of adding a new one.
   Beside that, it is identical to `transitionToRoute` in all other respects.

   ```javascript
   aController.replaceRoute('blogPosts');
   aController.replaceRoute('blogPosts.recentEntries');
   ```

   Optionally supply a model for the route in question. The model
   will be serialized into the URL using the `serialize` hook of
   the route:

   ```javascript
   aController.replaceRoute('blogPost', aPost);
   ```

   If a literal is passed (such as a number or a string), it will
   be treated as an identifier instead. In this case, the `model`
   hook of the route will be triggered:

   ```javascript
   aController.replaceRoute('blogPost', 1);
   ```

   Multiple models will be applied last to first recursively up the
   route tree.

   ```app/router.js
   Router.map(function() {
     this.route('blogPost', { path: ':blogPostId' }, function() {
       this.route('blogComment', { path: ':blogCommentId', resetNamespace: true });
     });
   });
   ```

   ```
   aController.replaceRoute('blogComment', aPost, aComment);
   aController.replaceRoute('blogComment', 1, 13);
   ```

   It is also possible to pass a URL (a string that starts with a
   `/`).

   ```javascript
   aController.replaceRoute('/');
   aController.replaceRoute('/blog/post/1/comment/13');
   ```

   @for Ember.Controller
   @method replaceRoute
   @deprecated Use replaceWith from the Router service instead.
   @param {String} [name] the name of the route or a URL
   @param {...Object} models the model(s) or identifier(s) to be used
   while transitioning to the route.
   @param {Object} [options] optional hash with a queryParams property
   containing a mapping of query parameters
   @return {Transition} the transition object associated with this
     attempted transition
   @public
   */
  declare replaceRoute: (...args: RouteArgs) => Transition;
}

/**
  Creates a property that lazily looks up another controller in the container.
  Can only be used when defining another controller.

  Example:

  ```app/controllers/post.js
  import Controller, {
    inject as controller
  } from '@ember/controller';

  export default class PostController extends Controller {
    @controller posts;
  }
  ```

  Classic Class Example:

  ```app/controllers/post.js
  import Controller, {
    inject as controller
  } from '@ember/controller';

  export default Controller.extend({
    posts: controller()
  });
  ```

  This example will create a `posts` property on the `post` controller that
  looks up the `posts` controller in the container, making it easy to reference
  other controllers.

  @method inject
  @static
  @for @ember/controller
  @since 1.10.0
  @param {String} name (optional) name of the controller to inject, defaults to
         the property's name
  @return {ComputedDecorator} injection decorator instance
  @public
*/
export function inject(name: string): PropertyDecorator;
export function inject(...args: [ElementDescriptor[0], ElementDescriptor[1]]): void;
export function inject(...args: ElementDescriptor): DecoratorPropertyDescriptor;
export function inject(): PropertyDecorator;
export function inject(
  ...args: [] | [name: string] | ElementDescriptor
): PropertyDecorator | DecoratorPropertyDescriptor | void {
  return metalInject('controller', ...args);
}

export default Controller;

/**
  A type registry for Ember `Controller`s. Meant to be declaration-merged so string
  lookups resolve to the correct type.

  Blueprints should include such a declaration merge for TypeScript:

  ```ts
  import Controller from '@ember/controller';

  export default class ExampleController extends Controller {
  // ...
  }

  declare module '@ember/controller' {
    export interface Registry {
      example: ExampleController;
    }
  }
  ```

  Then `@inject` can check that the service is registered correctly, and APIs
  like `owner.lookup('controller:example')` can return `ExampleController`.
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Registry extends Record<string, Controller | undefined> {}
