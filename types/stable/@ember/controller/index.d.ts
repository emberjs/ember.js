declare module '@ember/controller' {
  import { FrameworkObject } from '@ember/object/-internals';
  import type { DecoratorPropertyDescriptor, ElementDescriptor } from '@ember/-internals/metal';
  import Mixin from '@ember/object/mixin';
  import type { RouteArgs } from '@ember/routing/-internals';
  import { ActionHandler } from '@ember/-internals/runtime';
  import type { Transition } from 'router_js';
  export type ControllerQueryParamType = 'boolean' | 'number' | 'array' | 'string';
  export type ControllerQueryParam =
    | string
    | Record<
        string,
        {
          type: ControllerQueryParamType;
        }
      >
    | Record<string, string>;
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
  const ControllerMixin: Mixin;
  /**
      @class Controller
      @extends EmberObject
      @uses Ember.ControllerMixin
      @public
    */
  interface Controller<T = unknown> extends FrameworkObject, ControllerMixin<T> {}
  const Controller_base: Readonly<typeof import('@ember/object').default> &
    (new (
      owner?: import('@ember/-internals/owner').default | undefined
    ) => import('@ember/object').default) &
    Mixin;
  class Controller<T = unknown> extends Controller_base {}
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
  export { Controller as default, ControllerMixin };
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
  export interface Registry extends Record<string, Controller | undefined> {}
}
