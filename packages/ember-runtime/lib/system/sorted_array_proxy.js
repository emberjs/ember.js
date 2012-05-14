
// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-runtime/system/array_proxy');

var get = Ember.get, set = Ember.set;

/**
 @class

   An Ember.SortedArrayProxy wraps Ember.ArrayProxy to keep the 'content' array sorted
 as Ember.Object items are added and removed.

   In order for the sorting to succeed, each added item must implement
 the method 'sortValue', which returns a computed property
 of the item's value to sort on.

   Since this collection is continually sorted as items are
 added and deleted,
 invoking modifying methods other than 'add' and 'remove' will, at best, corrupt the order of
 the array's items and, at worst, drop some and/or double items up.

   On the other hand, you can safely remove everything from the collection using the method 'purge'.

 A simple example of usage:

     // Define an Ember.Object to be put into the sorted array:
     var Pet = Ember.Object.extend({
       name: null,
       description: null,

       // Sort on the pet's name case-insensitive.  Note how this
       // method is implemented as a computed property.
       sortValue: Ember.computed(function() {
         return this.get('name').toUpperCase();
       }).property('name')
     });

     // Create the sorted array:
     var sortedPets = Ember.sortedPetsProxy.create();

     // Add some pets to it.
     sortedPets.add(Pet.create({
       name: 'Dog',
       description: 'furry friendly'
     }));
     sortedPets.add(Pet.create({
       name: 'cat',
       description: 'furry aloof'
     }));
     sortedPets.add(Pet.create({
       name: 'fish',
       description: 'scaly wet'
     }));

     // Examine how they're sorted:
     var actualArrayResult = sortedPets.map(function(item, index, self) {
       return item.get('name');
     }); // => ['cat', 'Dog', 'fish'];

     // Remove the cat:
     var cat = sortedPets.objectAtContent(0);
     sortedPets.remove(cat);

     // See what's left:
     actualArrayResult = sortedPets.map(function(item, index, self) {
       return item.get('name');
     }); // => ['Dog', 'fish'];

     // Clear all contents:
     sortedPets.purge(); // => []; DON'T USE clear()

 @extends Ember.ArrayProxy
 @extends Ember.Object
 @extends Ember.Array
 @extends Ember.MutableArray
 */
Ember.SortedArrayProxy = Ember.ArrayProxy.extend(
/** @scope Ember.SortedArrayProxy.prototype */ {

  /**
   * Adds a new item to the list and ensures it is
   * sorted correctly.
   *
   * @param {Ember.Object} item the item to insert.  The item's class must implement 'sortValue' as a computed property.
   */
  add: function(item) {
    var length, idx;

    length = this.get('length');
    idx = this.binarySearch(item.get('sortValue'), 0, length);

    this.insertAt(idx, item);

    // If the value by which we've sorted the item
    // changes, we need to re-insert it at the correct
    // location in the list.
    item.addObserver('sortValue', this, 'itemSortValueDidChange');
  },

  /**
   * Removes an item from the list
   * 
   * @param {Ember.Object} item the item to remove
   */
  remove: function(item) {
    this.removeObject(item);
    item.removeObserver('sortValue', this, 'itemSortValueDidChange');
  },

  /**
   * Clears the contents in place so you can reuse the content if desired.
   */
  purge: function() {
    // Implementation note: this is called 'purge' instead of 'clear'
    // since MutableArray will remove values in a non-sorted order
    // which will crash.
    for (var offset = this.get('length') - 1 ; offset >= 0 ; offset--) {
      var lastItem = this.get('content')[offset];
      this.remove(lastItem);
    }
  },

  /**
   * @private
   *
   * Binary search implementation that finds the index
   * where a item should be inserted.
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
   * @private
   *
   * Adjusts the sorting caused by a sort value change in an item.
   *
   * @param item suspect item has changed sort value
   */
  itemSortValueDidChange: function(item) {
    this.remove(item);
    this.add(item);
  },

    /**
     * @private
     *
     * Checks to see if the 'content' array has been created.  If not,
     * creates it with an empty Ember.array.
     */
    init: function() {
      this._super();
      if (this.get('content') === null) {
        this.set('content', Ember.A([]));
      }
    }

  });

