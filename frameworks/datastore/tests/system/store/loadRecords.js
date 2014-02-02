// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

(function() {
  var store, people, places, Person, Place;

  module("SC.Store#loadRecords", {
    setup: function() {
      Person = SC.Record.extend({
        first: SC.Record.attr(String, { isRequired: YES}),
        last: SC.Record.attr(String),
        age: SC.Record.attr(Number),
        isAlive: SC.Record.attr(Boolean)
      });

      Place = SC.Record.extend({
        name: SC.Record.attr(String)
      });

      SC.RunLoop.begin();

      store = SC.Store.create();

      people = [ 
        Person.create({ 
          guid: 1,
          first: "John",
          last: "Sproutish",
          age: 35,
          isAlive: YES
        }),
        Person.create({
          guid: 2,
          first: "Sarah",
          last: "Coop",
          age: 28,
          isAlive: YES
        })
      ];

      places = [
        Place.create({
          guid: 3,
          name: "San Francisco"
        }),
        Place.create({
          guid: 4,
          name: "St. John's"
        })
      ];

      SC.RunLoop.end();
    },
    teardown: function() {
      store = people = places = Person = Place = null;
    }
  });

  test("loadRecords with single Record type loads new records in store", function() {
    var storeKeys = store.loadRecords(Person, people),
        isStatusCorrect;

    ok(SC.isArray(storeKeys), "An array of store keys is returned");

    storeKeys.forEach(function(storeKey, index) {
      equals(store.idFor(storeKeys[index]), people[index].get('guid'), "The storeKey resolves to the correct Primary Key for index %@".fmt(index));

      ok(store.peekStatus(storeKey) & SC.Record.READY_CLEAN, "Record is in SC.Record.READY_CLEAN state after loading into store for index %@".fmt(index));
    });
  });

  test("loadRecords with multiple Record types loads new records in store", function() {
    var things = [],
        types = [Person, Person, Place, Place],
        storeKeys, record;

    things.pushObjects(people);
    things.pushObjects(places);

    things.forEach(function(thing, index) {
      ok(SC.kindOf(thing, types[index]), "precond - types array contains correct record type for index %@".fmt(index));
    });

    storeKeys = store.loadRecords(types, things);

    ok(SC.isArray(storeKeys), "An array of store keys is returned");

    storeKeys.forEach(function(storeKey, index) {
      record = store.materializeRecord(storeKey);
      
      equals(store.idFor(storeKeys[index]), things[index].get('guid'), "The storeKey resolves to the correct Primary Key for index %@".fmt(index));
      ok(SC.kindOf(record, types[index]), "store returns a record of the correct type for index %@".fmt(index));
      ok(store.peekStatus(storeKey) & SC.Record.READY_CLEAN, "Record is in SC.Record.READY_CLEAN state after loading into store for index %@".fmt(index));
    });
  });
})();
