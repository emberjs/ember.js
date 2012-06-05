// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/system/array_proxy');
require('ember-runtime/controllers/controller');

/**
  @class

  Ember.ArrayController provides a way for you to publish a collection of objects
  so that you can easily bind to the collection from a Handlebars #each helper,
  an Ember.CollectionView, or other controllers.

  The advantage of using an ArrayController is that you only have to set up
  your view bindings once; to change what's displayed, simply swap out the
  `content` property on the controller.

  For example, imagine you wanted to display a list of items fetched via an XHR
  request. Create an Ember.ArrayController and set its `content` property:

      MyApp.listController = Ember.ArrayController.create();

      $.get('people.json', function(data) {
        MyApp.listController.set('content', data);
      });

  Then, create a view that binds to your new controller:

      {{#each MyApp.listController}}
        {{firstName}} {{lastName}}
      {{/each}}

  Although you are binding to the controller, the behavior of this controller
  is to pass through any methods or properties to the underlying array. This
  capability comes from `Ember.ArrayProxy`, which this class inherits from.

  Note: As of this writing, `ArrayController` does not add any functionality
  to its superclass, `ArrayProxy`. The Ember team plans to add additional
  controller-specific functionality in the future, e.g. single or multiple
  selection support. If you are creating something that is conceptually a
  controller, use this class.

  @extends Ember.ArrayProxy
*/

var get = Ember.get, set = Ember.set;

Ember.ArrayController = Ember.ArrayProxy.extend(Ember.ControllerMixin, {
  arrangedContent: Ember.computed('content', 'orderBy', function(key, value) {
    var content = get(this, 'content'),
        orderBy = get(this, 'orderBy');

    if (orderBy) {
      content = content.slice();
      content.sort(function(a, b) {
        var aValue, bValue;

        aValue = a ? get(a, orderBy) : undefined;
        bValue = b ? get(b, orderBy) : undefined;

        if (aValue < bValue) { return -1; }
        if (aValue > bValue) { return 1; }

        return 0;
      });

      return Ember.A(content);
    }

    return content;
  }).cacheable(),

  contentArrayWillChange: function(array, idx, removedCount, addedCount) {
    var orderBy = get(this, 'orderBy');

    if (orderBy) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);

      removedObjects.forEach(function(item) {
        arrangedContent.removeObject(item);
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange: function(array, idx, removedCount, addedCount) {
    var orderBy = get(this, 'orderBy');

    if (orderBy) {
      var addedObjects = array.slice(idx, idx+addedCount);
      var arrangedContent = get(this, 'arrangedContent');
      var length = arrangedContent.get('length');

      addedObjects.forEach(function(object) {
        idx = this._binarySearch(get(object, orderBy), orderBy, 0, length);
        arrangedContent.insertAt(idx, object);
        object.addObserver(orderBy, this, 'contentItemOrderByDidChange');
        length++;
        this.arrayContentDidChange(idx, 0, 1);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  _binarySearch: function(value, orderBy, low, high) {
    var mid, midValue;

    if (low === high) {
      return low;
    }

    mid = low + Math.floor((high - low) / 2);
    midValue = get(this.objectAt(mid), orderBy);

    if (value > midValue) {
      return this._binarySearch(value, orderBy, mid+1, high);
    } else if (value < midValue) {
      return this._binarySearch(value, orderBy, low, mid);
    }

    return mid;
  }
});
