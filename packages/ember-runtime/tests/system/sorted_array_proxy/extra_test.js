// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2012 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.SortedArrayProxy');

test("Add objects into the sorted array", function() {

  // Define an object to be put into the sorted array:
  var Pet = Ember.Object.extend({
    name: null,
    description: null,

    // Sort on the pet's name case-insensitive:
    sortValue: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  // Create a sorted array:
  var sortedArray = Ember.SortedArrayProxy.create({content: Ember.A([])});

  // Add some pets to it.
  sortedArray.add(Pet.create({
    name: 'Dog',
    description: 'furry friendly'
  }));
  sortedArray.add(Pet.create({
    name: 'cat',
    description: 'furry aloof'
  }));
  sortedArray.add(Pet.create({
    name: 'fish',
    description: 'scaly wet'
  }));

  equal(sortedArray.get('length'), 3);

  // Examine how they're sorted:
  var actualArrayResult = sortedArray.map(function(item, index, self) {
    return item.get('name');
  }); // => ['cat', 'Dog', 'fish'];
  deepEqual(actualArrayResult, ['cat', 'Dog', 'fish'], "should be sorted case-insensitive");

  // Remove the cat:
  var cat = sortedArray.objectAtContent(0);
  sortedArray.remove(cat);

  // See what's left:
  actualArrayResult = sortedArray.map(function(item, index, self) {
    return item.get('name');
  }); // => ['Dog', 'fish'];
});
