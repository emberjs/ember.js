import Ember from "ember-metal/core"; // Ember.assert
import EmberObject from 'ember-runtime/system/object';
import Mixin from 'ember-runtime/mixins/controller';
import { createInjectionHelper } from 'ember-runtime/inject';

/**
@module ember
@submodule ember-runtime
*/

/**
  @class Controller
  @namespace Ember
  @extends Ember.Object
  @uses Ember.ControllerMixin
*/
var Controller = EmberObject.extend(Mixin);

function controllerInjectionHelper(factory) {
  Ember.assert("Defining an injected controller property on a " +
               "non-controller is not allowed.", Controller.detect(factory));
}

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
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

    @method inject.controller
    @for Ember
    @param {String} name (optional) name of the controller to inject, defaults
           to the property's name
    @return {Ember.InjectedProperty} injection descriptor instance
    */
  createInjectionHelper('controller', controllerInjectionHelper);
}

export default Controller;
