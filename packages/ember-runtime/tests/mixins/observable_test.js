// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('mixins/observable');

test('should be able to use getProperties to get a POJO of provided keys', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  var pojo = obj.getProperties("firstName", "lastName");
  equals("Steve", pojo.firstName);
  equals("Jobs", pojo.lastName);
});

test('should be able to use setProperties to set multiple properties at once', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });

  obj.setProperties({firstName: "Tim", lastName: "Cook"});
  equals("Tim", obj.get("firstName"));
  equals("Cook", obj.get("lastName"));
});

testBoth('calling setProperties completes safely despite exceptions', function(get,set) {
  var exc = new Error("Something unexpected happened!");
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: Ember.computed(function(key, value) {
      if (value !== undefined) {
        throw exc;
      }
      return "Apple, Inc."
    })
  });

  var firstNameChangedCount = 0;

  Ember.addObserver(obj, 'firstName', function() { firstNameChangedCount++; });

  try {
    obj.setProperties({
      firstName: 'Tim',
      lastName: 'Cook',
      companyName: 'Fruit Co., Inc.'
    });
  } catch(err) {
    if (err != exc)
      throw err;
  }

  equals(firstNameChangedCount, 1, 'firstName should have fired once');
});
