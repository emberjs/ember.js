require('ember-runtime/system/array_proxy');
require('ember-runtime/controllers/controller');
require('ember-runtime/mixins/sortable');

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, isGlobalPath = Ember.isGlobalPath,
    forEach = Ember.EnumerableUtils.forEach;

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

  Note: As of this writing, `ArrayController` does not add any functionality
  to its superclass, `ArrayProxy`. The Ember team plans to add additional
  controller-specific functionality in the future, e.g. single or multiple
  selection support. If you are creating something that is conceptually a
  controller, use this class.

  @class ArrayController
  @namespace Ember
  @extends Ember.ArrayProxy
  @uses Ember.SortableMixin
  @uses Ember.ControllerMixin
*/

Ember.ArrayController = Ember.ArrayProxy.extend(Ember.ControllerMixin,
  Ember.SortableMixin, {

  /**
  */
  objectController: null,

  /**
  */
  objectControllerAt: function(idx, object) {
    var controllerName = get(this, 'objectController');

    if ('string' === typeof controllerName) {
      return this.objectControllerFor(controllerName, object);
    }

    return null;
  },

  /**
  */
  objectControllerFor: function(name, object) {
    Ember.assert("ArrayController can not have null members", object !== null);

    var container = this.containerFor(object),
        controller = container.lookup('controller:'+name);

    set(controller, 'content', object);
    set(controller, 'target', this);

    return controller;
  },

  /**
  */
  containerFor: function(object) {
    var containers = get(this, '_containers'),
        container = containers.get(object);

    if (!container) {
      container = this.container.child();
      containers.set(object, container);
    }

    return container;
  },

  objectAtContent: function(idx) {
    var length = get(this, 'length'),
        object = get(this,'arrangedContent').objectAt(idx),
        controller = idx < length && this.objectControllerAt(idx, object);

    return controller || object;
  },

  arrayContentWillChange: function(idx, removedCount, addedCount) {
    this._super(idx, removedCount, addedCount);

    var removedObjects = this.slice(idx, idx+removedCount),
        containers = get(this, '_containers');

    forEach(removedObjects, function(object) {
      if (Ember.ObjectController.detectInstance(object)) {
        object = get(object, 'content');
        var container = containers.get(object);
        if (container) {
          container.destroy();
          containers.remove(object);
        }
      }
    });
  },

  _containers: Ember.computed(function() {
    return Ember.Map.create();
  })
});
