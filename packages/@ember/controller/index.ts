import { FrameworkObject } from '@ember/-internals/runtime';
import { inject as metalInject } from '@ember/-internals/metal';
import ControllerMixin from './lib/controller_mixin';
import { DecoratorPropertyDescriptor, ElementDescriptor } from '@ember/-internals/metal';

/**
@module @ember/controller
*/

// NOTE: This doesn't actually extend EmberObject.
/**
  @class Controller
  @extends EmberObject
  @uses Ember.ControllerMixin
  @public
*/
interface Controller<T = unknown> extends FrameworkObject, ControllerMixin<T> {}
class Controller<T = unknown> extends FrameworkObject.extend(ControllerMixin) {}

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
