
// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/system/array_proxy');

var get = Ember.get, set = Ember.set;

/**
 @class

   A SortedArrayProxy wraps any other object that implements Ember.ArrayProxy,
 providing a method to add an item which is inserted in the offset into the
 array to keep the array sorted.  Like the ArrayProxy, his makes it very useful for
 a number of binding use cases or other cases where being able to swap
 out the underlying array is useful.

 In order for the sorting to succeed, the individual items must implement
 the method 'sortValue', which returns a property or calculated property
 of the item's value to sort on.

 A simple example of usage:

 App.Pet = Ember.Object.extend({
 name: null,
 description: null

 sortValue: function() {
 return this.get('name');
 }.property('name')
 });

 var sortedArrayProxy = Ember.SortedArrayProxy.create({});
 sortedArray.add(App.Pet.create({
 name: 'dog',
 description: 'furry friendly'
 });
 sortedArray.add(App.Pet.create({
 name: 'cat',
 description: 'furry aloof'
 });
 sortedArray.add(App.Pet.create({
 name: 'fish',
 description: 'scaly wet'
 });

 sortedArray.map(function(item, index, self) {
 return item.get('name');
 }); => ['cat', 'dog', 'fish'];

 @extends Ember.ArrayProxy
 @extends Ember.Object
 @extends Ember.Array
 @extends Ember.MutableArray
 */
Ember.SortedArrayProxy = Ember.ArrayProxy.extend(
/** @scope Ember.SortedArrayProxy.prototype */ {

  /**
   The content array.  Must be an object that implements Ember.Array and/or
   Ember.MutableArray.

   @property {Ember.Array}
   */
  content: null,


  /**
   * Adds a new contact to the list and ensures it is
   * sorted correctly.
   *
   * @param item the item to insert.  item class must implement sortValue
   */
  add: function(item) {
    var length = this.get('length'), idx;

    idx = this.binarySearch(item.get('sortValue'), 0, length);

    this.insertAt(idx, item);

    // If the value by which we've sorted the item
    // changes, we need to re-insert it at the correct
    // location in the list.
    item.addObserver('sortValue', this, 'itemSortValueDidChange');
  },

  /**
   * @private
   *
   * Binary search implementation that finds the index
   * where a contact should be inserted.
   */
  binarySearch: function(value, low, high) {
    var mid, midValue;

    if (low === high) {
      return low;
    }

    mid = low + Math.floor((high - low) / 2);
    midValue = this.objectAt(mid).get('sortValue');

    if (value > midValue) {
      return this.binarySearch(value, mid+1, high);
    } else if (value < midValue) {
      return this.binarySearch(value, low, mid);
    }

    return mid;
  },

  /**
   *
   * @param item
   */
  remove: function(item) {
    this.removeObject(item);
    item.removeObserver('sortValue', this, 'itemSortValueDidChange');
  },

  /**
   * @private
   *
   * Adjusts the sorting caused by a sort value change in an item.
   *
   * @param item suspect item has changed sort value
   */
  itemSortValueDidChange: function(item) {
    this.remove(item);
    this.add(item);
  }

});

