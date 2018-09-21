import { Object as EmberObject } from '@ember/-internals/runtime';
import ControllerMixin from './lib/controller_mixin';
import { InjectedProperty } from '@ember/-internals/metal';

/**
@module @ember/controller
*/

/**
  @class Controller
  @extends EmberObject
  @uses Ember.ControllerMixin
  @public
*/
const Controller = EmberObject.extend(ControllerMixin);

/**
  Creates a property that lazily looks up another controller in the container.
  Can only be used when defining another controller.

  Example:

  ```app/controllers/post.js
  import Controller, {
    inject as controller
  } from '@ember/controller';

  export default Controller.extend({
    posts: controller()
  });
  ```

  This example will create a `posts` property on the `post` controller that
  looks up the `posts` controller in the container, making it easy to
  reference other controllers.

  @method inject
  @static
  @for @ember/controller
  @since 1.10.0
  @param {String} name (optional) name of the controller to inject, defaults
         to the property's name
  @return {Ember.InjectedProperty} injection descriptor instance
  @public
*/
export function inject(name, options) {
  return new InjectedProperty('controller', name, options);
}

export default Controller;
