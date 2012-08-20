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
      var ap = Ember.ArrayProxy.create({ content: Ember.A(pets) });
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

    @type Ember.Array
  */
  content: null,

  /**
   The array that the proxy pretends to be. In the default `ArrayProxy`
   implementation, this and `content` are the same. Subclasses of `ArrayProxy`
   can override this property to provide things like sorting and filtering.
  */
  arrangedContent: Ember.computed('content', function() {
    return get(this, 'content');
  }).cacheable(),

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
    return get(this, 'arrangedContent').objectAt(idx);
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
    get(this, 'arrangedContent').replace(idx, amt, objects);
  },

  /**
    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.
  */
  _contentWillChange: Ember.beforeObserver(function() {
    this._teardownContent();
  }, 'content'),

  _teardownContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.removeArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  contentArrayWillChange: Ember.K,
  contentArrayDidChange: Ember.K,

  /**
    Invoked when the content property changes.  Notifies observers that the
    entire array content has changed.
  */
  _contentDidChange: Ember.observer(function() {
    var content = get(this, 'content');

    Ember.assert("Can't set ArrayProxy's content to itself", content !== this);

    this._setupContent();
  }, 'content'),

  _setupContent: function() {
    var content = get(this, 'content');

    if (content) {
      content.addArrayObserver(this, {
        willChange: 'contentArrayWillChange',
        didChange: 'contentArrayDidChange'
      });
    }
  },

  _arrangedContentWillChange: Ember.beforeObserver(function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    this.arrangedContentArrayWillChange(this, 0, len, undefined);
    this.arrangedContentWillChange(this);

    this._teardownArrangedContent(arrangedContent);
  }, 'arrangedContent'),

  _arrangedContentDidChange: Ember.observer(function() {
    var arrangedContent = get(this, 'arrangedContent'),
        len = arrangedContent ? get(arrangedContent, 'length') : 0;

    Ember.assert("Can't set ArrayProxy's content to itself", arrangedContent !== this);

    this._setupArrangedContent();

    this.arrangedContentDidChange(this);
    this.arrangedContentArrayDidChange(this, 0, undefined, len);
  }, 'arrangedContent'),

  _setupArrangedContent: function() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      arrangedContent.addArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  _teardownArrangedContent: function() {
    var arrangedContent = get(this, 'arrangedContent');

    if (arrangedContent) {
      arrangedContent.removeArrayObserver(this, {
        willChange: 'arrangedContentArrayWillChange',
        didChange: 'arrangedContentArrayDidChange'
      });
    }
  },

  arrangedContentWillChange: Ember.K,
  arrangedContentDidChange: Ember.K,

  /** @private (nodoc) */
  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  /** @private (nodoc) */
  length: Ember.computed(function() {
    var arrangedContent = get(this, 'arrangedContent');
    return arrangedContent ? get(arrangedContent, 'length') : 0;
    // No dependencies since Enumerable notifies length of change
  }).property().cacheable(),

  /** @private (nodoc) */
  replace: function(idx, amt, objects) {
    if (get(this, 'content')) this.replaceContent(idx, amt, objects);
    return this;
  },

  /** @private (nodoc) */
  arrangedContentArrayWillChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentWillChange(idx, removedCnt, addedCnt);
  },

  /** @private (nodoc) */
  arrangedContentArrayDidChange: function(item, idx, removedCnt, addedCnt) {
    this.arrayContentDidChange(idx, removedCnt, addedCnt);
  },

  /** @private (nodoc) */
  init: function() {
    this._super();
    this._setupContent();
    this._setupArrangedContent();
  },

  willDestroy: function() {
    this._teardownArrangedContent();
    this._teardownContent();
  }
});

