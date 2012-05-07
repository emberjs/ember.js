// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/mixins/mutable_array');
require('ember-runtime/system/object');



var get = Ember.get, set = Ember.set;

/**
  @class

  An ArrayProxy wraps any other object that implements Ember.Array and/or
  Ember.MutableArray, forwarding all requests. This makes it very useful for
  a number of binding use cases or other cases where being able to swap
  out the underlying array is useful.

  A simple example of usage:

      var pets = ['dog', 'cat', 'fish'];
      var arrayProxy = Ember.ArrayProxy.create({ content: Ember.A(pets) });
      ap.get('firstObject'); // => 'dog'
      ap.set('content', ['amoeba', 'paramecium']);
      ap.get('firstObject'); // => 'amoeba'

  This class can also be useful as a layer to transform the contents of
  an array, as they are accessed. This can be done by overriding
  `objectAtContent`:

      var pets = ['dog', 'cat', 'fish'];
      var ap = Ember.ArrayProxy.create({
          content: Ember.A(pets),
          objectAtContent: function(idx) {
              return this.get('content').objectAt(idx).toUpperCase();
          }
      });
      ap.get('firstObject'); // => 'DOG'


  @extends Ember.Object
  @extends Ember.Array
  @extends Ember.MutableArray
*/
Ember.ArrayProxy = Ember.Object.extend(Ember.MutableArray,
/** @scope Ember.ArrayProxy.prototype */ {

  /**
    The content array.  Must be an object that implements Ember.Array and/or
    Ember.MutableArray.

    @property {Ember.Array}
  */
  content: null,

  /**
    Should actually retrieve the object at the specified index from the
    content. You can override this method in subclasses to transform the
    content item to something new.

    This method will only be called if content is non-null.

    @param {Number} idx
      The index to retrieve.

    @returns {Object} the value or undefined if none found
  */
  objectAtContent: function(idx) {
    return get(this, 'content').objectAt(idx);
  },

  /**
    Should actually replace the specified objects on the content array.
    You can override this method in subclasses to transform the content item
    into something new.

    This method will only be called if content is non-null.

    @param {Number} idx
      The starting index

    @param {Number} amt
      The number of items to remove from the content.

    @param {Array} objects
      Optional array of objects to insert or null if no objects.

    @returns {void}
  */
  replaceContent: function(idx, amt, objects) {
    get(this, 'content').replace(idx, amt, objects);
  },

  /**
    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.
  */
  contentWillChange: Ember.beforeObserver(function() {
    var content = get(this, 'content'),
        len     = content ? get(content, 'length') : 0;
    this.arrayWillChange(content, 0, len, undefined);
    if (content) content.removeArrayObserver(this);
  }, 'content'),

  /**
    Invoked when the content property changes.  Notifies observers that the
    entire array content has changed.
  */
  contentDidChange: Ember.observer(function() {
    var content = get(this, 'content'),
        len     = content ? get(content, 'length') : 0;
    if (content) content.addArrayObserver(this);
    this.arrayDidChange(content, 0, undefined, len);
  }, 'content'),

  /** @private (nodoc) */
  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  /** @private (nodoc) */
  length: Ember.computed(function() {
    var content = get(this, 'content');
    return content ? get(content, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }).property().cacheable(),

  /** @private (nodoc) */
  replace: function(idx, amt, objects) {
    if (get(this, 'content')) this.replaceContent(idx, amt, objects);
    return this;
  },

  /** @private (nodoc) */
  arrayWillChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  /** @private (nodoc) */
  arrayDidChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  /** @private (nodoc) */
  init: function() {
    this._super();
    this.contentWillChange();
    this.contentDidChange();
  }

});



