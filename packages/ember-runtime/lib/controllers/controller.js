import { assert } from 'ember-debug';
import EmberObject from '../system/object';
import Mixin from '../mixins/controller';
import { createInjectionHelper } from '../inject';
import { deprecateUnderscoreActions } from '../mixins/action_handler';

/**
@module @ember/controller
*/

/**
  @class Controller
  @extends EmberObject
  @uses Ember.ControllerMixin
  @public
*/
const Controller = EmberObject.extend(Mixin);

deprecateUnderscoreActions(Controller);

function controllerInjectionHelper(factory) {
  assert(
    'Defining an injected controller property on a ' +
    'non-controller is not allowed.',
    Mixin.detect(factory.PrototypeMixin)
  );
}

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
  reference other controllers. This is functionally equivalent to:

  ```app/controllers/post.js
  import Controller from '@ember/controller';
  import { alias } from '@ember/object/computed';

  export default Controller.extend({
    needs: 'posts',
    posts: alias('controllers.posts')
  });
  ```

  @method inject
  @static
  @for @ember/controller
  @since 1.10.0
  @param {String} name (optional) name of the controller to inject, defaults
         to the property's name
  @return {Ember.InjectedProperty} injection descriptor instance
  @public
*/
createInjectionHelper('controller', controllerInjectionHelper);

export default Controller;
