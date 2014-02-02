// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test MyApp */

(function() {

  var store, Person, Male, Female, colin, maggie;

  module("Polymorphic SC.Record - Simple", {
    setup: function() {
      SC.RunLoop.begin();

      store = SC.Store.create();

      Person = SC.Record.extend();
      Person.isPolymorphic = YES;

      Male = Person.extend({
        isMale: YES
      });

      Female = Person.extend({
        isFemale: YES
      });

      colin = store.createRecord(Male, {
        guid: '1'
      });

      maggie = store.createRecord(Female, {
        guid: '2'
      });
    },

    teardown: function() {
      store = Person = Male = Female = colin = maggie = null;
      SC.RunLoop.end();
    }
  });

  test("Adding isPolymorphic to extend() hash applies it to record class", function() {
    var Test = SC.Record.extend({
      isPolymorphic: YES
    });
    var test = store.createRecord(Test, {});

    ok(Test.isPolymorphic, "Record class should have gotten passed isPolymorphic value");
    ok(test.isPolymorphic === null || test.isPolymorphic === undefined, "Created record instance should not have isPolymorphic property");
  });

  test("SC.Store#find works with abstract record type", function() {
    var person1 = store.find(Person, '1'),
        person2 = store.find(Person, '2');

    equals(person1, colin, "find on Person record type with guid 1 should return male record");
    ok(SC.kindOf(person1, Male) && person1.isMale, "returned record should be of type Male");

    equals(person2, maggie, "find on Person record type with guid 2 should return female record");
    ok(SC.kindOf(person2, Female) && person2.isFemale, "returned record should be of type Female");
  });

  test("Creating a record of a different concrete type with the same id errors", function() {
    expect(1);

    try {
      store.createRecord(Female, {
        guid: '1'
      });
    } catch (e) {
      ok(true, "Error occurred when trying to create type with same guid");
    }
  });

  test("Changing the 'id' updates the storeKeys for all types of the same record", function () {
    var person1 = store.find(Person, '1'),
      person2 = store.find(Person, '2');

    equals(person1, colin, "find on Person record type with guid 1 should return male record");
    colin.set('id', 'x');
    person1 = store.find(Person, '1');

    ok(person1 !== colin, "find on Person record type with guid 1 should not work anymore");

    person1 = store.find(Person, 'x');
    equals(person1, colin, "find on Person record type with guid x should return male record");
  });
})();
