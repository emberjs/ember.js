import { assert } from 'ember-metal/debug';
import EmberObject from 'ember-runtime/system/object';
import Mixin from 'ember-runtime/mixins/controller';
import { createInjectionHelper } from 'ember-runtime/inject';
import { deprecateUnderscoreActions } from 'ember-runtime/mixins/action_handler';

/**
@module ember
@submodule ember-runtime
*/

/**
  @class Controller
  @namespace Ember
  @extends Ember.Object
  @uses Ember.ControllerMixin
  @public
*/
var Controller = EmberObject.extend(Mixin);

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

  ```javascript
  App.PostController = Ember.Controller.extend({
    posts: Ember.inject.controller()
  });
  ```

  This example will create a `posts` property on the `post` controller that
  looks up the `posts` controller in the container, making it easy to
  reference other controllers. This is functionally equivalent to:

  ```javascript
  App.PostController = Ember.Controller.extend({
    needs: 'posts',
    posts: Ember.computed.alias('controllers.posts')
  });
  ```

  @method controller
  @since 1.10.0
  @for Ember.inject
  @param {String} name (optional) name of the controller to inject, defaults
         to the property's name
  @return {Ember.InjectedProperty} injection descriptor instance
  @public
*/
createInjectionHelper('controller', controllerInjectionHelper);

export default Controller;
