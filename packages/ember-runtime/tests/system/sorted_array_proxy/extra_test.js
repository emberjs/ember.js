// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2012 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.SortedArrayProxy', {

  setup: function() {

    // Define an object to be put into the sorted array:
    this.Pet = Ember.Object.extend({
      name: null,
      description: null,

      // Sort on the pet's name case-insensitive:
      sortValue: Ember.computed(function() {
        return this.get('name').toUpperCase();
      }).property('name')
    });

    this.dog = this.Pet.create({
      name: 'Dog',
      description: 'furry friendly'
    });

    this.cat = this.Pet.create({
      name: 'cat',
      description: 'furry aloof'
    });

    this.fish = this.Pet.create({
      name: 'fish',
      description: 'scaly wet'
    });

  }
});

test("Add objects into and remove from the sorted array", function() {

  // Create a sorted array:
  var sortedPets = Ember.SortedArrayProxy.create({content: Ember.A([])});

  // Add some pets to it.
  sortedPets.add(this.dog);
  sortedPets.add(this.cat);
  sortedPets.add(this.fish);

  equal(sortedPets.get('length'), 3);

  // Examine how they're sorted:
  var actualArrayResult = sortedPets.map(function(item, index, self) {
    return item.get('name');
  }); // => ['cat', 'Dog', 'fish'];
  deepEqual(actualArrayResult, ['cat', 'Dog', 'fish'], "should be sorted case-insensitive");

  // Remove the cat:
  sortedPets.remove(this.cat);

  // See what's left:
  actualArrayResult = sortedPets.map(function(item, index, self) {
    return item.get('name');
  }); // => ['Dog', 'fish'];
  deepEqual(actualArrayResult, ['Dog', 'fish'], "should be sorted case-insensitive");
});

test("Can preload sorted items on create", function() {

  var sortedPrimitivePets = Ember.A([this.cat, this.dog, this.fish]);
  var sortedPets = Ember.SortedArrayProxy.create({content: Ember.A(sortedPrimitivePets)});
  var actualArrayResult = sortedPets.map(function(item, index, self) {
    return item.get('name');
  });
  deepEqual(actualArrayResult, ['cat', 'Dog', 'fish'], "should be sorted case-insensitive");

});

test("If no argument is passed during create, then create an empty Ember.Array", function() {
  // Create a sorted array:
  var sortedPets = Ember.SortedArrayProxy.create();

  // Add some pets to it.
  sortedPets.add(this.dog);
  sortedPets.add(this.cat);
  sortedPets.add(this.fish);

  equal(sortedPets.get('length'), 3);

  // Examine how they're sorted:
  var actualArrayResult = sortedPets.map(function(item, index, self) {
    return item.get('name');
  }); // => ['cat', 'Dog', 'fish'];
  deepEqual(actualArrayResult, ['cat', 'Dog', 'fish'], "should be sorted case-insensitive");

});
