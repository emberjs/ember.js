// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/mixins/mutable_array');
require('sproutcore-runtime/system/object');


  
var get = SC.get, set = SC.set;

/**
  @class

  An ArrayProxy wraps any other object that implements SC.Array and/or 
  SC.MutableArray, forwarding all requests.  ArrayProxy isn't useful by itself
  but you can extend it to do specialized things like transforming values,
  etc.

  @extends SC.Object
  @extends SC.Array
  @extends SC.MutableArray
*/
SC.ArrayProxy = SC.Object.extend(SC.MutableArray, {
  
  /**
    The content array.  Must be an object that implements SC.Array and or
    SC.MutableArray.
    
    @property {SC.Array}
  */
  content: null,

  /**
    The selected object(s). Can be either an object or an array of objects.
    Used by SC.Select.

    @property {SC.Object|SC.Array}
  */
  selection: null,

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
  
  contentWillChange: SC.beforeObserver(function() {
    var content = get(this, 'content'),
        len     = content ? get(content, 'length') : 0;
    this.arrayWillChange(content, 0, len, undefined);
    if (content) content.removeArrayObserver(this);
  }, 'content'),
  
  /**
    Invoked when the content property changes.  Notifies observers that the
    entire array content has changed.
  */
  contentDidChange: SC.observer(function() {
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
  length: SC.computed(function() {
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
  
  init: function(content) {
    this._super();
    // TODO: Why is init getting called with a parameter? --TD
    if (content) set(this, 'content', content);
    this.contentDidChange();
  }
  
});



