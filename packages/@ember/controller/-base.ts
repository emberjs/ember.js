import { getOwner } from '@ember/-internals/owner'; // This is imported from -internals to avoid circularity
import { get } from '@ember/-internals/metal/lib/property_get';
import { notifyPropertyChange } from '@ember/-internals/metal/lib/property_events';
import { tagForProperty } from '@ember/-internals/metal/lib/tags';
import { COMPUTED_SETTERS } from '@ember/-internals/metal/lib/decorator';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { assert } from '@ember/debug';
import { FrameworkObject } from '@ember/object/-internals';
import metalInject from '@ember/-internals/metal/lib/injected_property';
import type {
  DecoratorPropertyDescriptor,
  ElementDescriptor,
} from '@ember/-internals/metal/lib/decorator';
import type { RouteArgs } from '@ember/routing/-internals';
import type ActionHandler from '@ember/-internals/runtime/lib/mixins/action_handler';
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

/**
  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
  @private
*/
interface ControllerMixin<T> extends ActionHandler {
  /** @internal */
  _qpDelegate: unknown | null;

  isController: true;

  /**
    The object to which actions from the view should be sent.

    For example, when a template uses the `{{action}}` helper,
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
  target: unknown | null;

  /**
    The controller's current model. When retrieving or modifying a controller's
    model, this property should be used instead of the `content` property.

    @property model
    @public
  */
  model: T;

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

    @for Ember.ControllerMixin
    @property queryParams
    @public
  */
  queryParams: Readonly<Array<ControllerQueryParam>>;

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

    See also [replaceRoute](/ember/release/classes/Ember.ControllerMixin/methods/replaceRoute?anchor=replaceRoute).

    @for Ember.ControllerMixin
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
  transitionToRoute(...args: RouteArgs): Transition;

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

    @for Ember.ControllerMixin
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
  replaceRoute(...args: RouteArgs): Transition;
}
// The classic `ControllerMixin` value lives in `index.ts`; only its
// interface (used for Controller's type) is defined here.

// NOTE: This doesn't actually extend EmberObject.
/**
  @class Controller
  @extends EmberObject
  @uses Ember.ControllerMixin
  @public
*/
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Controller<_T = unknown> extends ControllerMixin<_T> {}
class Controller<_T = unknown> extends FrameworkObject {
  declare namespace: unknown;
  declare [MODEL]: _T;

  init(properties: object | undefined) {
    super.init(properties);
    let owner = getOwner(this);
    if (owner) {
      this.namespace = owner.lookup('application:main');
      this.target = owner.lookup('router:main');
    }
  }

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

  send(actionName: string, ...args: unknown[]) {
    assert(
      `Attempted to call .send() with the action '${actionName}' on the destroyed object '${this}'.`,
      !this.isDestroying && !this.isDestroyed
    );
    if (this.actions && this.actions[actionName]) {
      let shouldBubble = this.actions[actionName].apply(this, args) === true;
      if (!shouldBubble) {
        return;
      }
    }

    let target = get(this, 'target') as { send?: (...args: unknown[]) => void } | undefined;
    if (target) {
      assert(
        `The \`target\` for ${this} (${target}) does not have a \`send\` method`,
        typeof target.send === 'function'
      );
      target.send(actionName, ...args);
    }
  }
}

// Defaults are assigned to the prototype (rather than declared as instance
// fields) so they can be overridden both by native subclassing and by classic
// `.extend()`. `mergedProperties`/`concatenatedProperties` reproduce what the
// ActionHandler and Controller mixins contributed.
Object.assign(Controller.prototype, {
  isController: true,
  concatenatedProperties: ['queryParams'],
  mergedProperties: ['actions'],
  target: null,
  store: null,
  queryParams: null,
  _qpDelegate: null,
});

// `model` is an accessor at runtime, but is defined here with defineProperty
// (rather than as a class-body accessor) so the published types keep it as a
// plain property — the `ControllerMixin` interface merge provides the type,
// and subclasses may redeclare or initialize it as a field without hitting
// TS2610 ("overridden as an instance property").
Object.defineProperty(Controller.prototype, 'model', {
  configurable: true,
  enumerable: false,
  get(this: Controller) {
    consumeTag(tagForProperty(this, 'model'));
    return this[MODEL];
  },
  set(this: Controller, value: unknown) {
    // Skip notification when the value is unchanged (e.g. {{mount}}
    // re-setting the same model on rerender), like a ComputedProperty
    // setter whose result matches the cached value.
    if (this[MODEL] === value) {
      return;
    }
    this[MODEL] = value;
    notifyPropertyChange(this, 'model');
  },
});

// Register the `model` accessor's setter the same way `@tracked` registers
// its setters, so metal's `set` takes the fast path (plain assignment into
// the accessor) instead of the DEBUG mandatory-setter path. The latter reads
// the property before writing, and that read would consume the tag mid-set —
// tripping the backtracking-rerender assertion on legitimate mid-render
// writes like {{mount}}'s model update.
COMPUTED_SETTERS.add(Object.getOwnPropertyDescriptor(Controller.prototype, 'model')!.set!);

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

export { Controller as default, Controller };
export type { ControllerMixin };
