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
  Ember.MutableArray, forwarding all requests.  ArrayProxy isn't useful by itself
  but you can extend it to do specialized things like transforming values,
  etc.

  @extends Ember.Object
  @extends Ember.Array
  @extends Ember.MutableArray
*/
Ember.ArrayProxy = Ember.Object.extend(Ember.MutableArray,
/** @scope Ember.ArrayProxy.prototype */ {

  /**
    The content array.  Must be an object that implements Ember.Array and or
    Ember.MutableArray.

    @property {Ember.Array}
  */
  content: null,
  
  /**
    The model class to which incoming items should be type cast.  Must be an object that implements Ember.Object.

    @property {Ember.Object}
  */
  model: null,

  /**
    Should actually retrieve the object at the specified index from the
    content.  You can override this method in subclasses to transform the
    content item to something new.

    This method will only be called if content is non-null.

    @param {Number} idx
      The index to retreive.

    @returns {Object} the value or undefined if none found
  */
  objectAtContent: function(idx) {
    return get(this, 'content').objectAt(idx);
  },
  
  pushObject: function(obj) {      
    if (this.get('model') && obj.__proto__.constructor !== this.get('model')) {
      obj = this.get('model').create(obj); 
    } else {
      console.log("either the model isn't defined, or this obj is already the right type");
    }
    return this._super(obj);
  },

  pushObjects: function(objs) {
    if (this.get('model')) {
      objs = this._typecastArray(objs)
    }
    return this._super(typecasted);
  },

  set: function(prop, val) {
    if (prop === 'content' && this.get('model')) {
      val = this._typecastArray(val);
    }
    return this._super(prop, val);
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
    if (this.get('model')) {
      objects = this._typecastArray(objects)
    }
    get(this, 'content').replace(idx, amt, objects);
  },

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
  _typecastArray: function(objs) {
    var typecasted = [];
    objs.forEach(function(obj){
      if (obj.__proto__.constructor !== this.get('model')) {
        obj = this.get('model').create(obj);
      } 
      typecasted.push(obj);
    }, this);        
    return typecasted;
  },
  
  /** @private (nodoc) */
  objectAt: function(idx) {
    return get(this, 'content') && this.objectAtContent(idx);
  },

  /** @private (nodoc) */
  length: Ember.computed(function() {
    var content = get(this, 'content');
    return content ? get(content, 'length') : 0;
  }).property('content.length').cacheable(),

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

  init: function() {
    this._super();
    this.contentDidChange();
  }

});



