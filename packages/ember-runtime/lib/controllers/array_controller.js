/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import {
  forEach,
  replace
} from 'ember-metal/enumerable_utils';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import SortableMixin from 'ember-runtime/mixins/sortable';
import ControllerMixin from 'ember-runtime/mixins/controller';
import { computed } from 'ember-metal/computed';
import EmberError from 'ember-metal/error';
import EmberArray from 'ember-runtime/mixins/array';


/**
  `Ember.ArrayController` provides a way for you to publish a collection of
  objects so that you can easily bind to the collection from a Handlebars
  `#each` helper, an `Ember.CollectionView`, or other controllers.

  The advantage of using an `ArrayController` is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `model` property on the controller.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an `Ember.ArrayController` and set its `model` property:

  ```javascript
  MyApp.listController = Ember.ArrayController.create();

  $.get('people.json', function(data) {
    MyApp.listController.set('model', data);
  });
  ```

  Then, create a view that binds to your new controller:

  ```handlebars
  {{#each person in MyApp.listController}}
    {{person.firstName}} {{person.lastName}}
  {{/each}}
  ```

  Although you are binding to the controller, the behavior of this controller
  is to pass through any methods or properties to the underlying array. This
  capability comes from `Ember.ArrayProxy`, which this class inherits from.

  Sometimes you want to display computed properties within the body of an
  `#each` helper that depend on the underlying items in `model`, but are not
  present on those items.   To do this, set `itemController` to the name of a
  controller (probably an `ObjectController`) that will wrap each individual item.

  For example:

  ```handlebars
  {{#each post in controller}}
    <li>{{post.title}} ({{post.titleLength}} characters)</li>
  {{/each}}
  ```

  ```javascript
  App.PostsController = Ember.ArrayController.extend({
    itemController: 'post'
  });

  App.PostController = Ember.ObjectController.extend({
    // the `title` property will be proxied to the underlying post.
    titleLength: function() {
      return this.get('title').length;
    }.property('title')
  });
  ```

  In some cases it is helpful to return a different `itemController` depending
  on the particular item.  Subclasses can do this by overriding
  `lookupItemController`.

  For example:

  ```javascript
  App.MyArrayController = Ember.ArrayController.extend({
    lookupItemController: function( object ) {
      if (object.get('isSpecial')) {
        return "special"; // use App.SpecialController
      } else {
        return "regular"; // use App.RegularController
      }
    }
  });
  ```

  The itemController instances will have a `parentController` property set to
  the `ArrayController` instance.

  @class ArrayController
  @namespace Ember
  @extends Ember.ArrayProxy
  @uses Ember.SortableMixin
  @uses Ember.ControllerMixin
  @public
*/

export default ArrayProxy.extend(ControllerMixin, SortableMixin, {

  /**
    A string containing the controller name used to wrap items.

    For example:

    ```javascript
    App.MyArrayController = Ember.ArrayController.extend({
      itemController: 'myItem' // use App.MyItemController
    });
    ```

    @property itemController
    @type String
    @default null
    @private
  */
  itemController: null,

  /**
    Return the name of the controller to wrap items, or `null` if items should
    be returned directly.  The default implementation simply returns the
    `itemController` property, but subclasses can override this method to return
    different controllers for different objects.

    For example:

    ```javascript
    App.MyArrayController = Ember.ArrayController.extend({
      lookupItemController: function( object ) {
        if (object.get('isSpecial')) {
          return "special"; // use App.SpecialController
        } else {
          return "regular"; // use App.RegularController
        }
      }
    });
    ```

    @method lookupItemController
    @param {Object} object
    @return {String}
    @private
  */
  lookupItemController(object) {
    return get(this, 'itemController');
  },

  objectAtContent(idx) {
    var length = get(this, 'length');
    var arrangedContent = get(this, 'arrangedContent');
    var object = arrangedContent && arrangedContent.objectAt(idx);
    var controllerClass;

    if (idx >= 0 && idx < length) {
      controllerClass = this.lookupItemController(object);

      if (controllerClass) {
        return this.controllerAt(idx, object, controllerClass);
      }
    }

    // When `controllerClass` is falsy, we have not opted in to using item
    // controllers, so return the object directly.

    // When the index is out of range, we want to return the "out of range"
    // value, whatever that might be.  Rather than make assumptions
    // (e.g. guessing `null` or `undefined`) we defer this to `arrangedContent`.
    return object;
  },

  arrangedContentDidChange() {
    this._super(...arguments);
    this._resetSubControllers();
  },

  arrayContentDidChange(idx, removedCnt, addedCnt) {
    var subControllers = this._subControllers;

    if (subControllers.length) {
      var subControllersToRemove = subControllers.slice(idx, idx + removedCnt);

      forEach(subControllersToRemove, function(subController) {
        if (subController) {
          subController.destroy();
        }
      });

      replace(subControllers, idx, removedCnt, new Array(addedCnt));
    }

    // The shadow array of subcontrollers must be updated before we trigger
    // observers, otherwise observers will get the wrong subcontainer when
    // calling `objectAt`
    this._super(idx, removedCnt, addedCnt);
  },

  init() {
    this._super(...arguments);
    this._subControllers = [];
  },

  model: computed({
    get(key) {
      return Ember.A();
    },
    set(key, value) {
      Ember.assert(
        'ArrayController expects `model` to implement the Ember.Array mixin. ' +
        'This can often be fixed by wrapping your model with `Ember.A()`.',
        EmberArray.detect(value) || !value
      );

      return value;
    }
  }),

  /**
    Flag to mark as being "virtual". Used to keep this instance
    from participating in the parentController hierarchy.

    @private
    @property _isVirtual
    @type Boolean
  */
  _isVirtual: false,

  controllerAt(idx, object, controllerClass) {
    var container = get(this, 'container');
    var subControllers = this._subControllers;
    var fullName, subController, parentController;

    if (subControllers.length > idx) {
      subController = subControllers[idx];

      if (subController) {
        return subController;
      }
    }

    if (this._isVirtual) {
      parentController = get(this, 'parentController');
    } else {
      parentController = this;
    }

    fullName = 'controller:' + controllerClass;

    if (!container._registry.has(fullName)) {
      throw new EmberError('Could not resolve itemController: "' + controllerClass + '"');
    }

    subController = container.lookupFactory(fullName).create({
      target: parentController,
      parentController: parentController,
      model: object
    });

    subControllers[idx] = subController;

    return subController;
  },

  _subControllers: null,

  _resetSubControllers() {
    var controller;
    var subControllers = this._subControllers;

    if (subControllers.length) {
      for (var i = 0, length = subControllers.length; length > i; i++) {
        controller = subControllers[i];

        if (controller) {
          controller.destroy();
        }
      }

      subControllers.length = 0;
    }
  },

  willDestroy() {
    this._resetSubControllers();
    this._super(...arguments);
  }
});
