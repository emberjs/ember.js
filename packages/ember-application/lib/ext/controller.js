/**
@module ember
@submodule ember-application
*/

import Ember from "ember-metal/core"; // Ember.assert
import { get } from "ember-metal/property_get";
import EmberError from "ember-metal/error";
import { inspect } from "ember-metal/utils";
import { computed } from "ember-metal/computed";
import ControllerMixin from "ember-runtime/mixins/controller";
import { meta } from "ember-metal/utils";
import controllerFor from "ember-routing/system/controller_for";

function verifyNeedsDependencies(controller, container, needs) {
  var dependency, i, l;
  var missing = [];

  for (i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];

    Ember.assert(inspect(controller) + "#needs must not specify dependencies with periods in their names (" +
                 dependency + ")", dependency.indexOf('.') === -1);

    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    // Structure assert to still do verification but not string concat in production
    if (!container._registry.has(dependency)) {
      missing.push(dependency);
    }
  }
  if (missing.length) {
    throw new EmberError(inspect(controller) + " needs [ " + missing.join(', ') +
                         " ] but " + (missing.length > 1 ? 'they' : 'it') + " could not be found");
  }
}

var defaultControllersComputedProperty = computed(function() {
  var controller = this;

  return {
    needs: get(controller, 'needs'),
    container: get(controller, 'container'),
    unknownProperty: function(controllerName) {
      var needs = this.needs;
      var dependency, i, l;

      for (i=0, l=needs.length; i<l; i++) {
        dependency = needs[i];
        if (dependency === controllerName) {
          return this.container.lookup('controller:' + controllerName);
        }
      }

      var errorMessage = inspect(controller) + '#needs does not include `' +
                         controllerName + '`. To access the ' +
                         controllerName + ' controller from ' +
                         inspect(controller) + ', ' +
                         inspect(controller) +
                         ' should have a `needs` property that is an array of the controllers it has access to.';
      throw new ReferenceError(errorMessage);
    },
    setUnknownProperty: function (key, value) {
      throw new Error("You cannot overwrite the value of `controllers." + key + "` of " + inspect(controller));
    }
  };
});

/**
  @class ControllerMixin
  @namespace Ember
*/
ControllerMixin.reopen({
  concatenatedProperties: ['needs'],

  /**
    An array of other controller objects available inside
    instances of this controller via the `controllers`
    property:

    For example, when you define a controller:

    ```javascript
    // app/controllers/comments.js

    import Ember from "ember";

    export default Ember.ArrayController.extend({
      needs: ['post']
    });
    ```

    The application's single instance of these other
    controllers are accessible by name through the
    `controllers` property:

    ```javascript
    this.get('controllers.post'); // instance of PostController
    ```

    Given that you have a nested controller (nested resource):

    ```javascript
    // app/controllers/comments/new.js

    import Ember from 'ember';

    export default Ember.ObjectController.extend({
    });
    ```

    When you define a controller that requires access to a nested one:

    ```javascript
    // app/controllers/index.js

    import Ember from 'ember';

    export default Ember.ObjectController.extend({
      needs: ['commentsNew']
    });
    ```

    You will be able to get access to it:

    ```javascript
    this.get('controllers.commentsNew'); // instance of CommentsNewController
    ```

    This is only available for singleton controllers.

    @property {Array} needs
    @default []
  */
  needs: [],

  init: function() {
    var needs = get(this, 'needs');
    var length = get(needs, 'length');

    if (length > 0) {
      Ember.assert(' `' + inspect(this) + ' specifies `needs`, but does ' +
                   "not have a container. Please ensure this controller was " +
                   "instantiated with a container.",
                   this.container || meta(this, false).descs.controllers !== defaultControllersComputedProperty);

      if (this.container) {
        verifyNeedsDependencies(this, this.container, needs);
      }

      // if needs then initialize controllers proxy
      get(this, 'controllers');
    }

    this._super.apply(this, arguments);
  },

  /**
    @method controllerFor
    @see {Ember.Route#controllerFor}
    @deprecated Use `needs` instead
  */
  controllerFor: function(controllerName) {
    Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
    return controllerFor(get(this, 'container'), controllerName);
  },

  /**
    Stores the instances of other controllers available from within
    this controller. Any controller listed by name in the `needs`
    property will be accessible by name through this property.

    ```javascript
    // app/controllers/comments.js

    import Ember from 'ember';

    export default Ember.ArrayController.extend({
      needs: ['post'],
      postTitle: function(){
        var currentPost = this.get('controllers.post'); // instance of PostController
        return currentPost.get('title');
      }.property('controllers.post.title')
    });
    ```

    @see {Ember.ControllerMixin#needs}
    @property {Object} controllers
    @default null
  */
  controllers: defaultControllersComputedProperty
});

export default ControllerMixin;
