import { FrameworkObject, setFrameworkClass } from '@ember/-internals/runtime';
import { inject as metalInject } from '@ember/-internals/metal';
import ControllerMixin from './lib/controller_mixin';

/**
@module @ember/controller
*/

/**
  @class Controller
  @extends EmberObject
  @uses Ember.ControllerMixin
  @public
*/
const Controller = FrameworkObject.extend(ControllerMixin);

setFrameworkClass(Controller);

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
export function inject() {
  return metalInject('controller', ...arguments);
}

export default Controller;
