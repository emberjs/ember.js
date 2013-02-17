require('ember-runtime/system/array_proxy');
require('ember-runtime/controllers/controller');
require('ember-runtime/mixins/sortable');

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, isGlobalPath = Ember.isGlobalPath,
    forEach = Ember.EnumerableUtils.forEach, replace = Ember.EnumerableUtils.replace;

/**
  `Ember.ArrayController` provides a way for you to publish a collection of
  objects so that you can easily bind to the collection from a Handlebars
  `#each` helper, an `Ember.CollectionView`, or other controllers.

  The advantage of using an `ArrayController` is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `content` property on the controller.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an `Ember.ArrayController` and set its `content` property:

  ```javascript
  MyApp.listController = Ember.ArrayController.create();

  $.get('people.json', function(data) {
    MyApp.listController.set('content', data);
  });
  ```

  Then, create a view that binds to your new controller:

  ```handlebars
  {{#each MyApp.listController}}
    {{firstName}} {{lastName}}
  {{/each}}
  ```

  Although you are binding to the controller, the behavior of this controller
  is to pass through any methods or properties to the underlying array. This
  capability comes from `Ember.ArrayProxy`, which this class inherits from.

  Sometimes you want to display computed properties within the body of an
  `#each` helper that depend on the underlying items in `content`, but are not
  present on those items.   To do this, set `itemController` to the name of a
  controller (probably an `ObjectController`) that will wrap each individual item.

  For example:

  ```handlebars
    {{#each post in controller}}
      <li>{{title}} ({{titleLength}} characters)</li>
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

  @class ArrayController
  @namespace Ember
  @extends Ember.ArrayProxy
  @uses Ember.SortableMixin
  @uses Ember.ControllerMixin
*/

Ember.ArrayController = Ember.ArrayProxy.extend(Ember.ControllerMixin,
  Ember.SortableMixin, {

  /**
    The controller used to wrap items, if any.

    @property itemController
    @type String
    @default null
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

    @method
    @type String
    @default null
  */
  lookupItemController: function(object) {
    return get(this, 'itemController');
  },

  objectAtContent: function(idx) {
    var length = get(this, 'length'),
        object = get(this,'arrangedContent').objectAt(idx);

    if (idx >= 0 && idx < length) {
      var controllerClass = this.lookupItemController(object);
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

  arrangedContentDidChange: function() {
    this._super();
    this._resetSubControllers();
  },

  arrayContentDidChange: function(idx, removedCnt, addedCnt) {
    var subControllers = get(this, '_subControllers'),
        subControllersToRemove = subControllers.slice(idx, idx+removedCnt);

    forEach(subControllersToRemove, function(subController) {
      if (subController) { subController.destroy(); }
    });

    replace(subControllers, idx, removedCnt, new Array(addedCnt));

    // The shadow array of subcontrollers must be updated before we trigger
    // observers, otherwise observers will get the wrong subcontainer when
    // calling `objectAt`
    this._super(idx, removedCnt, addedCnt);
  },

  init: function() {
    this._super();
    if (!this.get('content')) { Ember.defineProperty(this, 'content', undefined, Ember.A()); }
    this.set('_subControllers', Ember.A());
  },

  controllerAt: function(idx, object, controllerClass) {
    var container = get(this, 'container'),
        subControllers = get(this, '_subControllers'),
        subController = subControllers[idx];

    if (!subController) {
      subController = container.lookup("controller:" + controllerClass, { singleton: false });
      subControllers[idx] = subController;
    }

    if (!subController) {
      throw new Error('Could not resolve itemController: "' + controllerClass + '"');
    }

    subController.set('target', this);
    subController.set('content', object);

    return subController;
  },

  _subControllers: null,

  _resetSubControllers: function() {
    var subControllers = get(this, '_subControllers');

    forEach(subControllers, function(subController) {
      if (subControllers) { subController.destroy(); }
    });

    this.set('_subControllers', Ember.A());
  }
});
